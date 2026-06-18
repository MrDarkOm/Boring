export type Category = "film" | "place" | "sale" | "book" | "game";

export interface Card {
  id: number;
  cat: Category;
  emoji: string;
  catLabel: string;
  title: string;
  desc: string;
  tag: string;
  hint: string;
  color: string;
  bg: string;
  action: string;
  genres: string[];
  weather: string[];
  lat?: number;
  lng?: number;
}

export interface Mood {
  id: string;
  emoji: string;
  label: string;
  sub: string;
}

export interface Weather {
  id: string;
  emoji: string;
  label: string;
  temp: number;
  desc: string;
}

export interface Place {
  id: number;
  name: string;
  cat: string;
  dist: string;
  rating: number;
  open: boolean;
  lat: number;
  lng: number;
  color: string;
  distM?: number | null;
  distLabel?: string;
}

export interface Geo {
  lat: number;
  lng: number;
  city?: string;
}

export type GeoState = "idle" | "loading" | "ok" | "denied" | "error";

export interface UserContext {
  mood: string | null;
  people: string | null;
  time: string | null;
  genres: string[];
}

export type SwipeDir = "left" | "right" | "up";

export interface SwipeRecord {
  dir: SwipeDir;
  card: Card;
}

export interface Notifs {
  evening: boolean;
  sales: boolean;
  places: boolean;
}

export interface Profile {
  name: string;
  avatar: string;
}
