import { useState, useEffect } from "react";
import type { Geo, GeoState, Weather } from "../types";
import { WEATHERS } from "../data";
import { wmoToWeatherId } from "../lib";

// Requests geolocation, then fetches current weather from Open-Meteo
// (free, no API key) and a city name from Nominatim (OpenStreetMap).
export function useGeoWeather() {
  const [geo, setGeo] = useState<Geo | null>(null);
  const [weather, setWeather] = useState<Weather>(WEATHERS[0]);
  const [geoState, setGeoState] = useState<GeoState>("idle");

  useEffect(() => {
    if (!navigator.geolocation) {
      setGeoState("error");
      return;
    }
    setGeoState("loading");
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude: lat, longitude: lng } = pos.coords;
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

          try {
            const gr = await fetch(
              `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`
            );
            const gd = await gr.json();
            const city =
              gd.address?.city || gd.address?.town || gd.address?.village || "";
            setGeo((g) => (g ? { ...g, city } : g));
          } catch {
            /* ignore reverse-geocode failure */
          }
        } catch {
          /* keep default weather */
        }
      },
      (err) => {
        setGeoState(err.code === 1 ? "denied" : "error");
      },
      { timeout: 8000, maximumAge: 300000 }
    );
  }, []);

  return { geo, weather, setWeather, geoState };
}
