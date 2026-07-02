import type { Card } from "../types";

// ─── Deep links: every card action opens a real destination ──────────────────
export function actionUrl(card: Card): string {
  const q = encodeURIComponent(card.title.replace(/[«»]/g, "").trim());
  switch (card.cat) {
    case "film":
      return `https://www.kinopoisk.ru/index.php?kp_query=${q}`;
    case "book":
      return `https://www.litres.ru/search/?q=${q}`;
    case "game":
      return `https://store.steampowered.com/search/?term=${q}`;
    case "food":
      if (card.genres.includes("готовка")) return `https://www.google.com/search?q=${encodeURIComponent("рецепт " + card.title.replace(/[«»]/g, ""))}`;
      if (card.genres.includes("доставка")) return `https://eda.yandex.ru/search?text=${q}`;
      return `https://yandex.ru/maps/?text=${q}`;
    case "activity":
    case "place":
    case "sale":
    default:
      if (card.lat && card.lng) return `https://yandex.ru/maps/?pt=${card.lng},${card.lat}&z=16&l=map&text=${q}`;
      return `https://yandex.ru/maps/?text=${q}`;
  }
}

export function openAction(card: Card) {
  window.open(actionUrl(card), "_blank", "noopener,noreferrer");
}

// ─── Share via Web Share API with clipboard fallback ─────────────────────────
export type ShareResult = "shared" | "copied" | "failed";

export async function shareCard(card: Card): Promise<ShareResult> {
  const text = `${card.emoji} ${card.title} — ${card.desc}`;
  const url = actionUrl(card);
  if (navigator.share) {
    try {
      await navigator.share({ title: card.title, text, url });
      return "shared";
    } catch {
      // user cancelled or share failed — fall through to clipboard
    }
  }
  try {
    await navigator.clipboard.writeText(`${text}\n${url}`);
    return "copied";
  } catch {
    return "failed";
  }
}
