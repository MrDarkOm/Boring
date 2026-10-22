// Реальный контент для карточек: места (OpenStreetMap / Overpass), игры и
// скидки (Steam), фильмы (TMDB, нужен ключ), книги (Google Books с ключом,
// иначе Open Library). Все источники приводятся к единому формату Card,
// который ожидает фронтенд (src/types/index.ts).
//
// Ответы кэшируются в памяти, чтобы не нагружать внешние API на каждый запрос.

const UA = "VibeMatch/0.1 (https://github.com/mrdarkom/boring)";
const cache = new Map();

async function cached(key, ttlMs, fn) {
  const hit = cache.get(key);
  if (hit && hit.exp > Date.now()) return hit.value;
  const value = await fn();
  cache.set(key, { value, exp: Date.now() + ttlMs });
  return value;
}

async function getJson(url, opts = {}, timeoutMs = 15000) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const r = await fetch(url, { ...opts, signal: ctrl.signal, headers: { "User-Agent": UA, ...(opts.headers || {}) } });
    if (!r.ok) throw new Error(`${r.status} ${url.split("?")[0]}`);
    return await r.json();
  } finally {
    clearTimeout(t);
  }
}

const HOUR = 3600_000;
const STYLE = {
  film: { emoji: "🎬", catLabel: "Фильм", color: "#7C3AED", bg: "#130820" },
  place: { emoji: "📍", catLabel: "Место", color: "#059669", bg: "#001810" },
  sale: { emoji: "🏷", catLabel: "Скидка", color: "#E11D48", bg: "#1A0208" },
  book: { emoji: "📚", catLabel: "Книга", color: "#D97706", bg: "#180E00" },
  game: { emoji: "🎮", catLabel: "Игра", color: "#0EA5E9", bg: "#00101A" },
};

const clip = (s, n = 220) => {
  s = String(s || "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
  if (s.length <= n) return s;
  const cut = s.slice(0, n);
  const dot = cut.lastIndexOf(". ");
  return (dot > n * 0.5 ? cut.slice(0, dot + 1) : cut.replace(/\s+\S*$/, "") + "…");
};
const hasCyr = (s) => /[а-яё]/i.test(s || "");
const rub = (kop) => `${Math.round(kop / 100).toLocaleString("ru-RU")} ₽`;
const plural = (n, one, few, many) => {
  const m10 = n % 10, m100 = n % 100;
  if (m10 === 1 && m100 !== 11) return one;
  if (m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14)) return few;
  return many;
};

