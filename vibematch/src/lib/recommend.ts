import type { Card, Geo, SwipeRecord, UserContext, Weather } from "../types";
import { scoreCard } from "./scoring";
import { haversine } from "./index";

// ─── Recommendation engine on top of the base scorer ─────────────────────────
// scoring.ts stays the static context/weather/mood scorer; this module adds
// what it can't do: decayed learning over rich features, exploration,
// honest match %, post-swipe re-ranking and dislike-aware restarts.

const HALF_LIFE_DAYS = 14;
const LEARN_WEIGHT = 0.9;
const NOVELTY_WEIGHT = 0.8;
const EPSILON = 0.15;
const DISLIKE_DEMOTION = 5;

// ── Feature extraction: genres + category + distance bucket ──────────────────
export function cardFeatures(card: Card, geo?: Geo | null): string[] {
  const feats = [`cat:${card.cat}`, ...card.genres.map((g) => `genre:${g}`)];
  if (geo && card.lat != null && card.lng != null) {
    const d = haversine(geo.lat, geo.lng, card.lat, card.lng);
    feats.push(`dist:${d <= 1000 ? "near" : d <= 3000 ? "mid" : "far"}`);
  }
  return feats;
}

// ── Learned feature weights with recency decay, memoized ─────────────────────
export interface Learned {
  weights: Map<string, number>;
  exposure: Map<string, number>;
}

let learnedCache: { key: string; value: Learned } | null = null;

export function getLearned(history: SwipeRecord[], now: number = Date.now()): Learned {
  const key = `${history.length}:${history[history.length - 1]?.id ?? ""}`;
  if (learnedCache?.key === key) return learnedCache.value;

  const weights = new Map<string, number>();
  const exposure = new Map<string, number>();
  for (const rec of history) {
    const at = Date.parse(rec.at);
    const ageDays = Number.isFinite(at) ? Math.max(0, (now - at) / 86_400_000) : Infinity;
    const decay = Math.pow(0.5, ageDays / HALF_LIFE_DAYS);
    const delta = rec.dir === "right" || rec.dir === "up" ? 1 : rec.dir === "left" ? -0.6 : 0;
    for (const f of cardFeatures(rec.card)) {
      weights.set(f, (weights.get(f) ?? 0) + delta * decay);
      exposure.set(f, (exposure.get(f) ?? 0) + 1);
    }
  }

  learnedCache = { key, value: { weights, exposure } };
  return learnedCache.value;
}

// ── Single-card score: base scorer + learned features + novelty ─────────────
export function recommendScore(
  card: Card,
  context: UserContext,
  weather: Weather,
  learned: Learned,
  geo?: Geo | null
): number {
  // history intentionally NOT passed to the base scorer — learning happens here
  let s = scoreCard(card, context, weather, []);
  const feats = cardFeatures(card, geo);
  let novelty = 0;
  for (const f of feats) {
    s += (learned.weights.get(f) ?? 0) * LEARN_WEIGHT;
    novelty += NOVELTY_WEIGHT / Math.sqrt(1 + (learned.exposure.get(f) ?? 0));
  }
  // mean novelty keeps many-genre cards from dominating on tag count alone
  s += feats.length ? novelty / feats.length : 0;
  return s;
}

// ── Deck ranking with ε-exploration and score stats ──────────────────────────
export interface RecOptions {
  geo?: Geo | null;
  rng?: () => number;
  now?: number;
  demote?: Set<number>; // card ids to push down (soft dislike demotion)
  explore?: boolean; // default true
}

export interface RankedDeck {
  cards: Card[];
  scores: Map<number, number>;
  mean: number;
  std: number;
}

export function rankDeck(
  cards: Card[],
  context: UserContext,
  weather: Weather,
  history: SwipeRecord[],
  opts: RecOptions = {}
): RankedDeck {
  const learned = getLearned(history, opts.now);
  const scored = cards.map((c) => {
    let s = recommendScore(c, context, weather, learned, opts.geo);
    if (opts.demote?.has(c.id)) s -= DISLIKE_DEMOTION;
    return { c, s };
  });
  scored.sort((a, b) => b.s - a.s);

  // ε-greedy exploration: occasionally promote 2 bottom-half cards to slots 3–8
  const rng = opts.rng ?? Math.random;
  if ((opts.explore ?? true) && scored.length >= 10 && rng() < EPSILON) {
    for (let k = 0; k < 2; k++) {
      const half = Math.floor(scored.length / 2);
      const fromIdx = Math.min(scored.length - 1, half + Math.floor(rng() * (scored.length - half)));
      const [item] = scored.splice(fromIdx, 1);
      const toIdx = Math.min(3 + Math.floor(rng() * 6), scored.length);
      scored.splice(toIdx, 0, item);
    }
  }

  const vals = scored.map((x) => x.s);
  const mean = vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : 0;
  const variance = vals.length ? vals.reduce((a, b) => a + (b - mean) ** 2, 0) / vals.length : 0;
  return {
    cards: scored.map((x) => x.c),
    scores: new Map(scored.map((x) => [x.c.id, x.s])),
    mean,
    std: Math.sqrt(variance),
  };
}

// ── Honest match %: sigmoid over the deck z-score (50–99) ────────────────────
export function matchPercent(score: number, mean: number, std: number): number {
  const z = (score - mean) / (std || 1);
  const sig = 1 / (1 + Math.exp(-1.1 * z));
  return Math.round(50 + sig * 49);
}

// ── Post-swipe re-ranking: frozen prefix, re-ranked unseen tail ──────────────
export function rerankTail(
  deck: Card[],
  frozenCount: number,
  context: UserContext,
  weather: Weather,
  history: SwipeRecord[],
  opts: RecOptions = {}
): Card[] {
  if (frozenCount >= deck.length) return deck;
  const frozen = deck.slice(0, frozenCount);
  const tail = deck.slice(frozenCount);
  // no exploration on per-swipe reranks — jumps would feel glitchy
  const ranked = rankDeck(tail, context, weather, history, { ...opts, explore: false });
  return [...frozen, ...ranked.cards];
}

// ── Deck restart: drop dislikes, or demote them when too little is left ──────
export function buildRestartPool(cards: Card[], history: SwipeRecord[]): { pool: Card[]; demote: Set<number> } {
  const disliked = new Set(history.filter((h) => h.dir === "left").map((h) => h.card.id));
  const withoutDislikes = cards.filter((c) => !disliked.has(c.id));
  if (withoutDislikes.length >= 5) return { pool: withoutDislikes, demote: new Set() };
  return { pool: cards, demote: disliked };
}

// ── Softmax pick over the top-N (for "decided for you") ──────────────────────
export function softmaxPick(cards: Card[], scores: Map<number, number>, rng: () => number = Math.random, topN = 5): Card | null {
  const top = cards.slice(0, Math.min(topN, cards.length));
  if (!top.length) return null;
  const vals = top.map((c) => scores.get(c.id) ?? 0);
  const max = Math.max(...vals);
  const exps = vals.map((v) => Math.exp(v - max));
  const sum = exps.reduce((a, b) => a + b, 0);
  let r = rng() * sum;
  for (let i = 0; i < top.length; i++) {
    r -= exps[i];
    if (r <= 0) return top[i];
  }
  return top[top.length - 1];
}
