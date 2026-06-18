import { useState, useEffect } from "react";
import type { Geo, GeoState, Weather } from "../types";
import { WEATHERS } from "../data";
import { wmoToWeatherId } from "../lib";
import { getCurrentPosition } from "../lib/geo";

// Requests geolocation (Capacitor or Web API), then fetches current weather
// from Open-Meteo (free, no API key) and city name from Nominatim (OSM).
export function useGeoWeather() {
  const [geo, setGeo] = useState<Geo | null>(null);
  const [weather, setWeather] = useState<Weather>(WEATHERS[0]);
  const [geoState, setGeoState] = useState<GeoState>("idle");

  useEffect(() => {
    setGeoState("loading");

    getCurrentPosition()
      .then(async ({ lat, lng }) => {
        setGeo({ lat, lng });
        setGeoState("ok");

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

        try {
          const gr = await fetch(
            `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`
          );
          const gd = await gr.json();
          const city = gd.address?.city || gd.address?.town || gd.address?.village || "";
          setGeo((g) => (g ? { ...g, city } : g));
        } catch {
          /* ignore reverse-geocode failure */
        }
      })
      .catch((err: Error & { code?: number }) => {
        setGeoState(err.code === 1 ? "denied" : "error");
      });
  }, []);

  return { geo, weather, setWeather, geoState };
}
