// ─── Stable internal feature keys ─────────────────────────────────────────────
// Genres/people/time are scoring features AND persisted data (localStorage +
// Supabase). They must never change with UI language — slugs are the canonical
// values; presentation is resolved through i18n at render time.

export const GENRES = [
  "scifi", "drama", "romance", "comedy", "mystery", "action", "series", "animation",
  "crime", "documentary", "family", "fantasy", "history", "horror", "thriller",
  "tvmovie", "western", "cinema", "theatre",
  "games", "indie", "rpg", "quests", "sims", "adventure",
  "literature", "selfdev",
  "sport", "outdoor", "walks", "places",
  "coffee", "cozy", "bars", "music", "breakfast",
  "food", "cooking", "delivery",
] as const;
export type GenreSlug = (typeof GENRES)[number];

export const PEOPLE_SLUGS = ["solo", "duo", "group"] as const;
export type PeopleSlug = (typeof PEOPLE_SLUGS)[number];

export const TIME_SLUGS = ["30m", "2h", "allday"] as const;
export type TimeSlug = (typeof TIME_SLUGS)[number];

// ─── Legacy RU → slug tables ──────────────────────────────────────────────────
// Cover every literal that ever shipped: the static catalog, places.ts KINDS,
// scoring TIME_GENRES, and the tmdb edge-function GENRE_MAP (incl. singular
// variants it emitted). Used by normalize.ts on store migration and on every
// load from Supabase, forever — old clients keep writing RU strings.
export const LEGACY_GENRE_RU: Record<string, GenreSlug> = {
  "фантастика": "scifi",
  "драма": "drama",
  "романтика": "romance",
  "комедия": "comedy",
  "детективы": "mystery",
  "детектив": "mystery",
  "экшн": "action",
  "сериалы": "series",
  "мультфильмы": "animation",
  "мультфильм": "animation",
  "криминал": "crime",
  "документальный": "documentary",
  "семейный": "family",
  "фэнтези": "fantasy",
  "исторический": "history",
  "ужасы": "horror",
  "триллер": "thriller",
  "телефильм": "tvmovie",
  "вестерн": "western",
  "кино": "cinema",
  "театр": "theatre",
  "игры": "games",
  "инди": "indie",
  "rpg": "rpg",
  "квесты": "quests",
  "симуляторы": "sims",
  "приключения": "adventure",
  "литература": "literature",
  "саморазвитие": "selfdev",
  "спорт": "sport",
  "активный отдых": "outdoor",
  "прогулки": "walks",
  "места": "places",
  "кофе": "coffee",
  "уют": "cozy",
  "бары": "bars",
  "музыка": "music",
  "музыкальный": "music",
  "завтраки": "breakfast",
  "еда": "food",
  "готовка": "cooking",
  "доставка": "delivery",
};

export const LEGACY_PEOPLE_RU: Record<string, PeopleSlug> = {
  "Один": "solo",
  "Вдвоём": "duo",
  "Компания": "group",
};

export const LEGACY_TIME_RU: Record<string, TimeSlug> = {
  "30 мин": "30m",
  "Пару часов": "2h",
  "Весь день": "allday",
};
