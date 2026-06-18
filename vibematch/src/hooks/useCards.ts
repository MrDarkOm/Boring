import { useState, useEffect } from "react";
import type { Card, Geo } from "../types";
import { ALL_CARDS } from "../data";
import { fetchTmdbCards, fetchPlacesCards, mergeCards } from "../api/content";

export function useCards(geo: Geo | null): { cards: Card[]; loading: boolean } {
  const [cards, setCards] = useState<Card[]>(ALL_CARDS);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Only fetch remote if Supabase is configured
    if (!import.meta.env.VITE_SUPABASE_URL) return;

    setLoading(true);
    const fetches: Promise<Card[]>[] = [
      fetchTmdbCards("trending").then((r) => r as Card[]),
    ];
    if (geo) {
      fetches.push(fetchPlacesCards(geo).then((r) => r as Card[]));
    }

    Promise.all(fetches)
      .then(([tmdb, places]) => {
        let merged = mergeCards(ALL_CARDS, tmdb ?? []);
        if (places) merged = mergeCards(merged, places ?? []);
        setCards(merged);
      })
      .catch(() => {/* keep static cards */})
      .finally(() => setLoading(false));
  }, [geo?.lat, geo?.lng]); // eslint-disable-line react-hooks/exhaustive-deps

  return { cards, loading };
}
