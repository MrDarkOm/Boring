import type { Card, SwipeRecord, UserContext, Weather } from "../types";

// Hour-of-day → preferred categories
const TIME_GENRES: Record<string, string[]> = {
  morning:   ["кофе", "завтраки", "спорт", "прогулки"],
  afternoon: ["места", "активный отдых", "кофе"],
  evening:   ["бары", "кино", "еда", "музыка", "театр"],
  night:     ["бары", "музыка", "игры", "кино"],
};

function timeOfDay(): keyof typeof TIME_GENRES {
  const h = new Date().getHours();
  if (h >= 6 && h < 12) return "morning";
  if (h >= 12 && h < 18) return "afternoon";
  if (h >= 18 && h < 23) return "evening";
  return "night";
}

// Build a genre-preference map from swipe history (liked genres get +1)
function buildLearned(history: SwipeRecord[]): Map<string, number> {
  const map = new Map<string, number>();
  for (const { dir, card } of history) {
    if (dir !== "right" && dir !== "up") continue;
    for (const g of card.genres) {
      map.set(g, (map.get(g) ?? 0) + 1);
    }
  }
  return map;
}

export function scoreCard(
  card: Card,
  context: UserContext,
  weather: Weather,
  history: SwipeRecord[]
): number {
  let score = 0;

  // Weather match
  if (card.weather.includes("any") || card.weather.includes(weather.id)) score += 2;

  // Context genres
  if (context.genres?.length && card.genres.some((g) => context.genres.includes(g))) score += 3;

  // Time of day
  const tod = timeOfDay();
  const todGenres = TIME_GENRES[tod] ?? [];
  if (card.genres.some((g) => todGenres.includes(g))) score += 2;

  // Mood → category hints
  if (context.mood === "active" && card.genres.some((g) => ["спорт", "активный отдых", "прогулки"].includes(g))) score += 2;
  if (context.mood === "lazy"   && card.cat === "film") score += 2;
  if (context.mood === "lazy"   && card.cat === "book") score += 2;
  if (context.mood === "social" && card.genres.some((g) => ["бары", "квесты", "музыка"].includes(g))) score += 2;
  if (context.mood === "calm"   && card.genres.some((g) => ["кофе", "уют", "литература"].includes(g))) score += 2;

  // People count
  if (context.people === "Один" && card.cat !== "game") score += 0;
  if (context.people === "Компания" && card.genres.some((g) => ["квесты", "бары", "активный отдых"].includes(g))) score += 1;

  // Learned from swipe history
  const learned = buildLearned(history);
  for (const g of card.genres) {
    score += (learned.get(g) ?? 0) * 0.5;
  }

  return score;
}

export function rankCards(
  cards: Card[],
  context: UserContext,
  weather: Weather,
  history: SwipeRecord[]
): Card[] {
  return cards
    .map((c) => ({ c, score: scoreCard(c, context, weather, history) }))
    .sort((a, b) => b.score - a.score)
    .map((x) => x.c);
}
