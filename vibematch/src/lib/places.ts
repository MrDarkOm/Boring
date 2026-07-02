import type { Card, Geo, Place } from "../types";
import { haversine, fmtDist } from "./index";
import { CAT_META } from "../data";

// Real nearby places from OpenStreetMap Overpass API — no backend, no key.
// Cached per rounded coordinate so the deck and the map share one request.

interface OsmElement {
  id: number;
  lat?: number;
  lon?: number;
  center?: { lat: number; lon: number };
  tags?: Record<string, string>;
}

interface PoiKind {
  emoji: string;
  label: string;
  genres: string[];
  desc: string;
}

const KINDS: Record<string, PoiKind> = {
  cafe:           { emoji: "☕", label: "Кофейня",     genres: ["кофе", "уют"],               desc: "Кофе, десерты и место посидеть. Загляни — вдруг это твоё новое любимое место." },
  bar:            { emoji: "🍺", label: "Бар",         genres: ["бары"],                      desc: "Вечер начинается здесь. Проверь атмосферу и что наливают." },
  pub:            { emoji: "🍺", label: "Паб",         genres: ["бары"],                      desc: "Пиво, разговоры и никакой спешки." },
  restaurant:     { emoji: "🍽", label: "Ресторан",    genres: ["еда"],                       desc: "Поесть не дома — уже событие. Посмотри меню и отзывы." },
  fast_food:      { emoji: "🍔", label: "Фастфуд",     genres: ["еда"],                       desc: "Быстро, сытно и рядом." },
  cinema:         { emoji: "🎬", label: "Кинотеатр",   genres: ["уют"],                       desc: "Большой экран решает. Глянь расписание сеансов на сегодня." },
  theatre:        { emoji: "🎭", label: "Театр",       genres: ["уют"],                       desc: "Живая сцена — совсем другие ощущения. Проверь афишу." },
  park:           { emoji: "🌳", label: "Парк",        genres: ["прогулки", "активный отдых"], desc: "Прогулка на свежем воздухе перезагружает лучше любого сериала." },
  fitness_centre: { emoji: "🏋️", label: "Фитнес",      genres: ["спорт"],                     desc: "Тренировка — быстрый способ поднять настроение." },
  sports_centre:  { emoji: "🏟", label: "Спорткомплекс", genres: ["спорт", "активный отдых"],  desc: "Залы, секции и активности — узнай, что тут есть." },
  climbing:       { emoji: "🧗", label: "Скалодром",   genres: ["спорт", "активный отдых"],    desc: "Полазить по стенам — отличная тренировка и адреналин." },
  museum:         { emoji: "🎨", label: "Музей",       genres: ["прогулки", "уют"],            desc: "Выставки рядом с тобой. Час-два — и мозг говорит спасибо." },
  gallery:        { emoji: "🖼", label: "Галерея",     genres: ["прогулки", "уют"],            desc: "Искусство в шаговой доступности." },
  books:          { emoji: "📚", label: "Книжный",     genres: ["литература", "уют"],          desc: "Зайди полистать — из книжных не выходят с пустыми руками." },
  attraction:     { emoji: "✨", label: "Место",       genres: ["прогулки"],                   desc: "Заметная точка рядом — стоит увидеть своими глазами." },
};

function kindOf(tags: Record<string, string>): string | null {
  if (tags.amenity && KINDS[tags.amenity]) return tags.amenity;
  if (tags.leisure && KINDS[tags.leisure]) return tags.leisure;
  if (tags.tourism && KINDS[tags.tourism]) return tags.tourism;
  if (tags.shop === "books") return "books";
  if (tags.sport === "climbing") return "climbing";
  return null;
}

export interface NearbyResult {
  cards: Card[];
  places: Place[];
}

const cache = new Map<string, Promise<NearbyResult>>();

export function fetchNearby(geo: Geo, radius = 2500): Promise<NearbyResult> {
  const key = `${geo.lat.toFixed(3)}:${geo.lng.toFixed(3)}:${radius}`;
  const hit = cache.get(key);
  if (hit) return hit;

  const p = doFetch(geo, radius).catch((e) => {
    cache.delete(key); // allow retry after failure
    throw e;
  });
  cache.set(key, p);
  return p;
}

