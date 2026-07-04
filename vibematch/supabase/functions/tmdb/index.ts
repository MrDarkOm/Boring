// Supabase Edge Function — TMDB proxy
// Keeps TMDB_API_KEY server-side, never reaches the browser.
// Deploy: supabase functions deploy tmdb

const TMDB_BASE = "https://api.themoviedb.org/3";
const TMDB_IMG = "https://image.tmdb.org/t/p/w500";

interface TmdbMovie {
  id: number;
  title: string;
  overview: string;
  poster_path: string | null;
  vote_average: number;
  genre_ids: number[];
  release_date: string;
}

// Stable feature slugs — presentation is resolved client-side via i18n
const GENRE_MAP: Record<number, string> = {
  28: "action", 12: "adventure", 16: "animation", 35: "comedy",
  80: "crime", 99: "documentary", 18: "drama", 10751: "family",
  14: "fantasy", 36: "history", 27: "horror", 10402: "music",
  9648: "mystery", 10749: "romance", 878: "scifi", 53: "thriller",
  10770: "tvmovie", 37: "western",
};

const LANGS: Record<string, string> = { ru: "ru-RU", en: "en-US" };

Deno.serve(async (req: Request) => {
  // CORS
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, content-type" } });
  }

  const apiKey = Deno.env.get("TMDB_API_KEY");
  if (!apiKey) return new Response("TMDB_API_KEY not configured", { status: 500 });

  const url = new URL(req.url);
  const action = url.searchParams.get("action") ?? "trending";
  const lang = LANGS[url.searchParams.get("lang") ?? "en"] ?? "en-US";

  let endpoint = "";
  if (action === "trending") endpoint = `/trending/movie/week?api_key=${apiKey}&language=${lang}`;
  else if (action === "search") {
    const q = url.searchParams.get("q") ?? "";
    endpoint = `/search/movie?api_key=${apiKey}&language=${lang}&query=${encodeURIComponent(q)}`;
  } else {
    return new Response("Unknown action", { status: 400 });
  }

  const res = await fetch(`${TMDB_BASE}${endpoint}`);
  const data = await res.json() as { results?: TmdbMovie[] };
  const movies = (data.results ?? []).slice(0, 10);

  const isRu = lang === "ru-RU";
  const cards = movies.map((m: TmdbMovie, i: number) => ({
    id: 10000 + m.id,
    cat: "film",
    emoji: "🎬",
    catLabel: isRu ? "Фильм" : "Film",
    title: m.title,
    desc: m.overview.slice(0, 180) || (isRu ? "Нет описания" : "No description"),
    tag: `★ ${m.vote_average.toFixed(1)} · ${m.release_date?.slice(0, 4) ?? ""}`,
    hint: isRu ? "TMDB · актуально сейчас" : "TMDB · trending now",
    color: ["#7C3AED", "#E11D48", "#0EA5E9", "#D97706"][i % 4],
    bg: ["#130820", "#1A0208", "#00101A", "#180E00"][i % 4],
    action: isRu ? "Смотреть" : "Watch",
    genres: m.genre_ids.map((id: number) => GENRE_MAP[id] ?? "cinema").filter(Boolean),
    weather: ["any"],
    poster: m.poster_path ? `${TMDB_IMG}${m.poster_path}` : null,
    rating: m.vote_average,
    source: "tmdb",
  }));

  return new Response(JSON.stringify(cards), {
    headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
  });
});
