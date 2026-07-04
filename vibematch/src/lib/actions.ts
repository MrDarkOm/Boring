import { Capacitor } from "@capacitor/core";
import type { Card, Geo } from "../types";
import { placeUrl, nearbySearchUrl } from "./mapLinks";
import { t } from "../i18n";

const clean = (s: string) => s.replace(/[«»]/g, "").trim();

// ─── Deep links: every card action opens a real destination ──────────────────
// Geo-bound cards always resolve through coordinates (their own, or a nearby
// search anchored at the user) — never a bare text query typed into a maps app.
export function actionUrl(card: Card, geo: Geo | null = null): string {
  const title = clean(card.title);
  const q = encodeURIComponent(title);
  switch (card.cat) {
    case "film":
      // TMDB-sourced cards carry id = 10000 + tmdbId (see supabase/functions/tmdb)
      if (card.id >= 10_000 && card.id < 100_000) {
        return `https://www.themoviedb.org/movie/${card.id - 10_000}`;
      }
      return `https://www.google.com/search?q=${encodeURIComponent(t("search.watch", { title }))}`;
    case "book":
      return `https://www.goodreads.com/search?q=${q}`;
    case "game":
      return `https://store.steampowered.com/search/?term=${q}`;
    case "food":
      if (card.genres.includes("cooking")) {
        return `https://www.google.com/search?q=${encodeURIComponent(t("search.recipe", { title }))}`;
      }
      if (card.lat && card.lng) return placeUrl({ name: title, lat: card.lat, lng: card.lng });
      return nearbySearchUrl(title, geo);
    case "activity":
    case "place":
    case "sale":
    default:
      if (card.lat && card.lng) return placeUrl({ name: title, lat: card.lat, lng: card.lng });
      return nearbySearchUrl(title, geo);
  }
}

// window.open is silently blocked in webviews (Telegram, Instagram) and by
// popup blockers; fall back to a real anchor click, then to direct navigation.
// On native, hand the URL to the OS so geo:/maps schemes reach the maps app.
export function openUrl(url: string) {
  if (Capacitor.isNativePlatform()) {
    import("@capacitor/app-launcher")
      .then(({ AppLauncher }) => AppLauncher.openUrl({ url }))
      .catch(() => window.open(url, "_blank", "noopener,noreferrer"));
    return;
  }
  const w = window.open(url, "_blank", "noopener,noreferrer");
  if (w) return;
  const a = document.createElement("a");
  a.href = url;
  a.target = "_blank";
  a.rel = "noopener noreferrer";
  document.body.appendChild(a);
  a.click();
  a.remove();
}

export function openAction(card: Card, geo: Geo | null = null) {
  openUrl(actionUrl(card, geo));
}

// ─── Share via Web Share API with clipboard fallback ─────────────────────────
export type ShareResult = "shared" | "copied" | "failed";

export async function shareCard(card: Card, geo: Geo | null = null): Promise<ShareResult> {
  const text = `${card.emoji} ${card.title} — ${card.desc}`;
  const url = actionUrl(card, geo);
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
