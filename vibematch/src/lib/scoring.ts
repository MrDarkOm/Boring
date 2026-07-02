import type { Card, SwipeRecord, UserContext, Weather } from "../types";

// Hour-of-day → preferred categories
const TIME_GENRES: Record<string, string[]> = {
  morning:   ["кофе", "завтраки", "спорт", "прогулки"],
  afternoon: ["места", "активный отдых", "кофе"],
  evening:   ["бары", "кино", "еда", "музыка", "театр"],
  night:     ["бары", "музыка", "игры", "кино"],
};

const OUTDOOR = ["прогулки", "активный отдых"];

function timeOfDay(): keyof typeof TIME_GENRES {
  const h = new Date().getHours();
  if (h >= 6 && h < 12) return "morning";
  if (h >= 12 && h < 18) return "afternoon";
  if (h >= 18 && h < 23) return "evening";
  return "night";
}

// Genre preference from swipe history: likes teach, dislikes anti-teach
function buildLearned(history: SwipeRecord[]): Map<string, number> {
  const map = new Map<string, number>();
  for (const { dir, card } of history) {
    const delta = dir === "right" || dir === "up" ? 1 : dir === "left" ? -0.6 : 0;
    if (!delta) continue;
    for (const g of card.genres) {
      map.set(g, (map.get(g) ?? 0) + delta);
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
  const isHome = card.cat === "film" || card.cat === "book" || card.cat === "game" || card.genres.includes("готовка");
  const isOut = card.cat === "place" || card.cat === "activity" || card.genres.some((g) => OUTDOOR.includes(g));

  // ── Weather: match is a bonus, going outside in bad weather is a penalty ──
  if (card.weather.includes(weather.id)) score += 3;
  else if (card.weather.includes("any")) score += 1;
  const badWeather = ["rain", "snow", "storm", "fog"].includes(weather.id);
  if (badWeather && isOut && !card.weather.includes(weather.id)) score -= 4;
  if (badWeather && isHome) score += 1.5;

  // ── Interests: each matching genre counts ──
  if (context.genres?.length) {
    const matches = card.genres.filter((g) => context.genres.includes(g)).length;
    score += matches * 2.5;
    if (matches === 0) score -= 1; // gently push non-matching cards down
  }

  // ── Time of day ──
  const todGenres = TIME_GENRES[timeOfDay()] ?? [];
  if (card.genres.some((g) => todGenres.includes(g))) score += 2;

  // ── Mood: bonuses AND conflicts ──
  switch (context.mood) {
    case "lazy":
      if (isHome) score += 3;
      if (isOut) score -= 4;
      break;
    case "active":
      if (card.cat === "activity" || card.genres.some((g) => ["спорт", "активный отдых", "прогулки"].includes(g))) score += 4;
      if (isHome) score -= 3;
      break;
    case "social":
      if (card.genres.some((g) => ["бары", "квесты", "музыка", "еда"].includes(g)) || card.cat === "sale") score += 3;
      if (card.cat === "book") score -= 3;
      break;
    case "calm":
      if (card.genres.some((g) => ["кофе", "уют", "литература", "прогулки"].includes(g))) score += 3;
      if (card.genres.some((g) => ["бары", "экшн", "квесты"].includes(g))) score -= 2;
      break;
  }

  // ── People ──
  if (context.people === "Компания" && card.genres.some((g) => ["квесты", "бары", "активный отдых", "еда"].includes(g))) score += 2;
  if (context.people === "Компания" && card.cat === "book") score -= 2;
  if (context.people === "Вдвоём" && card.genres.includes("романтика")) score += 2;

  // ── Time budget: 30 минут — не время для трёхчасового кино ──
  if (context.time === "30 мин") {
    if (card.cat === "film") score -= 3;
    if (card.cat === "activity" || card.cat === "place") score -= 1.5;
    if (card.cat === "game" || card.genres.includes("кофе") || card.genres.includes("еда")) score += 1.5;
  }
  if (context.time === "Весь день" && (card.cat === "activity" || card.cat === "place")) score += 1.5;

  // ── Learned from swipe history (likes up, dislikes down) ──
  const learned = buildLearned(history);
  for (const g of card.genres) {
    score += (learned.get(g) ?? 0) * 0.8;
  }

  // ── Real nearby places get a locality boost ──
  if (card.lat && card.lng && card.tag.includes("от тебя")) score += 1.5;

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
