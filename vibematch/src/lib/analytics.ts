// Lightweight PostHog/Amplitude-compatible analytics stub.
// Replace posthog.capture with your actual analytics provider.

type EventProps = Record<string, string | number | boolean | null | undefined>;

function track(event: string, props?: EventProps) {
  if (import.meta.env.DEV) {
    console.debug("[analytics]", event, props);
    return;
  }
  // PostHog (load via CDN or npm install posthog-js)
  if (typeof window !== "undefined" && (window as Window & { posthog?: { capture: (e: string, p?: EventProps) => void } }).posthog) {
    (window as Window & { posthog?: { capture: (e: string, p?: EventProps) => void } }).posthog?.capture(event, props);
  }
}

export const analytics = {
  onboard: (mood: string | null, people: string | null, time: string | null) =>
    track("onboard_complete", { mood, people, time }),

  swipe: (dir: string, cardId: number, cat: string) =>
    track("card_swipe", { dir, cardId, cat }),

  match: (cardId: number, cat: string) =>
    track("card_match", { cardId, cat }),

  save: (cardId: number, cat: string) =>
    track("card_save", { cardId, cat }),

  aiTip: (shown: boolean) =>
    track("ai_tip", { shown }),

  coopStart: (mode: "create" | "join" | "demo") =>
    track("coop_start", { mode }),

  coopMatch: (cardId: number) =>
    track("coop_match", { cardId }),
};
