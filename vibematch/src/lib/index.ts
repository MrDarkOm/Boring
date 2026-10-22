import type { Card, SwipeRecord, UserContext, Weather } from "../types";

export const F = "Inter, system-ui, sans-serif";

// ─── WMO weather code → our weather id ───────────────────────────────────────
export function wmoToWeatherId(code: number): string {
  if ([0, 1].includes(code)) return "sun";
  if ([2, 3, 45, 48].includes(code)) return "cloud";
  if (code >= 51 && code <= 67) return "rain";
  if (code >= 71 && code <= 77) return "snow";
  if (code >= 80 && code <= 82) return "rain";
  if ([95, 96, 99].includes(code)) return "storm";
  return "cloud";
}

// ─── Haversine distance in metres ────────────────────────────────────────────
export function haversine(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return Math.round(R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
}

export function fmtDist(m: number): string {
  return m < 1000 ? `${m}м` : `${(m / 1000).toFixed(1)}км`;
}

// ─── AI tip via local proxy (server/proxy.mjs) ───────────────────────────────
// The proxy injects the API key; the browser never sees it.
export async function fetchAiTip(
  history: SwipeRecord[],
  context: UserContext,
  weatherLabel: string
): Promise<string | null> {
  const liked = history.filter((h) => h.dir === "right").map((h) => h.card.title);
  const disliked = history.filter((h) => h.dir === "left").map((h) => h.card.title);
  try {
    const res = await fetch("/api/ai-tip", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ liked, disliked, context, weather: weatherLabel }),
    });
    const data = await res.json();
    return data?.tip || null;
  } catch {
    return null;
  }
}

// ─── Action links ────────────────────────────────────────────────────────────
// Real search/deep links per category, so every "action" button leads somewhere.
export function actionUrl(card: Card): string {
  if (card.url) return card.url;
  const q = encodeURIComponent(card.title.replace(/[«»]/g, "").replace(/\s*[−-]\d+%.*$/, ""));
  switch (card.cat) {
    case "film":
      return `https://www.kinopoisk.ru/index.php?kp_query=${q}`;
    case "game":
      return `https://store.steampowered.com/search/?term=${q}`;
    case "book":
      return `https://www.litres.ru/search/?q=${q}`;
    case "place":
      return card.lat != null && card.lng != null
        ? `https://yandex.ru/maps/?pt=${card.lng},${card.lat}&z=16&l=map`
        : `https://yandex.ru/maps/?text=${q}`;
    case "sale":
    default:
      return `https://yandex.ru/search/?text=${q}`;
  }
}

export function openLink(url: string): void {
  window.open(url, "_blank", "noopener,noreferrer");
}

// Native share sheet where available, clipboard otherwise. Returns a user-facing message.
export async function shareCard(card: Card): Promise<string> {
  const text = `${card.emoji} ${card.title} — ${card.desc} (${card.tag})`;
  const url = actionUrl(card);
  try {
    if (navigator.share) {
      await navigator.share({ title: card.title, text, url });
      return "Отправлено";
    }
    await navigator.clipboard.writeText(`${text}\n${url}`);
    return "Описание и ссылка скопированы в буфер обмена";
  } catch {
    return "Не удалось поделиться — попробуй ещё раз";
  }
}

// ─── Opening hours (OSM format) ──────────────────────────────────────────────
// Understands the common subset: "24/7", "Mo-Fr 10:00-22:00; Sa,Su 11:00-23:00",
// "Su off", ranges past midnight. Returns null when the string is too exotic.
const OSM_DAYS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

function dayMatches(days: string, d: number): boolean {
  return days.split(",").some((part) => {
    const [a, b] = part.split("-");
    const ia = OSM_DAYS.indexOf(a);
    const ib = b ? OSM_DAYS.indexOf(b) : ia;
    if (ia < 0 || ib < 0) return false;
    return ia <= ib ? d >= ia && d <= ib : d >= ia || d <= ib;
  });
}

const toMin = (hm: string) => {
  const [h, m] = hm.split(":").map(Number);
  return h * 60 + m;
};