// Several public Overpass instances — first one that answers with data wins
const ENDPOINTS = [
  "https://maps.mail.ru/osm/tools/overpass/api/interpreter",
  "https://overpass-api.de/api/interpreter",
  "https://overpass.kumi.systems/api/interpreter",
];

async function doFetch(geo: Geo, radius: number): Promise<NearbyResult> {
  const around = `(around:${radius},${geo.lat},${geo.lng})`;
  // node-only query: dramatically faster than nwr and enough for POIs
  const query =
    `[out:json][timeout:10];(` +
    `node["amenity"~"^(cafe|bar|pub|restaurant|cinema|theatre)$"]["name"]${around};` +
    `node["leisure"~"^(park|fitness_centre|sports_centre)$"]["name"]${around};` +
    `node["tourism"~"^(museum|gallery|attraction)$"]["name"]${around};` +
    `node["shop"="books"]["name"]${around};` +
    `);out 80;`;

  let data: { elements: OsmElement[] } | null = null;
  for (const ep of ENDPOINTS) {
    try {
      const res = await fetch(`${ep}?data=${encodeURIComponent(query)}`, {
        signal: AbortSignal.timeout(12000),
      });
      if (!res.ok) continue;
      const json = await res.json();
      if (json.elements?.length) { data = json; break; }
    } catch {
      /* try next endpoint */
    }
  }
  if (!data) throw new Error("all overpass endpoints failed");

  const seen = new Set<string>();
  const pois = (data.elements as OsmElement[])
    .map((el) => {
      const tags = el.tags ?? {};
      const kind = kindOf(tags);
      const lat = el.lat ?? el.center?.lat;
      const lng = el.lon ?? el.center?.lon;
      if (!kind || !tags.name || lat == null || lng == null) return null;
      if (seen.has(tags.name)) return null;
      seen.add(tags.name);
      const distM = haversine(geo.lat, geo.lng, lat, lng);
      return { kind, name: tags.name, lat, lng, distM, tags };
    })
    .filter((x): x is NonNullable<typeof x> => x !== null)
    .sort((a, b) => a.distM - b.distM);

  // Diversify: round-robin across kinds so the deck isn't 14 restaurants in a row
  const byKind = new Map<string, typeof pois>();
  for (const p of pois) {
    const arr = byKind.get(p.kind) ?? [];
    arr.push(p);
    byKind.set(p.kind, arr);
  }
  const diverse: typeof pois = [];
  const kindLists = [...byKind.values()];
  for (let round = 0; diverse.length < 14 && round < 10; round++) {
    for (const list of kindLists) {
      if (list[round]) diverse.push(list[round]);
      if (diverse.length >= 14) break;
    }
  }

  const meta = CAT_META.place;
  const cards: Card[] = diverse.map((p, i) => {
    const k = KINDS[p.kind];
    const hours = p.tags.opening_hours ? "Есть часы работы в карточке" : "Точка из OpenStreetMap";
    return {
      id: 100000 + i, // stable within a session; regenerated per location
      cat: "place",
      emoji: k.emoji,
      catLabel: k.label,
      title: p.name,
      desc: k.desc,
      tag: `${fmtDist(p.distM)} от тебя`,
      hint: hours,
      color: meta.color,
      bg: meta.bg,
      action: "Маршрут в картах",
      genres: k.genres,
      weather: p.kind === "park" ? ["sun", "cloud"] : ["any"],
      lat: p.lat,
      lng: p.lng,
    };
  });

  const places: Place[] = pois.slice(0, 20).map((p, i) => ({
    id: i + 1,
    name: p.name,
    cat: KINDS[p.kind].emoji,
    dist: fmtDist(p.distM),
    rating: 0,
    open: true,
    lat: p.lat,
    lng: p.lng,
    color: meta.color,
    distM: p.distM,
    distLabel: fmtDist(p.distM),
  }));

  return { cards, places };
}
