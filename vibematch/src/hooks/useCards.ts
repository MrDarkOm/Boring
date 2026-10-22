import { useState, useEffect, useCallback } from "react";
import type { Card, Geo, SourceName, SourceStatus } from "../types";
import { FALLBACK_CARDS } from "../data";

// Loads real cards from the local server (server/content.mjs) source by source,
// so fast sources (Steam, books) appear before slow ones (Overpass).
// When a source fails, its category falls back to the built-in selection.
const SOURCES: SourceName[] = ["steam", "books", "films", "places"];
const FALLBACK_FOR: Record<SourceName, Card["cat"][]> = {
  steam: ["game"],
  books: ["book"],
  films: ["film"],
  places: [],
};

const initial = (): Record<SourceName, SourceStatus> =>
  Object.fromEntries(SOURCES.map((s) => [s, { state: "loading" }])) as Record<SourceName, SourceStatus>;

async function load(source: SourceName, geo: Geo | null): Promise<{ cards: Card[]; status: SourceStatus }> {
  const q = new URLSearchParams({ only: source });
  if (geo) {
    q.set("lat", geo.lat.toFixed(4));
    q.set("lng", geo.lng.toFixed(4));
  }
  try {
    const res = await fetch(`/api/cards?${q}`);
    if (!res.ok) throw new Error(`сервер ответил ${res.status}`);
    const data = await res.json();
    const st = data.sources?.[source];
    if (st?.ok) return { cards: data.cards || [], status: { state: "ok", count: st.count } };
    const off = /нет /.test(st?.reason || "");
    return { cards: [], status: { state: off ? "off" : "error", reason: st?.reason } };
  } catch (e) {
    return { cards: [], status: { state: "error", reason: "сервер данных не запущен (npm run server)" } };
  }
}

export function useCards(geo: Geo | null, geoReady: boolean) {
  const [bySource, setBySource] = useState<Partial<Record<SourceName, Card[]>>>({});
  const [status, setStatus] = useState(initial);
  const [nonce, setNonce] = useState(0);

  const run = useCallback(
    (sources: SourceName[]) => {
      setStatus((s) => ({ ...s, ...Object.fromEntries(sources.map((n) => [n, { state: "loading" }])) }));
      for (const name of sources) {
        load(name, geo).then(({ cards, status: st }) => {
          setBySource((b) => ({ ...b, [name]: cards }));
          setStatus((s) => ({ ...s, [name]: st }));
        });
      }
    },
    [geo?.lat, geo?.lng] // eslint-disable-line react-hooks/exhaustive-deps
  );

  // media doesn't depend on location — load right away
  useEffect(() => {
    run(["steam", "books", "films"]);
  }, [nonce]); // eslint-disable-line react-hooks/exhaustive-deps

  // places need coordinates; wait until geolocation settles
  useEffect(() => {
    if (!geoReady) return;
    if (!geo) {
      setStatus((s) => ({ ...s, places: { state: "off", reason: "нет доступа к геолокации" } }));
      return;
    }
    run(["places"]);
  }, [geoReady, geo?.lat, geo?.lng, nonce]); // eslint-disable-line react-hooks/exhaustive-deps

  const cards: Card[] = [];
  for (const name of SOURCES) {
    const real = bySource[name];
    const st = status[name];
    if (real?.length) cards.push(...real);
    else if (st.state !== "loading") cards.push(...FALLBACK_CARDS.filter((c) => FALLBACK_FOR[name].includes(c.cat)));
  }
  const loading = SOURCES.some((n) => status[n].state === "loading");

  return { cards, status, loading, reload: () => setNonce((n) => n + 1) };
}
