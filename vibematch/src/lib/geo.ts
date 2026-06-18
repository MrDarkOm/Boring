// Геолокация: Capacitor на нативе, navigator.geolocation в браузере
interface GeoResult {
  lat: number;
  lng: number;
}

export async function getCurrentPosition(): Promise<GeoResult> {
  // Try Capacitor (native) first
  try {
    // Dynamic import — tree-shaken when Capacitor is absent
    const { Geolocation } = await import("@capacitor/geolocation");
    const pos = await Geolocation.getCurrentPosition({ timeout: 8000, maximumAge: 300000 });
    return { lat: pos.coords.latitude, lng: pos.coords.longitude };
  } catch {
    // Not native or permission denied — fall back to Web API
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) { reject(new Error("no-geo")); return; }
      navigator.geolocation.getCurrentPosition(
        (p) => resolve({ lat: p.coords.latitude, lng: p.coords.longitude }),
        (e) => reject(e),
        { timeout: 8000, maximumAge: 300000 }
      );
    });
  }
}
