import type { Card, SwipeRecord, UserContext } from "../types";
import { LEGACY_GENRE_RU, LEGACY_PEOPLE_RU, LEGACY_TIME_RU } from "../data/slugs";

// ─── Legacy-data normalization ────────────────────────────────────────────────
// Old clients persisted Russian genre/people/time strings (localStorage and
// Supabase jsonb). These helpers map them to stable slugs and pass through
// already-normalized values. They run in the store migration AND on every
// cloud load — old deploys keep writing RU strings, so this stays forever.

export function normalizeGenre(g: string): string {
  return LEGACY_GENRE_RU[g] ?? g;
}

export function normalizeCard(c: Card): Card {
  if (!c) return c;
  const genres = Array.isArray(c.genres) ? c.genres.map(normalizeGenre) : [];
  return { ...c, genres };
}

export function normalizeContext(ctx: UserContext): UserContext {
  if (!ctx) return { mood: null, people: null, time: null, genres: [] };
  return {
    mood: ctx.mood ?? null, // mood ids were always slugs (lazy/active/calm/social)
    people: ctx.people ? (LEGACY_PEOPLE_RU[ctx.people] ?? ctx.people) : null,
    time: ctx.time ? (LEGACY_TIME_RU[ctx.time] ?? ctx.time) : null,
    genres: Array.isArray(ctx.genres) ? ctx.genres.map(normalizeGenre) : [],
  };
}

export function normalizeHistory(h: SwipeRecord[]): SwipeRecord[] {
  if (!Array.isArray(h)) return [];
  return h.map((rec) => ({
    ...rec,
    // legacy records had no id/at; stamp deterministic placeholders
    // (epoch date ⇒ fully decayed by the recommender — intentional fresh start)
    id: rec.id ?? crypto.randomUUID(),
    at: rec.at ?? new Date(0).toISOString(),
    card: normalizeCard(rec.card),
  }));
}
