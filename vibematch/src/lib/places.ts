import type { Card, Geo, Place } from "../types";
import { haversine, fmtDist } from "./index";
import { CAT_META } from "../data";
import { t, type TKey } from "../i18n";

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
  genres: string[]; // feature slugs
}

const KINDS: Record<string, PoiKind> = {
  cafe:           { emoji: "☕", genres: ["coffee", "cozy"] },
  bar:            { emoji: "🍺", genres: ["bars"] },
  pub:            { emoji: "🍺", genres: ["bars"] },
  restaurant:     { emoji: "🍽", genres: ["food"] },
  fast_food:      { emoji: "🍔", genres: ["food"] },
  cinema:         { emoji: "🎬", genres: ["cozy", "cinema"] },
  theatre:        { emoji: "🎭", genres: ["cozy", "theatre"] },
  park:           { emoji: "🌳", genres: ["walks", "outdoor"] },
  fitness_centre: { emoji: "🏋️", genres: ["sport"] },
  sports_centre:  { emoji: "🏟", genres: ["sport", "outdoor"] },
  climbing:       { emoji: "🧗", genres: ["sport", "outdoor"] },
  museum:         { emoji: "🎨", genres: ["walks", "cozy"] },
  gallery:        { emoji: "🖼", genres: ["walks", "cozy"] },
  books:          { emoji: "📚", genres: ["literature", "cozy"] },
  attraction:     { emoji: "✨", genres: ["walks"] },
};

const kindLabel = (kind: string) => t(`poi.${kind}` as TKey);
const kindDesc = (kind: string) => t(`poi.${kind}.desc` as TKey);

function addressOf(tags: Record<string, string>): string | undefined {
  const street = tags["addr:street"];
  if (!street) return undefined;
  const num = tags["addr:housenumber"];
  return num ? `${street}, ${num}` : street;
}

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
      return { kind, name: tags.name, lat, lng, distM, tags, osmId: el.id };
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
  const cards: Card[] = diverse.map((p) => {
    const k = KINDS[p.kind];
    return {
      // stable across sessions: derived from the OSM node id, not the sort order
      // (session-unstable ids used to corrupt saved/history references)
      id: 100_000_000_000 + p.osmId,
      cat: "place",
      emoji: k.emoji,
      catLabel: kindLabel(p.kind),
      title: p.name,
      desc: kindDesc(p.kind),
      tag: t("poi.tag.away", { dist: fmtDist(p.distM) }),
      hint: p.tags.opening_hours ? t("poi.hint.hours") : t("poi.hint.osm"),
      color: meta.color,
      bg: meta.bg,
      action: t("poi.action.route"),
      genres: k.genres,
      weather: p.kind === "park" ? ["sun", "cloud"] : ["any"],
      lat: p.lat,
      lng: p.lng,
      source: "osm",
      osmId: p.osmId,
      address: addressOf(p.tags),
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
