import { supabase } from "./supabase";
import type { Card, Geo } from "../types";

// ─── Remote card shape (superset of Card) ────────────────────────────────────
interface RemoteCard extends Card {
  poster?: string | null;
  osmId?: number;
  distM?: number;
  distLabel?: string;
}

// ─── Simple in-memory cache (ttl: 5 min) ─────────────────────────────────────
interface CacheEntry {
  cards: RemoteCard[];
  ts: number;
}
const cache: Record<string, CacheEntry> = {};
const TTL = 5 * 60 * 1000;

function fromCache(key: string): RemoteCard[] | null {
  const entry = cache[key];
  if (!entry || Date.now() - entry.ts > TTL) return null;
  return entry.cards;
}
function toCache(key: string, cards: RemoteCard[]) {
  cache[key] = { cards, ts: Date.now() };
}

// ─── TMDB trending / search ───────────────────────────────────────────────────
export async function fetchTmdbCards(action: "trending" | "search", query?: string): Promise<RemoteCard[]> {
  const key = `tmdb:${action}:${query ?? ""}`;
  const cached = fromCache(key);
  if (cached) return cached;

  try {
    const params = new URLSearchParams({ action });
    if (query) params.set("q", query);
    const { data, error } = await supabase!.functions.invoke("tmdb", { body: undefined, headers: {}, method: "GET" });
    // fallback: call function URL directly if invoke fails
    if (error || !data) {
      const url = `${import.meta.env.VITE_SUPABASE_URL ?? ""}/functions/v1/tmdb?${params}`;
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY ?? ""}` },
      });
      const cards: RemoteCard[] = await res.json();
      toCache(key, cards);
      return cards;
    }
    toCache(key, data as RemoteCard[]);
    return data as RemoteCard[];
  } catch {
    return [];
  }
}

// ─── OSM places ───────────────────────────────────────────────────────────────
export async function fetchPlacesCards(geo: Geo, radius = 2000): Promise<RemoteCard[]> {
  const key = `places:${geo.lat.toFixed(3)}:${geo.lng.toFixed(3)}:${radius}`;
  const cached = fromCache(key);
  if (cached) return cached;

  try {
    const params = new URLSearchParams({
      lat: String(geo.lat),
      lng: String(geo.lng),
      radius: String(radius),
    });
    const url = `${import.meta.env.VITE_SUPABASE_URL ?? ""}/functions/v1/places?${params}`;
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY ?? ""}` },
    });
    const cards: RemoteCard[] = await res.json();
    toCache(key, cards);
    return cards;
  } catch {
    return [];
  }
}

// ─── Merge remote + static cards (dedup by id) ───────────────────────────────
export function mergeCards(staticCards: Card[], remote: RemoteCard[]): Card[] {
  const ids = new Set(staticCards.map((c) => c.id));
  const newCards = remote.filter((c) => !ids.has(c.id));
  return [...staticCards, ...newCards];
}
