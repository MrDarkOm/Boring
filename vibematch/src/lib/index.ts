import type { SwipeRecord, UserContext } from "../types";
import { getLocale } from "../i18n";

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
// Rate limit: max 5 calls per session (stored in sessionStorage).
const AI_RATE_KEY = "vm_ai_calls";
const AI_RATE_LIMIT = 5;

function aiRateLimitExceeded(): boolean {
  const calls = parseInt(sessionStorage.getItem(AI_RATE_KEY) ?? "0", 10);
  return calls >= AI_RATE_LIMIT;
}

function incrementAiCalls() {
  const calls = parseInt(sessionStorage.getItem(AI_RATE_KEY) ?? "0", 10);
  sessionStorage.setItem(AI_RATE_KEY, String(calls + 1));
}

export async function fetchAiTip(
  history: SwipeRecord[],
  context: UserContext,
  weatherLabel: string
): Promise<string | null> {
  if (aiRateLimitExceeded()) return null;
  const liked = history.filter((h) => h.dir === "right").map((h) => h.card.title);
  const disliked = history.filter((h) => h.dir === "left").map((h) => h.card.title);
  try {
    const res = await fetch("/api/ai-tip", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ liked, disliked, context, weather: weatherLabel, locale: getLocale() }),
    });
    const data = await res.json();
    if (data?.tip) incrementAiCalls();
    return data?.tip || null;
  } catch {
    return null;
  }
}