export function isOpenNow(raw?: string, now = new Date()): boolean | null {
  if (!raw) return null;
  const src = raw.trim();
  if (src === "24/7") return true;
  const today = now.getDay();
  const yesterday = (today + 6) % 7;
  const mins = now.getHours() * 60 + now.getMinutes();
  let open: boolean | null = null;
  let skipped = false;

  for (const rule of src.split(";").map((r) => r.trim()).filter(Boolean)) {
    if (/\b(PH|SH|week|Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\b|"/.test(rule)) {
      skipped = true;
      continue;
    }
    const m = rule.match(/^((?:Mo|Tu|We|Th|Fr|Sa|Su)(?:[-,](?:Mo|Tu|We|Th|Fr|Sa|Su))*)?\s*(.*)$/);
    if (!m) return null;
    const days = m[1] || "Mo-Su";
    const rest = m[2].trim();
    if (rest === "off" || rest === "closed") {
      if (dayMatches(days, today)) open = false;
      continue;
    }
    const ranges = rest.split(",").map((r) => r.trim().match(/^(\d{1,2}:\d{2})-(\d{1,2}:\d{2})\+?$/));
    if (!ranges.length || ranges.some((r) => !r)) return null;
    let ruleOpen = false;
    let applies = false;
    for (const r of ranges as RegExpMatchArray[]) {
      const start = toMin(r[1]);
      const end = toMin(r[2]);
      const overnight = end <= start;
      if (dayMatches(days, today)) {
        applies = true;
        if (overnight ? mins >= start : mins >= start && mins < end) ruleOpen = true;
      }
      if (overnight && dayMatches(days, yesterday) && mins < end) {
        applies = true;
        ruleOpen = true;
      }
    }
    if (applies) open = ruleOpen;
  }
  if (open === null) return skipped ? null : false;
  return open;
}

// ─── Ranking ─────────────────────────────────────────────────────────────────
// Every card gets a score from the onboarding context, weather, time of day,
// distance and what the user has already liked or skipped. Higher is better.
const OUTDOOR = new Set(["park"]);
const BAD_WEATHER = new Set(["rain", "snow", "storm", "fog"]);

// stable per-card jitter so the order doesn't jump between renders
function jitter(id: string): number {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) | 0;
  return ((h >>> 0) % 1000) / 1000;
}

export function scoreCard(card: Card, ctx: UserContext, weather: Weather, history: SwipeRecord[], now = new Date()): number {
  let s = jitter(card.id) * 1.5;
  const kind = card.placeKind;
  const isPlace = card.cat === "place";
  const hour = now.getHours();

  // жанры из онбординга
  const genreHits = card.genres.filter((g) => ctx.genres.includes(g)).length;
  s += Math.min(genreHits, 2) * 2.5;

  // погода
  if (!card.weather.includes("any") && card.weather.includes(weather.id)) s += 1.5;
  if (kind && OUTDOOR.has(kind) && BAD_WEATHER.has(weather.id)) s -= 5;
  if (isPlace && weather.id === "storm") s -= 2;

  // настроение
  const mood = ctx.mood;
  if (mood === "lazy") s += isPlace || card.cat === "sale" ? -2 : 2;
  if (mood === "active") s += kind === "sport" || kind === "park" || kind === "bowling" || kind === "quest" ? 3.5 : isPlace ? 1 : -1;
  if (mood === "calm") s += kind === "cafe" || kind === "park" || kind === "museum" ? 3 : card.cat === "book" || card.cat === "film" ? 1 : kind === "bar" ? -1.5 : 0;
  if (mood === "social") s += kind === "bar" || kind === "restaurant" || kind === "quest" || kind === "bowling" ? 3.5 : isPlace ? 1 : card.cat === "book" ? -2 : 0;

  // сколько людей
  if (ctx.people === "Один") s += card.cat === "book" || card.cat === "game" ? 1 : kind === "quest" || kind === "bowling" ? -2 : 0;
  if (ctx.people === "Компания") s += kind === "quest" || kind === "bar" || kind === "bowling" ? 2 : card.cat === "book" ? -1.5 : 0;

  // сколько времени
  if (ctx.time === "30 мин") s += isPlace && (card.distM ?? 0) > 1200 ? -3 : card.cat === "book" || card.cat === "film" ? -0.5 : 0;
  if (ctx.time === "Весь день") s += kind === "park" || kind === "museum" || card.cat === "game" ? 1 : 0;

  // время суток
  if (hour >= 6 && hour < 12) s += kind === "cafe" || kind === "park" ? 2 : kind === "bar" ? -3 : 0;
  if (hour >= 18 || hour < 2) s += kind === "bar" || kind === "restaurant" || kind === "cinema" ? 1.5 : 0;
  if (hour >= 23 || hour < 6) s += isPlace ? -2 : 1;

  // открыто ли сейчас и как далеко
  if (isPlace) {
    const open = isOpenNow(card.openingHours, now);
    if (open === false) s -= 6;
    if (open === true) s += 1;
    if (card.distM != null) s -= Math.min(card.distM / 1000, 3);
  }

  // обучение на свайпах: категории и жанры, которые нравились, поднимаются
  for (const h of history.slice(-20)) {
    const w = h.dir === "right" ? 0.6 : h.dir === "up" ? 0.4 : -0.35;
    if (h.card.cat === card.cat) s += w;
    if (h.card.placeKind && h.card.placeKind === kind) s += w;
    if (h.card.genres.some((g) => card.genres.includes(g))) s += w * 0.5;
  }
  return s;
}

export function rankCards(cards: Card[], ctx: UserContext, weather: Weather, history: SwipeRecord[]): Card[] {
  const now = new Date();
  const sorted = cards
    .map((c) => ({ c, s: scoreCard(c, ctx, weather, history, now) }))
    .sort((a, b) => b.s - a.s)
    .map((x) => x.c);
  // не больше двух карточек одной категории подряд
  const out: Card[] = [];
  const pool = [...sorted];
  while (pool.length) {
    const n = out.length;
    const same = n >= 2 && out[n - 1].cat === out[n - 2].cat ? out[n - 1].cat : null;
    const i = same ? pool.findIndex((c) => c.cat !== same) : 0;
    out.push(pool.splice(i < 0 ? 0 : i, 1)[0]);
  }
  return out;
}
