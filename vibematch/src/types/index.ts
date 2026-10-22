export type Category = "film" | "place" | "sale" | "book" | "game";

export interface Card {
  id: string;
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
  /** Ссылка для кнопки действия; без неё строится поиск по названию */
  url?: string;
  /** Постер / обложка / скриншот */
  image?: string;
  /** Откуда карточка: OpenStreetMap, Steam, TMDB, Open Library… */
  source?: string;
  /** Для мест: сайт, часы работы в формате OSM, расстояние и тип */
  site?: string;
  openingHours?: string;
  distM?: number;
  placeKind?: string;
}

export type SourceName = "places" | "steam" | "films" | "books";

export interface SourceStatus {
  state: "loading" | "ok" | "error" | "off";
  count?: number;
  reason?: string;
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
