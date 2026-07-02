// Геолокация: Capacitor на нативе → navigator.geolocation в браузере → IP-геолокация.
// IP-fallback критичен: без HTTPS (например, dev-сервер по локальной сети)
// браузер блокирует navigator.geolocation, и раньше приложение молча оставалось без гео.
export interface GeoResult {
  lat: number;
  lng: number;
  city?: string;
  precise: boolean;
}

async function preciseGeo(): Promise<GeoResult> {
  // Try Capacitor (native) first
  try {
    const { Geolocation } = await import("@capacitor/geolocation");
    const pos = await Geolocation.getCurrentPosition({ timeout: 8000, maximumAge: 300000 });
    return { lat: pos.coords.latitude, lng: pos.coords.longitude, precise: true };
  } catch {
    // Not native or denied — fall back to Web API
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) { reject(new Error("no-geo")); return; }
      navigator.geolocation.getCurrentPosition(
        (p) => resolve({ lat: p.coords.latitude, lng: p.coords.longitude, precise: true }),
        (e) => reject(e),
        { timeout: 8000, maximumAge: 300000 }
      );
    });
  }
}

async function ipGeo(): Promise<GeoResult> {
  // Two free CORS-enabled providers, first one that answers wins
  try {
    const r = await fetch("https://ipapi.co/json/", { signal: AbortSignal.timeout(5000) });
    const d = await r.json();
    if (typeof d.latitude === "number") return { lat: d.latitude, lng: d.longitude, city: d.city, precise: false };
  } catch { /* try next */ }
  const r = await fetch("https://ipwho.is/", { signal: AbortSignal.timeout(5000) });
  const d = await r.json();
  if (d.success === false || typeof d.latitude !== "number") throw new Error("ip-geo-failed");
  return { lat: d.latitude, lng: d.longitude, city: d.city, precise: false };
}

// Best-effort location: precise if the user allows it, otherwise approximate by IP.
export async function resolveGeo(): Promise<GeoResult> {
  try {
    return await preciseGeo();
  } catch {
    return await ipGeo(); // throws only if all providers fail
  }
}

// Kept for callers that need strictly precise coordinates
export async function getCurrentPosition(): Promise<{ lat: number; lng: number }> {
  const g = await preciseGeo();
  return { lat: g.lat, lng: g.lng };
}