function haversine(lat1, lng1, lat2, lng2) {
  const R = 6371000, rad = Math.PI / 180;
  const a = Math.sin(((lat2 - lat1) * rad) / 2) ** 2 + Math.cos(lat1 * rad) * Math.cos(lat2 * rad) * Math.sin(((lng2 - lng1) * rad) / 2) ** 2;
  return Math.round(R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
}
const fmtDist = (m) => (m < 1000 ? `${m} м` : `${(m / 1000).toFixed(1)} км`);

// ─── Места: OpenStreetMap через Overpass ─────────────────────────────────────
const OVERPASS = [
  "https://overpass-api.de/api/interpreter",
  "https://maps.mail.ru/osm/tools/overpass/api/interpreter",
  "https://overpass.kumi.systems/api/interpreter",
];

// kind → как показываем и какие жанры/погоду проставляем
const PLACE_KINDS = [
  { test: (t) => t.amenity === "cafe", kind: "cafe", pitch: "Подходит, чтобы выпить кофе и спокойно посидеть одному или с другом.", label: "Кафе", noun: "кафе", emoji: "☕", genres: ["кофе", "уют"], weather: ["any"] },
  { test: (t) => t.amenity === "bar" || t.amenity === "pub", kind: "bar", pitch: "Хороший вариант, чтобы провести вечер с компанией.", label: "Бар", noun: "бар", emoji: "🍺", genres: ["бары", "музыка"], weather: ["any"] },
  { test: (t) => t.amenity === "restaurant", kind: "restaurant", pitch: "Можно нормально поужинать, не готовя дома.", label: "Ресторан", noun: "ресторан", emoji: "🍽", genres: ["еда"], weather: ["any"] },
  { test: (t) => t.amenity === "cinema", kind: "cinema", pitch: "Можно посмотреть что-то из текущего проката на большом экране.", label: "Кинотеатр", noun: "кинотеатр", emoji: "🎞", genres: ["драма", "фантастика"], weather: ["any"] },
  { test: (t) => t.amenity === "theatre", kind: "theatre", pitch: "Посмотри афишу — возможно, сегодня есть спектакль.", label: "Театр", noun: "театр", emoji: "🎭", genres: ["литература", "драма"], weather: ["any"] },
  { test: (t) => t.tourism === "museum" || t.tourism === "gallery", kind: "museum", pitch: "Хороший способ провести пару часов в тепле и узнать что-то новое.", label: "Музей", noun: "музей", emoji: "🏛", genres: ["прогулки", "литература"], weather: ["any"] },
  { test: (t) => t.leisure === "escape_game", kind: "quest", pitch: "Командное приключение на час — лучше идти компанией от двух человек.", label: "Квест", noun: "квест-комната", emoji: "🔐", genres: ["квесты", "приключения"], weather: ["any"] },
  { test: (t) => t.leisure === "bowling_alley", kind: "bowling", pitch: "Простое развлечение для компании, опыт не нужен.", label: "Боулинг", noun: "боулинг", emoji: "🎳", genres: ["спорт", "активный отдых"], weather: ["any"] },
  { test: (t) => t.sport === "climbing" || t.leisure === "sports_centre" || t.leisure === "fitness_centre", kind: "sport", pitch: "Можно размяться и сбросить напряжение после дня.", label: "Спорт", noun: "спортивный центр", emoji: "🧗", genres: ["спорт", "активный отдых"], weather: ["any"] },
  { test: (t) => t.leisure === "park" || t.leisure === "garden", kind: "park", pitch: "Подходит для прогулки, пробежки или пикника в хорошую погоду.", label: "Парк", noun: "парк", emoji: "🌳", genres: ["прогулки", "активный отдых"], weather: ["sun", "cloud"] },
];

const CUISINE = {
  coffee_shop: "кофейня", italian: "итальянская", japanese: "японская", sushi: "суши", pizza: "пицца", burger: "бургеры",
  georgian: "грузинская", russian: "русская", chinese: "китайская", asian: "азиатская", french: "французская",
  american: "американская", mexican: "мексиканская", indian: "индийская", thai: "тайская", vietnamese: "вьетнамская",
  korean: "корейская", uzbek: "узбекская", caucasian: "кавказская", european: "европейская", seafood: "морепродукты",
  vegetarian: "вегетарианская", vegan: "веганская", steak_house: "стейки", bakery: "выпечка", regional: "региональная",
};

// "Mo-Fr 10:00-22:00; Sa,Su off" → "пн–пт 10:00–22:00; сб, вс выходной"
const DAYS_RU = { Mo: "пн", Tu: "вт", We: "ср", Th: "чт", Fr: "пт", Sa: "сб", Su: "вс", PH: "праздники" };
export function humanHours(raw) {
  if (!raw) return "";
  if (raw.trim() === "24/7") return "круглосуточно";
  return raw
    .replace(/\b(Mo|Tu|We|Th|Fr|Sa|Su|PH)\b/g, (d) => DAYS_RU[d])
    .replace(/(\S)-(\S)/g, "$1–$2")
    .replace(/,(?=\S)/g, ", ")
    .replace(/\boff\b/g, "выходной")
    .replace(/\bclosed\b/g, "закрыто");
}

function placeCard(el, lat, lng) {
  const t = el.tags || {};
  const kind = PLACE_KINDS.find((k) => k.test(t));
  const plat = el.lat ?? el.center?.lat;
  const plng = el.lon ?? el.center?.lon;
  if (!kind || !t.name || plat == null) return null;
  const dist = haversine(lat, lng, plat, plng);
  const address = [t["addr:street"], t["addr:housenumber"]].filter(Boolean).join(", ");
  const cuisine = (t.cuisine || "").split(";").map((c) => CUISINE[c.trim()]).filter(Boolean);
  const hours = humanHours(t.opening_hours);

  const sentences = [`${kind.label} в ${fmtDist(dist)} от тебя${address ? `, по адресу ${address}` : ""}.`];
  if (cuisine.length) sentences.push(`Кухня: ${cuisine.join(", ")}.`);
  if (t.description) sentences.push(clip(t.description, 120).replace(/[^.!?…]$/, "$&."));
  if (t.outdoor_seating === "yes") sentences.push("Есть летняя веранда.");
  if (t.wheelchair === "yes") sentences.push("Есть доступ для колясок.");
  if (t.fee === "no" || kind.kind === "park") sentences.push("Вход свободный.");
  sentences.push(kind.pitch);

  const site = t.website || t["contact:website"];
  return {
    id: `osm-${el.type}-${el.id}`,
    cat: "place",
    ...STYLE.place,
    emoji: kind.emoji,
    catLabel: kind.label,
    title: t.name,
    desc: sentences.join(" "),
    tag: `${fmtDist(dist)}${hours ? ` · ${hours.length > 28 ? "часы в подсказке" : hours}` : ""}`,
    hint: hours ? `Часы работы: ${hours}` : site ? "Часы работы уточни на сайте заведения" : "Часы работы в OpenStreetMap не указаны",
    action: "Открыть в картах",
    url: `https://yandex.ru/maps/?pt=${plng},${plat}&z=17&l=map&text=${encodeURIComponent(t.name)}`,
    site: site || undefined,
    openingHours: t.opening_hours || undefined,
    genres: kind.genres,
    weather: kind.weather,
    lat: plat,
    lng: plng,
    distM: dist,
    placeKind: kind.kind,
    source: "OpenStreetMap",
  };
}

export async function fetchPlaces(lat, lng, radius = 2000) {
  const key = `places:${lat.toFixed(3)}:${lng.toFixed(3)}:${radius}`;
  return cached(key, 6 * HOUR, async () => {
    const a = `(around:${radius},${lat},${lng})`;
    const q = `[out:json][timeout:25];(
      nwr["amenity"~"^(cafe|bar|pub|restaurant|cinema|theatre)$"]["name"]${a};
      nwr["tourism"~"^(museum|gallery)$"]["name"]${a};
      nwr["leisure"~"^(park|garden|escape_game|bowling_alley|sports_centre)$"]["name"]${a};
      nwr["sport"="climbing"]["name"]${a};
    );out center tags 400;`;
    // все зеркала параллельно — берём первый успешный ответ
    const data = await Promise.any(
      OVERPASS.map((url) => getJson(url, { method: "POST", body: new URLSearchParams({ data: q }) }, 20000))
    ).catch(() => {
      throw new Error("Overpass недоступен");
    });
    return pickPlaces(data.elements || [], lat, lng);
  });
}

export function pickPlaces(elements, lat, lng) {
  const all = elements.map((e) => placeCard(e, lat, lng)).filter(Boolean);
  // ближайшие, но не больше 3 одного типа — чтобы колода была разнообразной
  all.sort((x, y) => x.distM - y.distM);
  const perKind = {};
  const seen = new Set();
  return all
    .filter((c) => {
      if (seen.has(c.title)) return false;
      perKind[c.placeKind] = (perKind[c.placeKind] || 0) + 1;
      if (perKind[c.placeKind] > 3) return false;
      seen.add(c.title);
      return true;
    })
    .slice(0, 18);
}

// ─── Игры и скидки: Steam ────────────────────────────────────────────────────
const STEAM_GENRES = {
  "Инди": "инди", "Ролевые игры": "rpg", "Симуляторы": "симуляторы", "Экшены": "экшн",
  "Приключенческие игры": "приключения", "Стратегии": "стратегии", "Казуальные игры": "уют",
  "Гонки": "спорт", "Спортивные игры": "спорт",
};

async function steamDetails(appid) {
  return cached(`steam:${appid}`, 24 * HOUR, async () => {
    const d = await getJson(`https://store.steampowered.com/api/appdetails?appids=${appid}&cc=ru&l=russian`);
    return d?.[appid]?.success ? d[appid].data : null;
  });
}

function fmtDate(ts) {
  return new Date(ts * 1000).toLocaleDateString("ru-RU", { day: "numeric", month: "long" });
}

export async function fetchSteam() {
  return cached("steam:featured", 3 * HOUR, async () => {
    const f = await getJson("https://store.steampowered.com/api/featuredcategories?cc=ru&l=russian");
    const ids = new Set();
    const pick = (list) => (list?.items || []).filter((i) => i.type === 0 && !ids.has(i.id) && ids.add(i.id));
    const specials = pick(f.specials).slice(0, 10);
    // популярные за 2 недели (SteamSpy) с долей положительных отзывов от 85%
    const spy = await getJson("https://steamspy.com/api.php?request=top100in2weeks").catch(() => ({}));
    const games = Object.values(spy)
      .filter((g) => g.positive >= 3000 && g.positive / (g.positive + g.negative) >= 0.85 && !ids.has(g.appid) && ids.add(g.appid))
      .sort(() => Math.random() - 0.5)
      .slice(0, 14)
      .map((g) => ({ id: g.appid, reviews: { pos: g.positive, neg: g.negative } }));

    const build = async (item, isSale) => {
      const d = await steamDetails(item.id).catch(() => null);
      // только игры с описанием на русском и без контента «для взрослых»
      const adult = (d?.content_descriptors?.ids || []).some((x) => x === 1 || x === 3 || x === 4);
      if (!d || adult || !hasCyr(d.short_description)) return null;
      const genres = (d.genres || []).map((g) => g.description);
      const platforms = [d.platforms?.windows && "ПК", d.platforms?.mac && "Mac", d.platforms?.linux && "Linux"].filter(Boolean).join(" / ");
      const price = d.is_free ? "Бесплатно" : item.final_price ? rub(item.final_price) : d.price_overview?.final ? rub(d.price_overview.final) : "";
      const meta = d.metacritic?.score;
      const r = item.reviews;
      const hint = isSale
        ? `Было ${rub(item.original_price)}, сейчас ${rub(item.final_price)}${item.discount_expiration ? ` — до ${fmtDate(item.discount_expiration)}` : ""}`
        : r
          ? `${Math.round((100 * r.pos) / (r.pos + r.neg))}% положительных из ${(r.pos + r.neg).toLocaleString("ru-RU")} отзывов в Steam`
          : meta
          ? `Оценка Metacritic — ${meta} из 100`
          : d.release_date?.date
            ? `Дата выхода: ${d.release_date.date}`
            : `Разработчик: ${(d.developers || []).join(", ")}`;
      return {
        id: `steam-${item.id}`,
        cat: isSale ? "sale" : "game",
        ...(isSale ? { ...STYLE.sale, emoji: "🏷", catLabel: "Скидка" } : STYLE.game),
        title: isSale ? `${d.name} −${item.discount_percent}%` : d.name,
        desc: clip(d.short_description, 230),
        tag: [genres[0], platforms, price].filter(Boolean).join(" · "),
        hint,
        action: "Открыть в Steam",
        url: `https://store.steampowered.com/app/${item.id}/`,
        image: d.header_image || item.large_capsule_image,
        genres: ["игры", ...genres.map((g) => STEAM_GENRES[g]).filter(Boolean)],
        weather: ["rain", "cloud", "snow", "storm", "fog"],
        source: "Steam",
      };
    };
    const [sales, rest] = await Promise.all([
      Promise.all(specials.map((s) => build(s, true))),
      Promise.all(games.map((g) => build(g, false))),
    ]);
    return [...sales.filter(Boolean).slice(0, 6), ...rest.filter(Boolean).slice(0, 8)];
  });
}

// ─── Фильмы: TMDB (нужен TMDB_API_KEY или v4 Read Access Token) ──────────────
const TMDB_GENRES = {
  28: ["Боевик", "экшн"], 12: ["Приключения", "приключения"], 16: ["Мультфильм", "комедия"], 35: ["Комедия", "комедия"],
  80: ["Криминал", "детективы"], 99: ["Документальный", "саморазвитие"], 18: ["Драма", "драма"], 10751: ["Семейный", "уют"],
  14: ["Фэнтези", "фантастика"], 36: ["История", "драма"], 27: ["Ужасы", "экшн"], 10402: ["Музыка", "музыка"],
  9648: ["Детектив", "детективы"], 10749: ["Мелодрама", "романтика"], 878: ["Фантастика", "фантастика"],
  53: ["Триллер", "экшн"], 10752: ["Военный", "драма"], 37: ["Вестерн", "приключения"],
};

export async function fetchFilms(tmdbKey) {
  if (!tmdbKey) return null;
  return cached("tmdb:films", 6 * HOUR, async () => {
    const bearer = tmdbKey.length > 40;
    const call = (path) =>
      getJson(
        `https://api.themoviedb.org/3${path}${path.includes("?") ? "&" : "?"}language=ru-RU&region=RU${bearer ? "" : `&api_key=${tmdbKey}`}`,
        bearer ? { headers: { Authorization: `Bearer ${tmdbKey}` } } : {}
      );
    const page = 1 + Math.floor(Math.random() * 5);
    const [trend, top] = await Promise.all([call("/trending/movie/week"), call(`/movie/top_rated?page=${page}`)]);
    const seen = new Set();
    const movies = [...(trend.results || []).slice(0, 10), ...(top.results || []).slice(0, 8)].filter(
      (m) => m.overview && !seen.has(m.id) && seen.add(m.id)
    );
    const trendIds = new Set((trend.results || []).map((m) => m.id));
    return movies.map((m) => {
      const g = (m.genre_ids || []).map((id) => TMDB_GENRES[id]).filter(Boolean);
      const year = (m.release_date || "").slice(0, 4);
      return {
        id: `tmdb-${m.id}`,
        cat: "film",
        ...STYLE.film,
        title: m.title,
        desc: clip(m.overview, 230),
        tag: [g[0]?.[0], year, m.vote_average ? `★ ${m.vote_average.toFixed(1)}` : ""].filter(Boolean).join(" · "),
        hint: trendIds.has(m.id)
          ? `В трендах TMDB на этой неделе, оценка ${m.vote_average.toFixed(1)} по ${m.vote_count} голосам`
          : `Один из самых высоко оценённых фильмов на TMDB: ${m.vote_average.toFixed(1)} из 10`,
        action: "Найти на Кинопоиске",
        url: `https://www.kinopoisk.ru/index.php?kp_query=${encodeURIComponent(m.title)}`,
        image: m.backdrop_path ? `https://image.tmdb.org/t/p/w780${m.backdrop_path}` : m.poster_path ? `https://image.tmdb.org/t/p/w500${m.poster_path}` : undefined,
        genres: [...new Set(g.map((x) => x[1]))],
        weather: ["any"],
        source: "TMDB",
      };
    });
  });
}

// ─── Книги: Google Books (с ключом) или Open Library ─────────────────────────
const BOOK_SUBJECTS = [
  { gb: "detective", ol: "detective and mystery stories", genre: "детективы", label: "Детектив" },
  { gb: "science fiction", ol: "science fiction", genre: "фантастика", label: "Фантастика" },
  { gb: "fantasy", ol: "fantasy", genre: "фантастика", label: "Фэнтези" },
  { gb: "romance", ol: "love", genre: "романтика", label: "Роман о любви" },
  { gb: "self-help", ol: "self-help", genre: "саморазвитие", label: "Нон-фикшн" },
  { gb: "classics", ol: "classic literature", genre: "литература", label: "Классика" },
];


async function googleBooks(key) {
  const lists = await Promise.all(
    BOOK_SUBJECTS.map(async (s) => {
      const d = await getJson(
        `https://www.googleapis.com/books/v1/volumes?q=subject:${encodeURIComponent(s.gb)}&langRestrict=ru&printType=books&orderBy=relevance&maxResults=10&key=${key}`
      );
      return (d.items || [])
        .map((it) => it.volumeInfo && { ...it.volumeInfo, _id: it.id, _s: s })
        .filter((v) => v && v.description && hasCyr(v.title))
        .slice(0, 2);
    })
  );
  return lists.flat().map((v) => ({
    id: `gb-${v._id}`,
    cat: "book",
    ...STYLE.book,
    title: `«${v.title}»`,
    desc: clip(v.description, 230),
    tag: [v._s.label, v.pageCount ? `${v.pageCount} стр` : ""].filter(Boolean).join(" · "),
    hint: [v.authors?.join(", "), v.publishedDate?.slice(0, 4)].filter(Boolean).join(", "),
    action: "Найти книгу",
    url: `https://www.litres.ru/search/?q=${encodeURIComponent(v.title)}`,
    image: v.imageLinks?.thumbnail?.replace("http://", "https://"),
    genres: [v._s.genre, "литература"],
    weather: ["rain", "cloud", "snow", "storm", "fog"],
    source: "Google Books",
  }));
}

async function openLibrary() {
  const fields = "key,title,author_name,cover_i,ratings_average,ratings_count,first_publish_year,number_of_pages_median,editions,editions.title,editions.language";
  const lists = await Promise.all(
    BOOK_SUBJECTS.map(async (s) => {
      const d = await getJson(
        `https://openlibrary.org/search.json?q=${encodeURIComponent(`subject:"${s.ol}" language:rus`)}&lang=ru&sort=rating&limit=12&fields=${fields}`
      );
      return (d.docs || [])
        .map((doc) => {
          const ed = doc.editions?.docs?.find((e) => hasCyr(e.title));
          const title = hasCyr(doc.title) ? doc.title : ed?.title;
          return title ? { ...doc, ruTitle: title, _s: s } : null;
        })
        .filter((b) => b && (b.ratings_count || 0) >= 20)
        .sort(() => Math.random() - 0.5)
        .slice(0, 2);
    })
  );
  const seen = new Set();
  return lists.flat().filter((b) => !seen.has(b.key) && seen.add(b.key)).map((b) => {
    const author = b.author_name?.[0];
    const sentences = [
      `${author ? `Книга автора ${author}` : "Книга"}${b.first_publish_year ? `, впервые изданная в ${b.first_publish_year} году` : ""}.`,
    ];
    if (b.ratings_average)
      sentences.push(`Средняя оценка читателей Open Library — ${b.ratings_average.toFixed(1)} из 5 (${b.ratings_count} ${plural(b.ratings_count, "оценка", "оценки", "оценок")}).`);
    if (b.number_of_pages_median) sentences.push(`Объём — около ${b.number_of_pages_median} страниц.`);
    return {
      id: `ol-${b.key.split("/").pop()}`,
      cat: "book",
      ...STYLE.book,
      title: `«${b.ruTitle}»`,
      desc: sentences.join(" "),
      tag: ["Книга", b.number_of_pages_median ? `${b.number_of_pages_median} стр` : "", b.ratings_average ? `★ ${b.ratings_average.toFixed(1)}` : ""].filter(Boolean).join(" · "),
      hint: b.title !== b.ruTitle ? `В оригинале — «${b.title}»` : "Есть издание на русском языке",
      action: "Найти книгу",
      url: `https://www.litres.ru/search/?q=${encodeURIComponent(b.ruTitle)}`,
      image: b.cover_i ? `https://covers.openlibrary.org/b/id/${b.cover_i}-L.jpg` : undefined,
      genres: [b._s.genre, "литература"],
      weather: ["rain", "cloud", "snow", "storm", "fog"],
      source: "Open Library",
    };
  });
}

export async function fetchBooks(googleKey) {
  return cached(`books:${googleKey ? "gb" : "ol"}`, 12 * HOUR, async () => {
    if (googleKey) {
      try {
        const r = await googleBooks(googleKey);
        if (r.length) return r;
      } catch {
        /* упадём на Open Library */
      }
    }
    return openLibrary();
  });
}

// ─── Всё вместе ──────────────────────────────────────────────────────────────
export async function fetchAllCards({ lat, lng, tmdbKey, googleBooksKey, only }) {
  const all = {
    places: () => (lat != null && lng != null ? fetchPlaces(lat, lng) : Promise.resolve(null)),
    steam: () => fetchSteam(),
    films: () => fetchFilms(tmdbKey),
    books: () => fetchBooks(googleBooksKey),
  };
  const jobs = Object.fromEntries(Object.entries(all).filter(([k]) => !only || k === only).map(([k, f]) => [k, f()]));
  const names = Object.keys(jobs);
  const results = await Promise.allSettled(Object.values(jobs));
  const cards = [];
  const sources = {};
  results.forEach((r, i) => {
    const name = names[i];
    if (r.status === "fulfilled") {
      sources[name] = r.value ? { ok: true, count: r.value.length } : { ok: false, reason: name === "films" ? "нет TMDB_API_KEY" : "нет геолокации" };
      if (r.value) cards.push(...r.value);
    } else {
      sources[name] = { ok: false, reason: String(r.reason?.message || r.reason) };
      console.warn(`[content] ${name}: ${sources[name].reason}`);
    }
  });
  return { cards, sources };
}
