import { Capacitor } from "@capacitor/core";

// ─── Platform-aware map links ─────────────────────────────────────────────────
// iOS → Apple Maps, native Android → geo:/navigation intents (OS picks the
// installed maps app), web → Google Maps universal URLs. Google/Apple https
// forms open correctly on any platform, so they double as fallbacks.

export type MapPlatform = "ios" | "android" | "web";

export interface LatLng {
  lat: number;
  lng: number;
}

// Capacitor.getPlatform() returns "web" in any browser, so the geo:/navigation
// schemes below are only ever produced inside the native shells.
export function detectMapPlatform(): MapPlatform {
  const p = Capacitor.getPlatform();
  return p === "ios" || p === "android" ? p : "web";
}

const enc = encodeURIComponent;
const ll = (p: LatLng) => `${p.lat},${p.lng}`;

// Pin a known place. Fallback chain: coords+name → name-only search.
export function placeUrl(
  place: { name: string; lat?: number; lng?: number },
  platform: MapPlatform = detectMapPlatform()
): string {
  const { name, lat, lng } = place;
  if (lat != null && lng != null) {
    const at = ll({ lat, lng });
    switch (platform) {
      case "ios":
        return `https://maps.apple.com/?ll=${at}&q=${enc(name)}`;
      case "android":
        return `geo:${at}?q=${at}(${enc(name)})`;
      default:
        return `https://www.google.com/maps/search/?api=1&query=${enc(at)}`;
    }
  }
  switch (platform) {
    case "ios":
      return `https://maps.apple.com/?q=${enc(name)}`;
    case "android":
      return `geo:0,0?q=${enc(name)}`;
    default:
      return `https://www.google.com/maps/search/?api=1&query=${enc(name)}`;
  }
}

// Category/cuisine search anchored at the user's location when we have one.
export function nearbySearchUrl(
  query: string,
  near: LatLng | null,
  platform: MapPlatform = detectMapPlatform()
): string {
  if (near) {
    const at = ll(near);
    switch (platform) {
      case "ios":
        return `https://maps.apple.com/?q=${enc(query)}&sll=${at}&z=14`;
      case "android":
        return `geo:${at}?q=${enc(query)}`;
      default:
        return `https://www.google.com/maps/search/${enc(query)}/@${at},14z`;
    }
  }
  return placeUrl({ name: query }, platform);
}

// Directions from the user to a point.
export function routeUrl(
  from: LatLng,
  to: LatLng,
  platform: MapPlatform = detectMapPlatform()
): string {
  switch (platform) {
    case "ios":
      return `https://maps.apple.com/?saddr=${ll(from)}&daddr=${ll(to)}`;
    case "android":
      return `google.navigation:q=${ll(to)}`;
    default:
      return `https://www.google.com/maps/dir/?api=1&origin=${enc(ll(from))}&destination=${enc(ll(to))}`;
  }
}
