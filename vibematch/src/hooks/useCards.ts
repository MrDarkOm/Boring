import { useState, useEffect, useMemo } from "react";
import type { Card, Geo } from "../types";
import { getStaticCards } from "../data";
import { useLocale } from "../i18n";
import { fetchNearby } from "../lib/places";
import { fetchTmdbCards } from "../api/content";
import { dedupeCards } from "../lib/dedupe";

// Deck = static geo-independent catalog + REAL nearby places (Overpass,
// client-side, no backend) + TMDB trending when a Supabase backend is configured.
export function useCards(geo: Geo | null): { cards: Card[]; loading: boolean } {
  const locale = useLocale();
  const staticCards = useMemo(() => getStaticCards(locale), [locale]);
  const [remote, setRemote] = useState<Card[]>([]);
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
        setRemote(results.flat());
      })
      .finally(() => { if (!cancelled) setLoading(false); });

    return () => { cancelled = true; };
  }, [geo?.lat, geo?.lng, locale]); // eslint-disable-line react-hooks/exhaustive-deps

  const cards = useMemo(() => dedupeCards([...remote, ...staticCards]), [staticCards, remote]);

  return { cards, loading };
}
