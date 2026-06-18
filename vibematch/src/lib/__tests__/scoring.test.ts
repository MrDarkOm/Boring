import { describe, it, expect } from "vitest";
import { scoreCard, rankCards } from "../scoring";
import type { Card, UserContext, Weather, SwipeRecord } from "../../types";

const makeWeather = (id: string): Weather => ({ id, emoji: "☀️", label: "Ясно", temp: 20, desc: "" });
const makeCtx = (overrides: Partial<UserContext> = {}): UserContext => ({
  mood: null, people: null, time: null, genres: [], ...overrides,
});

const filmCard: Card = {
  id: 1, cat: "film", emoji: "🎬", catLabel: "Фильм",
  title: "Test Film", desc: "", tag: "", hint: "", color: "#fff", bg: "#000",
  action: "", genres: ["фантастика", "экшн"], weather: ["any"],
};

const cafeCard: Card = {
  id: 2, cat: "place", emoji: "☕", catLabel: "Кофейня",
  title: "Test Cafe", desc: "", tag: "", hint: "", color: "#fff", bg: "#000",
  action: "", genres: ["кофе", "уют"], weather: ["any"],
};

const rainCard: Card = {
  id: 3, cat: "book", emoji: "📚", catLabel: "Книга",
  title: "Test Book", desc: "", tag: "", hint: "", color: "#fff", bg: "#000",
  action: "", genres: ["литература", "детективы"], weather: ["rain", "cloud"],
};

describe("scoreCard", () => {
  it("gives base score for weather:any cards", () => {
    const score = scoreCard(filmCard, makeCtx(), makeWeather("sun"), []);
    expect(score).toBeGreaterThan(0);
  });

  it("scores weather-specific card higher in matching weather", () => {
    const rainy = scoreCard(rainCard, makeCtx(), makeWeather("rain"), []);
    const sunny = scoreCard(rainCard, makeCtx(), makeWeather("sun"), []);
    expect(rainy).toBeGreaterThan(sunny);
  });

  it("boosts cards matching context genres", () => {
    const ctx = makeCtx({ genres: ["фантастика"] });
    const withGenre = scoreCard(filmCard, ctx, makeWeather("sun"), []);
    const withoutGenre = scoreCard(filmCard, makeCtx(), makeWeather("sun"), []);
    expect(withGenre).toBeGreaterThan(withoutGenre);
  });

  it("boosts lazy mood for films", () => {
    const lazyScore = scoreCard(filmCard, makeCtx({ mood: "lazy" }), makeWeather("sun"), []);
    const activeScore = scoreCard(filmCard, makeCtx({ mood: "active" }), makeWeather("sun"), []);
    expect(lazyScore).toBeGreaterThan(activeScore);
  });

  it("learns from swipe history (liked genres get bonus)", () => {
    const history: SwipeRecord[] = [
      { dir: "right", card: cafeCard },
      { dir: "right", card: { ...cafeCard, id: 99 } },
    ];
    const scoreWithHistory = scoreCard(cafeCard, makeCtx(), makeWeather("sun"), history);
    const scoreNoHistory = scoreCard(cafeCard, makeCtx(), makeWeather("sun"), []);
    expect(scoreWithHistory).toBeGreaterThan(scoreNoHistory);
  });
});

describe("rankCards", () => {
  it("returns all cards", () => {
    const cards = [filmCard, cafeCard, rainCard];
    const ranked = rankCards(cards, makeCtx(), makeWeather("sun"), []);
    expect(ranked).toHaveLength(3);
  });

  it("puts rain-matching card first in rain weather", () => {
    const cards = [filmCard, cafeCard, rainCard];
    const ranked = rankCards(cards, makeCtx({ genres: ["литература"] }), makeWeather("rain"), []);
    expect(ranked[0].id).toBe(rainCard.id);
  });
});
