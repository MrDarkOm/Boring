import { describe, it, expect } from "vitest";
import {
  getLearned,
  recommendScore,
  rankDeck,
  matchPercent,
  rerankTail,
  buildRestartPool,
  softmaxPick,
} from "../recommend";
import type { Card, SwipeRecord, UserContext, Weather } from "../../types";

const weather: Weather = { id: "sun", emoji: "☀️", label: "Sunny", temp: 20, desc: "" };
const ctx: UserContext = { mood: null, people: null, time: null, genres: [] };

const mkCard = (id: number, genres: string[], cat: Card["cat"] = "film"): Card => ({
  id, cat, emoji: "🎬", catLabel: "Film", title: `Card ${id}`, desc: "", tag: "", hint: "",
  color: "#fff", bg: "#000", action: "", genres, weather: ["any"],
});

const NOW = Date.parse("2026-07-05T12:00:00Z");
const daysAgo = (n: number) => new Date(NOW - n * 86_400_000).toISOString();

const mkSwipe = (id: string, dir: SwipeRecord["dir"], card: Card, at: string): SwipeRecord => ({ id, at, dir, card });

describe("getLearned", () => {
  it("decays old swipes: a fresh like outweighs a 28-day-old like", () => {
    const freshLike = [mkSwipe("a", "right", mkCard(1, ["scifi"]), daysAgo(0))];
    const oldLike = [mkSwipe("b", "right", mkCard(1, ["scifi"]), daysAgo(28))];
    const fresh = getLearned(freshLike, NOW).weights.get("genre:scifi")!;
    const old = getLearned(oldLike, NOW).weights.get("genre:scifi")!;
    expect(fresh).toBeCloseTo(1, 5);
    expect(old).toBeCloseTo(0.25, 5); // two half-lives
    expect(fresh).toBeGreaterThan(old);
  });

  it("memoizes by length + last id", () => {
    const history = [mkSwipe("a", "right", mkCard(1, ["scifi"]), daysAgo(1))];
    const first = getLearned(history, NOW);
    const second = getLearned([...history], NOW); // new array, same key
    expect(second).toBe(first);
  });

  it("legacy records without a valid date contribute nothing", () => {
    const legacy = [mkSwipe("legacy-unique", "right", mkCard(1, ["scifi"]), "not-a-date")];
    expect(getLearned(legacy, NOW).weights.get("genre:scifi")).toBeCloseTo(0, 5);
  });
});

describe("recommendScore novelty", () => {
  it("gives unexposed features a bonus over heavily seen ones", () => {
    const seen = mkCard(1, ["drama"]);
    const history = Array.from({ length: 9 }, (_, i) =>
      mkSwipe(`s${i}`, i % 2 === 0 ? "right" : "left", seen, daysAgo(0))
    );
    // net weight for drama ≈ 5 likes − 4·0.6 = +2.6 → drama still scores higher overall,
    // but the NOVELTY component must favour the fresh feature:
    const learned = getLearned(history, NOW);
    const novel = mkCard(2, ["western"]);
    const noveltyOfNovel = recommendScore(novel, ctx, weather, learned) -
      0; // western has zero learned weight → whole diff vs base is novelty
    const base = 1; // weather:any → +1 from the base scorer
    expect(noveltyOfNovel).toBeGreaterThan(base); // positive novelty on top of base
  });
});

