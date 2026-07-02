import { useState, useEffect } from "react";
import type { Geo, GeoState, Weather } from "../types";
import { WEATHERS } from "../data";
import { wmoToWeatherId } from "../lib";
import { resolveGeo } from "../lib/geo";

// Resolves location (precise → IP fallback), then fetches current weather
// from Open-Meteo (free, no API key) and city name from OSM/BigDataCloud.
export function useGeoWeather() {
  const [geo, setGeo] = useState<Geo | null>(null);
  const [weather, setWeather] = useState<Weather>(WEATHERS[0]);
  const [geoState, setGeoState] = useState<GeoState>("idle");

  useEffect(() => {
    setGeoState("loading");

    resolveGeo()
      .then(async ({ lat, lng, city: ipCity, precise }) => {
        setGeo({ lat, lng, city: ipCity });
        setGeoState(precise ? "ok" : "approx");

        try {
          const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&current=temperature_2m,weathercode&timezone=auto`;
          const res = await fetch(url);
          const data = await res.json();
          const temp = Math.round(data.current.temperature_2m);
          const wid = wmoToWeatherId(data.current.weathercode);
          const base = WEATHERS.find((w) => w.id === wid) || WEATHERS[0];
          setWeather({ ...base, temp });
        } catch {
          /* keep default weather */
        }

        // City name: IP provider already gave it for approx mode
        if (!ipCity) {
          try {
            const gr = await fetch(
              `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lng}&localityLanguage=ru`
            );
            const gd = await gr.json();
            const city = gd.city || gd.locality || "";
            if (city) setGeo((g) => (g ? { ...g, city } : g));
          } catch {
            /* ignore reverse-geocode failure */
          }
        }
      })
      .catch((err: Error & { code?: number }) => {
        setGeoState(err.code === 1 ? "denied" : "error");
      });
  }, []);

  return { geo, weather, setWeather, geoState };
}
