import type { Card, Place, SwipeRecord, UserContext } from "../types";

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

export function placeUrl(p: Place): string {
  return `https://yandex.ru/maps/?pt=${p.lng},${p.lat}&z=16&l=map`;
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