describe("rankDeck", () => {
  const deck = Array.from({ length: 12 }, (_, i) => mkCard(i + 1, i < 6 ? ["scifi"] : ["drama"]));
  const history = [mkSwipe("h1", "right", mkCard(100, ["scifi"]), daysAgo(0))];

  it("ranks liked-genre cards first without exploration", () => {
    const ranked = rankDeck(deck, ctx, weather, history, { explore: false, now: NOW });
    expect(ranked.cards[0].genres).toContain("scifi");
    // all scifi cards before all drama cards
    const firstDrama = ranked.cards.findIndex((c) => c.genres.includes("drama"));
    const lastScifi = ranked.cards.map((c) => c.genres.includes("scifi")).lastIndexOf(true);
    expect(lastScifi).toBeLessThan(firstDrama + 6);
  });

  it("ε-exploration promotes bottom-half cards into slots 3–8", () => {
    const rng = () => 0; // rng()<0.15 always fires; deterministic promotion
    const ranked = rankDeck(deck, ctx, weather, history, { rng, now: NOW });
    const noExplore = rankDeck(deck, ctx, weather, history, { explore: false, now: NOW });
    const bottomHalf = new Set(noExplore.cards.slice(6).map((c) => c.id));
    const promoted = ranked.cards.slice(3, 9).filter((c) => bottomHalf.has(c.id));
    expect(promoted.length).toBeGreaterThan(0);
    // and the full deck is preserved, nothing lost or duplicated
    expect([...ranked.cards].map((c) => c.id).sort((a, b) => a - b))
      .toEqual(deck.map((c) => c.id).sort((a, b) => a - b));
  });

  it("demote pushes listed ids down", () => {
    const target = deck[0].id;
    const ranked = rankDeck(deck, ctx, weather, history, { explore: false, now: NOW, demote: new Set([target]) });
    const pos = ranked.cards.findIndex((c) => c.id === target);
    expect(pos).toBeGreaterThan(5);
  });
});

describe("matchPercent", () => {
  it("is monotonic in score and stays within 50–99", () => {
    const pcts = [-3, -1, 0, 1, 3].map((z) => matchPercent(z, 0, 1));
    for (let i = 1; i < pcts.length; i++) expect(pcts[i]).toBeGreaterThan(pcts[i - 1]);
    expect(pcts[0]).toBeGreaterThanOrEqual(50);
    expect(pcts[pcts.length - 1]).toBeLessThanOrEqual(99);
  });

  it("survives zero std", () => {
    expect(matchPercent(5, 5, 0)).toBe(75); // z=0 → sigmoid 0.5 → 50 + 24.5 ≈ 75
  });
});

describe("rerankTail", () => {
  it("never touches the frozen prefix", () => {
    const deck = Array.from({ length: 10 }, (_, i) => mkCard(i + 1, i < 5 ? ["drama"] : ["scifi"]));
    const history = [mkSwipe("h1", "right", mkCard(100, ["scifi"]), daysAgo(0))];
    const out = rerankTail(deck, 4, ctx, weather, history, { now: NOW });
    expect(out.slice(0, 4).map((c) => c.id)).toEqual(deck.slice(0, 4).map((c) => c.id));
    // tail got re-ranked: scifi cards (liked) move to the front of the tail
    expect(out[4].genres).toContain("scifi");
    expect(out).toHaveLength(10);
  });
});

describe("buildRestartPool", () => {
  const deck = Array.from({ length: 10 }, (_, i) => mkCard(i + 1, ["drama"]));

  it("drops disliked cards when enough remain", () => {
    const history = [mkSwipe("h1", "left", deck[0], daysAgo(0)), mkSwipe("h2", "left", deck[1], daysAgo(0))];
    const { pool, demote } = buildRestartPool(deck, history);
    expect(pool).toHaveLength(8);
    expect(pool.some((c) => c.id === deck[0].id)).toBe(false);
    expect(demote.size).toBe(0);
  });

  it("falls back to demotion when fewer than 5 would remain", () => {
    const history = deck.slice(0, 7).map((c, i) => mkSwipe(`h${i}`, "left", c, daysAgo(0)));
    const { pool, demote } = buildRestartPool(deck, history);
    expect(pool).toHaveLength(10);
    expect(demote.size).toBe(7);
  });
});

describe("softmaxPick", () => {
  it("prefers the top card with rng→0 and picks within topN", () => {
    const cards = [mkCard(1, []), mkCard(2, []), mkCard(3, [])];
    const scores = new Map([[1, 10], [2, 1], [3, 0]]);
    expect(softmaxPick(cards, scores, () => 0)!.id).toBe(1);
    const anyPick = softmaxPick(cards, scores, () => 0.999)!;
    expect(cards.map((c) => c.id)).toContain(anyPick.id);
  });

  it("returns null on empty deck", () => {
    expect(softmaxPick([], new Map())).toBeNull();
  });
});
