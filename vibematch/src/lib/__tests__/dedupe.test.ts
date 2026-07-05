import { describe, it, expect } from "vitest";
import { dedupeCards, normalizeTitle } from "../dedupe";
import { getStaticCards } from "../../data";
import type { Card } from "../../types";

const base: Card = {
  id: 1, cat: "place", emoji: "☕", catLabel: "Кофейня",
  title: "Кофейня «Брют»", desc: "", tag: "", hint: "", color: "#fff", bg: "#000",
  action: "", genres: ["coffee"], weather: ["any"],
};

describe("normalizeTitle", () => {
  it("strips quotes, case and extra spaces", () => {
    expect(normalizeTitle('Кофейня  «Брют»')).toBe("кофейня брют");
    expect(normalizeTitle("The 'Best' Cafe")).toBe("the best cafe");
  });
});

describe("dedupeCards", () => {
  it("collapses same venue within 150 m, osm wins over static", () => {
    const staticCard: Card = { ...base, id: 1, source: "static", lat: 55.751, lng: 37.618 };
    const osmCard: Card = { ...base, id: 100000000042, source: "osm", lat: 55.7515, lng: 37.6185 }; // ~65 m away
    const out = dedupeCards([staticCard, osmCard]);
    expect(out).toHaveLength(1);
    expect(out[0].source).toBe("osm");
  });

  it("keeps same-titled venues farther than 150 m apart", () => {
    const a: Card = { ...base, id: 1, source: "osm", lat: 55.751, lng: 37.618 };
    const b: Card = { ...base, id: 2, source: "osm", lat: 55.76, lng: 37.63 }; // ~1.2 km away
    expect(dedupeCards([a, b])).toHaveLength(2);
  });

  it("without coords dedupes by matching category", () => {
    const a: Card = { ...base, id: 1, source: "static", lat: undefined, lng: undefined };
    const b: Card = { ...base, id: 2, source: "osm", lat: undefined, lng: undefined };
    const out = dedupeCards([a, b]);
    expect(out).toHaveLength(1);
    expect(out[0].source).toBe("osm");
  });

  it("does not dedupe same title across different categories when no coords", () => {
    const film: Card = { ...base, id: 1, cat: "film", lat: undefined, lng: undefined };
    const book: Card = { ...base, id: 2, cat: "book", lat: undefined, lng: undefined };
    expect(dedupeCards([film, book])).toHaveLength(2);
  });

  it("earlier-listed card survives when priorities are equal", () => {
    const a: Card = { ...base, id: 1, source: "osm", lat: 55.751, lng: 37.618 };
    const b: Card = { ...base, id: 2, source: "osm", lat: 55.751, lng: 37.618 };
    const out = dedupeCards([a, b]);
    expect(out).toHaveLength(1);
    expect(out[0].id).toBe(1);
  });
});

describe("static catalog purity", () => {
  const cards = [...getStaticCards("ru"), ...getStaticCards("en")];

  it("has no geo-bound cards (no lat/lng)", () => {
    for (const c of cards) {
      expect(c.lat, `${c.title} has lat`).toBeUndefined();
      expect(c.lng, `${c.title} has lng`).toBeUndefined();
    }
  });

  it("has no region-bound offer terms (₽ prices, promo codes, Moscow in tag/hint)", () => {
    for (const c of cards) {
      const offerText = `${c.tag} ${c.hint}`;
      // desc may mention places as story content; tag/hint must stay region-free
      expect(offerText, c.title).not.toMatch(/₽|Москв|Промокод|промокод/);
      expect(`${c.title} ${c.desc}`, c.title).not.toMatch(/₽|промокод/i);
    }
  });
});
