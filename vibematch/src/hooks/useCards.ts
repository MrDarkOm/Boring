import { useState, useEffect } from "react";
import type { Card, Geo } from "../types";
import { ALL_CARDS } from "../data";
import { fetchNearby } from "../lib/places";
import { fetchTmdbCards, mergeCards } from "../api/content";

// Deck = static catalog + REAL nearby places (Overpass, client-side, no backend)
// + TMDB trending when a Supabase backend is configured.
export function useCards(geo: Geo | null): { cards: Card[]; loading: boolean } {
  const [cards, setCards] = useState<Card[]>(ALL_CARDS);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const fetches: Promise<Card[]>[] = [];

    if (geo) {
      fetches.push(fetchNearby(geo).then((r) => r.cards).catch(() => []));
    }
    if (import.meta.env.VITE_SUPABASE_URL) {
      fetches.push(fetchTmdbCards("trending").then((r) => r as Card[]).catch(() => []));
    }
    if (!fetches.length) return;

    setLoading(true);
    Promise.all(fetches)
      .then((results) => {
        if (cancelled) return;
        let merged = ALL_CARDS;
        for (const extra of results) merged = mergeCards(merged, extra);
        setCards(merged);
      })
      .finally(() => { if (!cancelled) setLoading(false); });

    return () => { cancelled = true; };
  }, [geo?.lat, geo?.lng]); // eslint-disable-line react-hooks/exhaustive-deps

  return { cards, loading };
}
