import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Card, Notifs, Profile, SwipeRecord, UserContext } from "../types";

// ─── Session slice ────────────────────────────────────────────────────────────
interface SessionSlice {
  profile: Profile;
  notifs: Notifs;
  setProfile: (p: Profile) => void;
  setNotifs: (n: Notifs) => void;
}

// ─── Library slice ────────────────────────────────────────────────────────────
interface LibrarySlice {
  saved: Card[];
  swipeHistory: SwipeRecord[];
  comments: Record<number, string>;
  addSaved: (c: Card) => void;
  setSwipeHistory: (h: SwipeRecord[]) => void;
  addComment: (id: number, txt: string) => void;
  reset: () => void;
}

// ─── Context slice ────────────────────────────────────────────────────────────
interface ContextSlice {
  context: UserContext;
  setContext: (ctx: UserContext) => void;
}

// ─── Deck slice ───────────────────────────────────────────────────────────────
interface DeckSlice {
  deckIdx: number;
  setDeckIdx: (i: number) => void;
  resetDeck: () => void;
}

export type AppStore = SessionSlice & LibrarySlice & ContextSlice & DeckSlice;

export const useAppStore = create<AppStore>()(
  persist(
    (set) => ({
      // session
      profile: { name: "Пользователь", avatar: "🧑" },
      notifs: { evening: true, sales: true, places: false },
      setProfile: (profile) => set({ profile }),
      setNotifs: (notifs) => set({ notifs }),

      // library
      saved: [],
      swipeHistory: [],
      comments: {},
      addSaved: (c) => set((s) => ({ saved: s.saved.find((x) => x.id === c.id) ? s.saved : [...s.saved, c] })),
      setSwipeHistory: (swipeHistory) => set({ swipeHistory }),
      addComment: (id, txt) => set((s) => ({ comments: { ...s.comments, [id]: txt } })),
      reset: () => set({ saved: [], swipeHistory: [], comments: {} }),

      // context
      context: { mood: null, people: null, time: null, genres: [] },
      setContext: (context) => set({ context }),

      // deck
      deckIdx: 0,
      setDeckIdx: (deckIdx) => set({ deckIdx }),
      resetDeck: () => set({ deckIdx: 0 }),
    }),
    {
      name: "vibematch-v1",
      // only persist non-ephemeral state
      partialize: (s) => ({
        profile: s.profile,
        notifs: s.notifs,
        saved: s.saved,
        swipeHistory: s.swipeHistory,
        comments: s.comments,
        context: s.context,
      }),
    }
  )
);
