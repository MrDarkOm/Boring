import type { Card } from "../types";
import { haversine } from "./index";

// ─── Cross-source dedup ───────────────────────────────────────────────────────
// The same real venue can arrive from several sources (static seed, OSM).
// Id-based dedup can't catch that — id spaces never collide by design.
// Key = normalized title; two cards are duplicates when the key matches AND
// they are within 150 m of each other (or either lacks coords but the
// category matches). Real data wins: osm > tmdb > static.

const PRIORITY: Record<string, number> = { osm: 3, tmdb: 2, static: 1 };

export function normalizeTitle(title: string): string {
  return title
    .toLowerCase()
    .replace(/[«»"'’`]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function sameVenue(a: Card, b: Card): boolean {
  if (a.lat != null && a.lng != null && b.lat != null && b.lng != null) {
    return haversine(a.lat, a.lng, b.lat, b.lng) <= 150;
  }
  return a.cat === b.cat;
}

export function dedupeCards(cards: Card[]): Card[] {
  const byKey = new Map<string, Card[]>();
  const result: Card[] = [];

  for (const card of cards) {
    const key = normalizeTitle(card.title);
    const bucket = byKey.get(key) ?? [];
    const dupIdx = bucket.findIndex((existing) => sameVenue(existing, card));

    if (dupIdx === -1) {
      bucket.push(card);
      byKey.set(key, bucket);
      result.push(card);
      continue;
    }

    const existing = bucket[dupIdx];
    const keep =
      (PRIORITY[card.source ?? "static"] ?? 0) > (PRIORITY[existing.source ?? "static"] ?? 0)
        ? card
        : existing;
    if (keep !== existing) {
      bucket[dupIdx] = keep;
      result[result.indexOf(existing)] = keep;
    }
  }

  return result;
}
