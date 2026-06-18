// Supabase Edge Function — Overpass/OSM places proxy
// Fetches nearby POIs from OpenStreetMap Overpass API.
// Deploy: supabase functions deploy places

const OVERPASS_URL = "https://overpass-api.de/api/interpreter";

interface OverpassElement {
  type: string;
  id: number;
  lat?: number;
  lon?: number;
  center?: { lat: number; lon: number };
  tags?: Record<string, string>;
}

const CAT_MAP: Record<string, { label: string; emoji: string; color: string; bg: string }> = {
  cafe:        { label: "Кофейня",  emoji: "☕", color: "#059669", bg: "#001810" },
  restaurant:  { label: "Ресторан", emoji: "🍽", color: "#D97706", bg: "#180E00" },
  bar:         { label: "Бар",      emoji: "🍺", color: "#7C3AED", bg: "#130820" },
  cinema:      { label: "Кино",     emoji: "🎬", color: "#7C3AED", bg: "#130820" },
  park:        { label: "Парк",     emoji: "🌳", color: "#059669", bg: "#001810" },
  museum:      { label: "Музей",    emoji: "🏛",  color: "#E11D48", bg: "#1A0208" },
  fitness_centre: { label: "Фитнес", emoji: "🏋", color: "#F59E0B", bg: "#1A1000" },
  theatre:     { label: "Театр",    emoji: "🎭", color: "#E11D48", bg: "#1A0208" },
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, content-type" } });
  }

  const url = new URL(req.url);
  const lat = parseFloat(url.searchParams.get("lat") ?? "55.75");
  const lng = parseFloat(url.searchParams.get("lng") ?? "37.62");
  const radius = parseInt(url.searchParams.get("radius") ?? "2000");

  const amenities = Object.keys(CAT_MAP).join("|");
  const query = `
    [out:json][timeout:15];
    (
      node["amenity"~"${amenities}"](around:${radius},${lat},${lng});
      way["amenity"~"${amenities}"](around:${radius},${lat},${lng});
    );
    out center 20;
  `;

  const res = await fetch(OVERPASS_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: `data=${encodeURIComponent(query)}`,
  });
  const data = await res.json() as { elements?: OverpassElement[] };

  const R = 6371000;
  const elements = (data.elements ?? []).filter((e: OverpassElement) => e.tags?.name);

  const cards = elements.slice(0, 15).map((e: OverpassElement, i: number) => {
    const elat = e.lat ?? e.center?.lat ?? lat;
    const elng = e.lon ?? e.center?.lon ?? lng;
    const amenity = e.tags?.amenity ?? "cafe";
    const meta = CAT_MAP[amenity] ?? CAT_MAP.cafe;

    // haversine inline
    const dLat = ((elat - lat) * Math.PI) / 180;
    const dLng = ((elng - lng) * Math.PI) / 180;
    const a = Math.sin(dLat / 2) ** 2 + Math.cos((lat * Math.PI) / 180) * Math.cos((elat * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
    const distM = Math.round(R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
    const distLabel = distM < 1000 ? `${distM}м` : `${(distM / 1000).toFixed(1)}км`;

    return {
      id: 20000 + i,
      osmId: e.id,
      cat: "place",
      emoji: meta.emoji,
      catLabel: meta.label,
      title: e.tags?.name ?? "Место",
      desc: [e.tags?.["addr:street"], e.tags?.["opening_hours"]].filter(Boolean).join(" · ") || `${meta.label} рядом`,
      tag: `${distLabel} · OpenStreetMap`,
      hint: e.tags?.["opening_hours"] ?? "",
      color: meta.color,
      bg: meta.bg,
      action: "Открыть в картах",
      genres: [amenity, "места"],
      weather: ["any"],
      lat: elat,
      lng: elng,
      distM,
      distLabel,
    };
  }).sort((a, b) => a.distM - b.distM);

  return new Response(JSON.stringify(cards), {
    headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
  });
});
