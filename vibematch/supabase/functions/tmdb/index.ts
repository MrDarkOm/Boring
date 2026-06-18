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

const GENRE_MAP: Record<number, string> = {
  28: "экшн", 12: "приключения", 16: "мультфильм", 35: "комедия",
  80: "криминал", 99: "документальный", 18: "драма", 10751: "семейный",
  14: "фэнтези", 36: "исторический", 27: "ужасы", 10402: "музыкальный",
  9648: "детектив", 10749: "романтика", 878: "фантастика", 53: "триллер",
  10770: "телефильм", 37: "вестерн",
};

Deno.serve(async (req: Request) => {
  // CORS
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, content-type" } });
  }

  const apiKey = Deno.env.get("TMDB_API_KEY");
  if (!apiKey) return new Response("TMDB_API_KEY not configured", { status: 500 });

  const url = new URL(req.url);
  const action = url.searchParams.get("action") ?? "trending";

  let endpoint = "";
  if (action === "trending") endpoint = `/trending/movie/week?api_key=${apiKey}&language=ru-RU`;
  else if (action === "search") {
    const q = url.searchParams.get("q") ?? "";
    endpoint = `/search/movie?api_key=${apiKey}&language=ru-RU&query=${encodeURIComponent(q)}`;
  } else {
    return new Response("Unknown action", { status: 400 });
  }

  const res = await fetch(`${TMDB_BASE}${endpoint}`);
  const data = await res.json() as { results?: TmdbMovie[] };
  const movies = (data.results ?? []).slice(0, 10);

  const cards = movies.map((m: TmdbMovie, i: number) => ({
    id: 10000 + m.id,
    cat: "film",
    emoji: "🎬",
    catLabel: "Фильм",
    title: m.title,
    desc: m.overview.slice(0, 180) || "Нет описания",
    tag: `★ ${m.vote_average.toFixed(1)} · ${m.release_date?.slice(0, 4) ?? ""}`,
    hint: "TMDB · актуально сейчас",
    color: ["#7C3AED", "#E11D48", "#0EA5E9", "#D97706"][i % 4],
    bg: ["#130820", "#1A0208", "#00101A", "#180E00"][i % 4],
    action: "Смотреть",
    genres: m.genre_ids.map((id: number) => GENRE_MAP[id] ?? "кино").filter(Boolean),
    weather: ["any"],
    poster: m.poster_path ? `${TMDB_IMG}${m.poster_path}` : null,
  }));

  return new Response(JSON.stringify(cards), {
    headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
  });
});
