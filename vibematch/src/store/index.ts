import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Card, Notifs, Profile, SwipeRecord, UserContext } from "../types";
import { migrateToV2 } from "./migrations";

// ─── Session slice ────────────────────────────────────────────────────────────
interface SessionSlice {
  profile: Profile;
  notifs: Notifs;
  setProfile: (p: Profile) => void;
  setNotifs: (n: Notifs) => void;
}

// ─── Library slice ────────────────────────────────────────────────────────────
export interface Collection {
  id: string;
  name: string;
  emoji: string;
  cardIds: number[];
  createdAt: string;
}

interface LibrarySlice {
  saved: Card[];
  swipeHistory: SwipeRecord[];
  comments: Record<number, string>;
  collections: Collection[];
  addSaved: (c: Card) => void;
  removeSaved: (id: number) => void;
  setSwipeHistory: (h: SwipeRecord[]) => void;
  addComment: (id: number, txt: string) => void;
  addCollection: (name: string, emoji: string) => void;
  removeCollection: (id: string) => void;
  addToCollection: (collectionId: string, cardId: number) => void;
  removeFromCollection: (collectionId: string, cardId: number) => void;
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

// ─── Streak slice ─────────────────────────────────────────────────────────────
export interface Achievement {
  id: string;
  title: string;
  desc: string;
  emoji: string;
  unlockedAt?: string;
}

interface StreakSlice {
  streak: number;
  lastActiveDate: string | null;
  totalDays: number;
  achievements: Achievement[];
  recordDailyActivity: () => void;
  unlockAchievement: (id: string) => void;
}

export type AppStore = SessionSlice & LibrarySlice & ContextSlice & DeckSlice & StreakSlice;

// All possible achievements
export const ALL_ACHIEVEMENTS: Achievement[] = [
  { id: "first_swipe",   emoji: "👋", title: "Первый шаг",    desc: "Сделай первый свайп" },
  { id: "swipe_10",      emoji: "🔟", title: "10 свайпов",    desc: "Просвайпай 10 карточек" },
  { id: "swipe_50",      emoji: "🌟", title: "Мастер свайпа", desc: "Просвайпай 50 карточек" },
  { id: "like_5",        emoji: "❤️",  title: "Придирчивый",  desc: "Поставь 5 лайков" },
  { id: "save_3",        emoji: "🔖",  title: "Коллекционер", desc: "Сохрани 3 карточки" },
  { id: "streak_3",      emoji: "🔥",  title: "Три дня подряд", desc: "Заходи 3 дня подряд" },
  { id: "streak_7",      emoji: "⚡",  title: "Недельный вайб", desc: "7 дней подряд" },
  { id: "coop_first",    emoji: "👥",  title: "Командный игрок", desc: "Сыграй в совместный режим" },
  { id: "collection_1",  emoji: "📂",  title: "Организатор",  desc: "Создай первую коллекцию" },
  { id: "all_cats",      emoji: "🎯",  title: "Всеядный",     desc: "Лайкни все категории" },
];

export const useAppStore = create<AppStore>()(
  persist(
    (set, get) => ({
      // session
      profile: { name: "Пользователь", avatar: "🧑" },
      notifs: { evening: true, sales: true, places: false },
      setProfile: (profile) => set({ profile }),
      setNotifs: (notifs) => set({ notifs }),

      // library
      saved: [],
      swipeHistory: [],
      comments: {},
      collections: [],
      addSaved: (c) => set((s) => ({ saved: s.saved.find((x) => x.id === c.id) ? s.saved : [...s.saved, c] })),
      removeSaved: (id) => set((s) => ({ saved: s.saved.filter((c) => c.id !== id) })),
      setSwipeHistory: (swipeHistory) => set({ swipeHistory }),
      addComment: (id, txt) => set((s) => ({ comments: { ...s.comments, [id]: txt } })),
      addCollection: (name, emoji) => {
        set((s) => ({
          collections: [...s.collections, { id: crypto.randomUUID(), name, emoji, cardIds: [], createdAt: new Date().toISOString() }],
        }));
        get().unlockAchievement("collection_1");
      },
      removeCollection: (id) => set((s) => ({ collections: s.collections.filter((c) => c.id !== id) })),
      addToCollection: (collectionId, cardId) =>
        set((s) => ({
          collections: s.collections.map((c) =>
            c.id === collectionId && !c.cardIds.includes(cardId)
              ? { ...c, cardIds: [...c.cardIds, cardId] }
              : c
          ),
        })),
      removeFromCollection: (collectionId, cardId) =>
        set((s) => ({
          collections: s.collections.map((c) =>
            c.id === collectionId ? { ...c, cardIds: c.cardIds.filter((id) => id !== cardId) } : c
          ),
        })),
      reset: () => set({ saved: [], swipeHistory: [], comments: {}, collections: [] }),

      // context
      context: { mood: null, people: null, time: null, genres: [] },
      setContext: (context) => set({ context }),

      // deck
      deckIdx: 0,
      setDeckIdx: (deckIdx) => set({ deckIdx }),
      resetDeck: () => set({ deckIdx: 0 }),

      // streaks
      streak: 0,
      lastActiveDate: null,
      totalDays: 0,
      achievements: [],
      recordDailyActivity: () => {
        const today = new Date().toDateString();
        const s = get();
        if (s.lastActiveDate === today) return;

        const yesterday = new Date(Date.now() - 86400000).toDateString();
        const newStreak = s.lastActiveDate === yesterday ? s.streak + 1 : 1;
        const newTotal = s.totalDays + 1;
        set({ streak: newStreak, lastActiveDate: today, totalDays: newTotal });

        // Auto-unlock streak achievements
        if (newStreak >= 3) get().unlockAchievement("streak_3");
        if (newStreak >= 7) get().unlockAchievement("streak_7");
      },
      unlockAchievement: (id) => {
        const s = get();
        if (s.achievements.some((a) => a.id === id && a.unlockedAt)) return;
        const def = ALL_ACHIEVEMENTS.find((a) => a.id === id);
        if (!def) return;
        set((st) => ({
          achievements: [
            ...st.achievements.filter((a) => a.id !== id),
            { ...def, unlockedAt: new Date().toISOString() },
          ],
        }));
      },
    }),
    {
      name: "vibematch-v1", // storage key stays; the version field drives migration
      version: 2,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      migrate: (state: any, from: number) => (from < 2 ? migrateToV2(state) : state),
      partialize: (s) => ({
        profile: s.profile,
        notifs: s.notifs,
        saved: s.saved,
        swipeHistory: s.swipeHistory,
        comments: s.comments,
        collections: s.collections,
        context: s.context,
        streak: s.streak,
        lastActiveDate: s.lastActiveDate,
        totalDays: s.totalDays,
        achievements: s.achievements,
      }),
    }
  )
);
