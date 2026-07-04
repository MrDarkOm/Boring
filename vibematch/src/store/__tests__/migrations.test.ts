import { describe, it, expect } from "vitest";
import { migrateToV2 } from "../migrations";
import { normalizeGenre } from "../../lib/normalize";
import { LEGACY_GENRE_RU, LEGACY_PEOPLE_RU, LEGACY_TIME_RU } from "../../data/slugs";

// A realistic v0 persisted state: RU genre strings, no id/at on swipe records
const legacyCard = {
  id: 2, cat: "place", emoji: "☕", catLabel: "Кофейня",
  title: "Кофейня «Брют»", desc: "", tag: "350м", hint: "", color: "#fff", bg: "#000",
  action: "Маршрут", genres: ["кофе", "уют"], weather: ["any"],
};

const v0state = {
  profile: { name: "Тест", avatar: "🧑" },
  context: { mood: "calm", people: "Компания", time: "30 мин", genres: ["фантастика", "кофе"] },
  swipeHistory: [{ dir: "right", card: legacyCard }],
  saved: [legacyCard],
};

describe("migrateToV2", () => {
  it("maps legacy RU strings to slugs", () => {
    const m = migrateToV2(v0state);
    expect(m.context.people).toBe("group");
    expect(m.context.time).toBe("30m");
    expect(m.context.genres).toEqual(["scifi", "coffee"]);
    expect(m.swipeHistory[0].card.genres).toEqual(["coffee", "cozy"]);
    expect(m.saved[0].genres).toEqual(["coffee", "cozy"]);
  });

  it("stamps id and epoch timestamp on legacy swipe records", () => {
    const m = migrateToV2(v0state);
    expect(m.swipeHistory[0].id).toBeTruthy();
    expect(m.swipeHistory[0].at).toBe(new Date(0).toISOString());
  });

  it("is idempotent", () => {
    const once = migrateToV2(v0state);
    const twice = migrateToV2(once);
    expect(twice.context).toEqual(once.context);
    expect(twice.saved).toEqual(once.saved);
    expect(twice.swipeHistory[0].card.genres).toEqual(once.swipeHistory[0].card.genres);
  });

  it("survives empty/partial state", () => {
    expect(migrateToV2({})).toEqual({
      context: { mood: null, people: null, time: null, genres: [] },
      swipeHistory: [],
      saved: [],
    });
  });
});

describe("legacy maps completeness", () => {
  // Every string that ever shipped in the old catalog / scoring / tmdb map
  const shipped = [
    "фантастика", "драма", "романтика", "комедия", "детективы", "детектив", "экшн",
    "сериалы", "мультфильмы", "мультфильм", "криминал", "документальный", "семейный",
    "фэнтези", "исторический", "ужасы", "триллер", "телефильм", "вестерн", "кино",
    "театр", "игры", "инди", "rpg", "квесты", "симуляторы", "приключения",
    "литература", "саморазвитие", "спорт", "активный отдых", "прогулки", "места",
    "кофе", "уют", "бары", "музыка", "завтраки", "еда", "готовка", "доставка",
  ];

  it("covers every shipped genre literal", () => {
    for (const g of shipped) {
      expect(LEGACY_GENRE_RU[g], `missing legacy mapping for "${g}"`).toBeTruthy();
      expect(normalizeGenre(g)).toBe(LEGACY_GENRE_RU[g]);
    }
  });

  it("covers people and time options", () => {
    expect(Object.keys(LEGACY_PEOPLE_RU)).toEqual(["Один", "Вдвоём", "Компания"]);
    expect(Object.keys(LEGACY_TIME_RU)).toEqual(["30 мин", "Пару часов", "Весь день"]);
  });

  it("passes through already-normalized slugs", () => {
    expect(normalizeGenre("coffee")).toBe("coffee");
    expect(normalizeGenre("scifi")).toBe("scifi");
  });
});
