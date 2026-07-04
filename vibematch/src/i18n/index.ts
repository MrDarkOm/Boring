import { useSyncExternalStore } from "react";
import { ru } from "./ru";
import { en } from "./en";

export type Locale = "ru" | "en";
export type TKey = keyof typeof ru;

const STORAGE_KEY = "vibematch-locale";

function detectLocale(): Locale {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === "ru" || stored === "en") return stored;
  } catch {
    /* storage unavailable */
  }
  const nav = typeof navigator !== "undefined" ? navigator.language : "en";
  return nav.toLowerCase().startsWith("ru") ? "ru" : "en";
}

let current: Locale = detectLocale();
const listeners = new Set<() => void>();

export function getLocale(): Locale {
  return current;
}

export function setLocale(l: Locale) {
  if (l === current) return;
  current = l;
  try {
    localStorage.setItem(STORAGE_KEY, l);
  } catch {
    /* storage unavailable */
  }
  listeners.forEach((fn) => fn());
}

export function t(key: TKey, params?: Record<string, string | number>): string {
  const dict = current === "ru" ? ru : en;
  let s: string = dict[key] ?? ru[key] ?? key;
  if (params) {
    for (const [k, v] of Object.entries(params)) s = s.split(`{${k}}`).join(String(v));
  }
  return s;
}

// Re-renders the subscribing component (and, keyed at the App root, the whole
// tree) when the locale switches.
export function useLocale(): Locale {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    () => current
  );
}
