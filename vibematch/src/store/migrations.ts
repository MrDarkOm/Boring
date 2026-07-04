import { normalizeCard, normalizeContext, normalizeHistory } from "../lib/normalize";

// v0/v1 → v2: legacy RU genre/people/time strings become stable slugs;
// swipe records gain id (merge-sync key) and at (recency timestamp).
// Epoch-stamped legacy records decay to ~0 in the recommender — intentional.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function migrateToV2(state: any): any {
  if (!state || typeof state !== "object") return state;
  return {
    ...state,
    context: normalizeContext(state.context),
    swipeHistory: normalizeHistory(state.swipeHistory ?? []),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    saved: Array.isArray(state.saved) ? state.saved.map((c: any) => normalizeCard(c)) : [],
  };
}
