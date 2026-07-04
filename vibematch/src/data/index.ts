import type { Card, Category, Mood, Weather } from "../types";
import { t, getLocale, type Locale } from "../i18n";
import { GENRES, PEOPLE_SLUGS, TIME_SLUGS } from "./slugs";

// Category palette (single source of truth for card colors).
// Labels are getters so they always resolve in the current locale.
export const CAT_META: Record<string, { color: string; bg: string; label: string; emoji: string }> = {
  film:     { color: "#A78BFA", bg: "#150A26", get label() { return t("cat.film"); },     emoji: "🎬" },
  place:    { color: "#34D399", bg: "#021910", get label() { return t("cat.place"); },    emoji: "📍" },
  sale:     { color: "#FB7185", bg: "#1D040B", get label() { return t("cat.sale"); },     emoji: "🏷" },
  book:     { color: "#FBBF24", bg: "#1A1002", get label() { return t("cat.book"); },     emoji: "📚" },
  game:     { color: "#38BDF8", bg: "#02131D", get label() { return t("cat.game"); },     emoji: "🎮" },
  food:     { color: "#FB923C", bg: "#1C0D01", get label() { return t("cat.food"); },     emoji: "🍜" },
  activity: { color: "#2DD4BF", bg: "#011714", get label() { return t("cat.activity"); }, emoji: "🏃" },
};

// ─── Static catalog: geo-independent cards only ──────────────────────────────
// Location-bound content (places, deals, nearby food) comes exclusively from
// real data (OSM/TMDB) merged in useCards. Copy is authored per locale.

interface Copy {
  title: string;
  desc: string;
  tag: string;
  hint: string;
}

interface StaticDef {
  id: number;
  cat: Category;
  action: Parameters<typeof t>[0];
  genres: string[];
  weather: string[];
  ru: Copy;
  en: Copy;
}

const D = (
  id: number,
  cat: Category,
  action: StaticDef["action"],
  genres: string[],
  weather: string[],
  ru: [string, string, string, string],
  en: [string, string, string, string]
): StaticDef => ({
  id, cat, action, genres, weather,
  ru: { title: ru[0], desc: ru[1], tag: ru[2], hint: ru[3] },
  en: { title: en[0], desc: en[1], tag: en[2], hint: en[3] },
});

const DEFS: StaticDef[] = [
  // ── Films (offline seed; TMDB replaces/extends when configured) ───────────
  D(1, "film", "card.action.watch", ["scifi", "action"], ["any"],
    ["Дюна: Часть вторая", "Пол Атрейдес объединяется с фременами, чтобы отомстить заговорщикам, уничтожившим его семью.", "Фантастика · 2ч 46м", "Топ проката этого года"],
    ["Dune: Part Two", "Paul Atreides unites with the Fremen to seek revenge against the conspirators who destroyed his family.", "Sci-fi · 2h 46m", "This year's box-office hit"]),
  D(5, "film", "card.action.watch", ["drama", "romance"], ["rain", "cloud", "any"],
    ["Прошлые жизни", "Два человека, разлучённые в детстве, встречаются спустя 20 лет — и решают, чем могли бы быть друг другу.", "Драма · 1ч 45м", "Номинант на Оскар"],
    ["Past Lives", "Two childhood friends reunite after 20 years and face what they could have been to each other.", "Drama · 1h 45m", "Oscar nominee"]),
  D(12, "film", "card.action.watch", ["scifi", "comedy"], ["any"],
    ["Всё везде и сразу", "Владелица прачечной открывает способность прыгать между параллельными жизнями — и должна спасти все сразу.", "Фантастика · 2ч 19м", "7 Оскаров"],
    ["Everything Everywhere All at Once", "A laundromat owner discovers she can jump between parallel lives — and must save them all at once.", "Sci-fi · 2h 19m", "7 Academy Awards"]),
  D(14, "film", "card.action.watch", ["drama", "romance"], ["rain"],
    ["Достучаться до небес", "Двое смертельно больных угоняют машину с деньгами мафии и едут к морю. Культовая трагикомедия.", "Драма · 1ч 27м", "Рейтинг 8.6"],
    ["Knockin' on Heaven's Door", "Two terminally ill men steal a car full of mob money and race to see the sea. A cult tragicomedy.", "Drama · 1h 27m", "Rated 8.6"]),
  D(17, "film", "card.action.watch", ["drama"], ["rain", "cloud", "any"],
    ["Оппенгеймер", "История отца атомной бомбы: триумф науки и цена, которую пришлось заплатить миру.", "Биография · 3ч", "7 Оскаров · Нолан"],
    ["Oppenheimer", "The story of the father of the atomic bomb: science's triumph and the price the world paid.", "Biopic · 3h", "7 Oscars · Nolan"]),
  D(18, "film", "card.action.watch", ["drama", "mystery"], ["any"],
    ["Паразиты", "Бедная семья хитростью устраивается на работу к богачам. Дальше всё идёт не по плану.", "Триллер · 2ч 12м", "Первый неанглоязычный «Лучший фильм»"],
    ["Parasite", "A poor family schemes its way into working for a wealthy household. Then everything goes off the rails.", "Thriller · 2h 12m", "First non-English Best Picture"]),
  D(19, "film", "card.action.watch", ["comedy", "animation"], ["any"],
    ["Головоломка 2", "В голове взрослеющей Райли появляются новые эмоции — и первой приходит Тревожность.", "Мультфильм · 1ч 36м", "Самый кассовый мульт Pixar"],
    ["Inside Out 2", "New emotions arrive in teenage Riley's head — and Anxiety shows up first.", "Animation · 1h 36m", "Pixar's biggest hit"]),
  D(20, "film", "card.action.watch", ["scifi", "drama"], ["rain", "snow"],
    ["Интерстеллар", "Земля умирает. Бывший пилот летит сквозь червоточину искать человечеству новый дом.", "Фантастика · 2ч 49м", "Рейтинг 8.6 · Нолан"],
    ["Interstellar", "Earth is dying. A former pilot flies through a wormhole to find humanity a new home.", "Sci-fi · 2h 49m", "Rated 8.6 · Nolan"]),
  D(21, "film", "card.action.watch", ["drama", "series", "food"], ["any"],
    ["Медведь", "Шеф-повар мишленовского уровня возвращается в семейную забегаловку в Чикаго. Нервы, ножи и красота.", "Сериал · 3 сезона", "Эмми за лучшую комедию"],
    ["The Bear", "A Michelin-level chef returns to his family's sandwich shop in Chicago. Nerves, knives and beauty.", "Series · 3 seasons", "Emmy for Best Comedy"]),
  D(22, "film", "card.action.watch", ["scifi", "mystery", "series"], ["rain", "cloud", "any"],
    ["Разделение", "Сотрудники корпорации хирургически разделяют рабочую и личную память. Что происходит внутри офиса?", "Сериал · 2 сезона", "Главный сериал Apple TV+"],
    ["Severance", "Corporate employees surgically split their work and personal memories. What happens inside the office?", "Series · 2 seasons", "Apple TV+'s flagship show"]),

  // ── Books ──────────────────────────────────────────────────────────────────
  D(4, "book", "card.action.findBook", ["mystery", "literature"], ["rain", "cloud"],
    ["«Клуб убийств по четвергам»", "Четыре пенсионера в доме престарелых расследуют настоящее убийство. Уютный детектив.", "Детектив · 400 стр", "Бестселлер №1 Британии"],
    ["The Thursday Murder Club", "Four retirees in a care home investigate a real murder. A cozy mystery.", "Mystery · 400 pp", "UK #1 bestseller"]),
  D(9, "book", "card.action.findBook", ["scifi", "literature"], ["any"],
    ["«Проект «Аве Мария»", "Учёный просыпается один в космическом корабле и не помнит, зачем он здесь. Судьба Земли — на нём.", "Sci-Fi · 476 стр", "От автора «Марсианина»"],
    ["Project Hail Mary", "A scientist wakes up alone on a spaceship with no memory of why he's there. Earth's fate rests on him.", "Sci-fi · 476 pp", "By the author of The Martian"]),
  D(15, "book", "card.action.findBook", ["selfdev", "literature"], ["any"],
    ["«Атомные привычки»", "Как небольшие изменения дают потрясающие результаты. Практично и по делу.", "Нон-фикшн · 320 стр", "15 млн копий"],
    ["Atomic Habits", "How tiny changes deliver remarkable results. Practical and to the point.", "Non-fiction · 320 pp", "15M copies sold"]),
  D(32, "book", "card.action.findBook", ["literature", "comedy"], ["rain", "snow"],
    ["«Тревожные люди»", "Неудавшееся ограбление превращается в захват заложников, а потом — в самую добрую историю года.", "Роман · 380 стр", "Бакман в лучшей форме"],
    ["Anxious People", "A failed bank robbery turns into a hostage situation — and then into the kindest story of the year.", "Novel · 380 pp", "Backman at his best"]),
  D(33, "book", "card.action.findBook", ["scifi", "literature"], ["any"],
    ["«Задача трёх тел»", "Сигнал из космоса получен. Ответ человечества решит его судьбу. Первая книга культовой трилогии.", "Sci-Fi · 464 стр", "Премия Хьюго"],
    ["The Three-Body Problem", "A signal from space has been received. Humanity's answer will decide its fate. Book one of the cult trilogy.", "Sci-fi · 464 pp", "Hugo Award winner"]),
  D(35, "book", "card.action.findBook", ["literature", "romance"], ["rain", "snow", "cloud"],
    ["«Мастер и Маргарита»", "Дьявол прибывает в Москву 30-х. Перечитать классику — всегда хорошая идея.", "Классика · 480 стр", "Вечная книга"],
    ["The Master and Margarita", "The Devil arrives in 1930s Moscow. Rereading a classic is always a good idea.", "Classic · 480 pp", "A book for the ages"]),
  D(36, "book", "card.action.findBook", ["games", "literature", "selfdev"], ["any"],
    ["«Кровь, пот и пиксели»", "Как на самом деле делают видеоигры: кранчи, отмены и чудеса. 10 реальных историй.", "Нон-фикшн · 368 стр", "Для всех, кто любит игры"],
    ["Blood, Sweat, and Pixels", "How video games actually get made: crunch, cancellations and miracles. 10 true stories.", "Non-fiction · 368 pp", "For everyone who loves games"]),

  // ── Games ──────────────────────────────────────────────────────────────────
  D(7, "game", "card.action.openSteam", ["games", "indie"], ["any"],
    ["Balatro", "Покер-рогалик, от которого невозможно оторваться. Логика + удача + безумие.", "Инди · ПК / iOS", "96% в Steam"],
    ["Balatro", "A poker roguelike you can't put down. Logic + luck + madness.", "Indie · PC / iOS", "96% on Steam"]),
  D(10, "game", "card.action.openSteam", ["games", "rpg"], ["rain", "snow"],
    ["Disco Elysium", "Детектив с амнезией расследует убийство в умирающем городе. Текст как поэзия.", "RPG · ПК", "Игра десятилетия — IGN"],
    ["Disco Elysium", "An amnesiac detective investigates a murder in a dying city. Prose like poetry.", "RPG · PC", "Game of the decade — IGN"]),
  D(16, "game", "card.action.openSteam", ["games", "sims"], ["rain", "cloud"],
    ["Stardew Valley", "Построй ферму, подружись с жителями деревни, исследуй шахты. Чистый антистресс.", "Симулятор · ПК / iOS", "20+ млн копий"],
    ["Stardew Valley", "Build a farm, befriend the villagers, explore the mines. Pure anti-stress.", "Sim · PC / iOS", "20M+ copies sold"]),
  D(37, "game", "card.action.openSteam", ["games", "action", "indie"], ["any"],
    ["Hades II", "Дочь Аида против титана времени. Идеальный роглайк стал ещё лучше.", "Роглайк · ПК", "97% в Steam"],
    ["Hades II", "The daughter of Hades versus the Titan of Time. The perfect roguelike got even better.", "Roguelike · PC", "97% on Steam"]),
  D(38, "game", "card.action.openSteam", ["games", "adventure"], ["rain", "any"],
    ["It Takes Two", "Кооператив строго на двоих: пара на грани развода уменьшилась до размеров игрушек.", "Кооп · ПК / консоли", "Игра года 2021"],
    ["It Takes Two", "Strictly two-player co-op: a couple on the verge of divorce shrunk to the size of toys.", "Co-op · PC / consoles", "Game of the Year 2021"]),
  D(39, "game", "card.action.openSteam", ["games", "quests"], ["any"],
    ["Portal 2", "Порталы, чёрный юмор и лучшая головоломка всех времён. Есть отдельная кооп-кампания.", "Головоломка · ПК", "98% в Steam"],
    ["Portal 2", "Portals, dark humor and the best puzzle game of all time. Separate co-op campaign included.", "Puzzle · PC", "98% on Steam"]),
  D(40, "game", "card.action.openSteam", ["games", "indie", "adventure"], ["rain", "snow"],
    ["Hollow Knight", "Рыцарь спускается в павшее королевство насекомых. Красиво, сложно, незабываемо.", "Метроидвания · ПК", "Инди-шедевр"],
    ["Hollow Knight", "A knight descends into a fallen kingdom of insects. Beautiful, hard, unforgettable.", "Metroidvania · PC", "An indie masterpiece"]),
  D(41, "game", "card.action.openSteam", ["games", "indie", "cozy"], ["rain", "snow", "cloud"],
    ["Unpacking", "Распаковывай коробки и узнавай историю целой жизни. Медитативно и трогательно.", "Инди · 4 часа", "Идеально на вечер"],
    ["Unpacking", "Unpack boxes and piece together the story of a life. Meditative and touching.", "Indie · 4 hours", "Perfect for one evening"]),

  // ── Food (cooking at home + generic nearby/delivery) ──────────────────────
  D(42, "food", "card.action.openRecipe", ["food", "cooking", "cozy"], ["rain", "snow", "cloud"],
    ["Приготовить рамен дома", "Бульон, яйцо, лапша и час времени — домашний рамен лучше ресторанного.", "Рецепт · ~60 мин", "Проще, чем кажется"],
    ["Make ramen at home", "Broth, an egg, noodles and an hour — homemade ramen beats the restaurant kind.", "Recipe · ~60 min", "Easier than it looks"]),
  D(43, "food", "card.action.openRecipe", ["food", "cooking"], ["any"],
    ["Паста карбонара", "Классика из 4 ингредиентов за 20 минут. Без сливок — как в Риме.", "Рецепт · 20 мин", "Ужин за 20 минут"],
    ["Pasta carbonara", "A 4-ingredient classic in 20 minutes. No cream — the Roman way.", "Recipe · 20 min", "Dinner in 20 minutes"]),
  D(44, "food", "card.action.openRecipe", ["food", "cooking", "cozy"], ["any"],
    ["Шакшука на завтрак", "Яйца в томатном соусе с перцем и специями. Завтрак, ради которого встаёшь.", "Рецепт · 25 мин", "Идеально в выходной"],
    ["Shakshuka for breakfast", "Eggs in tomato sauce with peppers and spices. A breakfast worth getting up for.", "Recipe · 25 min", "Perfect on a day off"]),
  D(45, "food", "card.action.openRecipe", ["food", "cooking"], ["rain", "snow"],
    ["Домашняя пицца", "Тесто с вечера, соус из томатов, любые топпинги. Веселее с компанией.", "Рецепт · 40 мин", "Дети в восторге"],
    ["Homemade pizza", "Overnight dough, tomato sauce, any toppings you like. More fun with friends.", "Recipe · 40 min", "Kids love it"]),
  D(46, "food", "card.action.findNearby", ["food", "delivery"], ["sun", "any"],
    ["Поке-боул с лососем", "Свежий, лёгкий и красивый ужин. Доставка или ближайший поке-бар.", "Доставка · ~30 мин", "Полезно и сытно"],
    ["Salmon poke bowl", "A fresh, light and beautiful dinner. Order in or find the nearest poke bar.", "Delivery · ~30 min", "Healthy and filling"]),
  D(48, "food", "card.action.openRecipe", ["food", "cooking", "cozy"], ["rain", "snow"],
    ["Синнабоны с корицей", "Испечь булочки с корицей — квартира будет пахнуть счастьем до вечера.", "Рецепт · 90 мин", "Вечер станет уютнее"],
    ["Cinnamon rolls", "Bake cinnamon rolls — the whole place will smell like happiness till evening.", "Recipe · 90 min", "Instant coziness"]),
  D(49, "food", "card.action.findNearby", ["food", "coffee", "breakfast"], ["sun", "cloud", "any"],
    ["Бранч в новом месте", "Найди кафе с бранчами рядом: сырники, бенедикт и фильтр-кофе.", "Рядом · До 16:00", "Выходной начинается так"],
    ["Brunch somewhere new", "Find a brunch café nearby: pancakes, eggs benedict and filter coffee.", "Nearby · Till 4pm", "That's how weekends start"]),

  // ── Activities (geo-independent, resolved via nearby search) ──────────────
  D(50, "activity", "card.action.findNearby", ["sport", "outdoor", "walks"], ["sun", "cloud"],
    ["Пробежка 5 км", "Классические 5 км: разминка, ровный темп, растяжка. Трекер в руки — и вперёд.", "5 км · ~30 мин", "Лучше утром или на закате"],
    ["5K run", "The classic 5K: warm up, steady pace, stretch. Grab a tracker and go.", "5 km · ~30 min", "Best in the morning or at sunset"]),
  D(51, "activity", "card.action.findNearby", ["sport", "cozy"], ["any"],
    ["Йога-класс для начинающих", "Час растяжки и дыхания. Коврики дают, опыт не нужен.", "Рядом · 60 мин", "Первое занятие часто бесплатно"],
    ["Beginner yoga class", "An hour of stretching and breathing. Mats provided, no experience needed.", "Nearby · 60 min", "First class is often free"]),
  D(52, "activity", "card.action.findNearby", ["outdoor", "sport"], ["rain", "snow", "any"],
    ["Батутный центр", "Час прыжков сжигает 600 ккал и возвращает в детство. Есть поролоновая яма.", "Рядом · 60 мин", "Веселье гарантировано"],
    ["Trampoline park", "An hour of jumping burns 600 kcal and brings back childhood. Foam pit included.", "Nearby · 60 min", "Fun guaranteed"]),
  D(53, "activity", "card.action.findNearby", ["outdoor", "adventure"], ["any"],
    ["Картинг", "Гонки на настоящей трассе: шлем, машина, 10 минут адреналина.", "Рядом · заезд 10 мин", "Устрой чемпионат с друзьями"],
    ["Go-karting", "Racing on a real track: helmet, kart, 10 minutes of adrenaline.", "Nearby · 10-min heats", "Host a championship with friends"]),
  D(54, "activity", "card.action.findNearby", ["sport", "cozy"], ["any"],
    ["Бассейн: свободное плавание", "Дорожки, тишина под водой, сауна после. Лучший способ разгрузить голову.", "Рядом · Сеанс 45 мин", "Возьми шапочку"],
    ["Lap swimming", "Lanes, underwater quiet, sauna after. The best way to clear your head.", "Nearby · 45-min session", "Bring a swim cap"]),
  D(55, "activity", "card.action.findNearby", ["outdoor", "music"], ["any"],
    ["Урок танцев: бачата", "Открытый урок для новичков — пары не нужны, кроссовки подойдут.", "Рядом · 90 мин", "По пятницам вечером"],
    ["Bachata dance class", "An open class for beginners — no partner needed, sneakers are fine.", "Nearby · 90 min", "Friday evenings"]),
  D(56, "activity", "card.action.findNearby", ["outdoor", "walks", "sport"], ["sun", "cloud"],
    ["Велопрокат + парк", "Взять велик и проехать большой круг по парку. Час свободы.", "Рядом · ~60 мин", "Сезон открыт"],
    ["Bike rental + park", "Rent a bike and do the big loop around the park. An hour of freedom.", "Nearby · ~60 min", "The season is on"]),
];

export function getStaticCards(locale: Locale = getLocale()): Card[] {
  return DEFS.map((d) => {
    const copy = d[locale];
    const meta = CAT_META[d.cat];
    return {
      id: d.id,
      cat: d.cat,
      emoji: meta.emoji,
      catLabel: meta.label,
      title: copy.title,
      desc: copy.desc,
      tag: copy.tag,
      hint: copy.hint,
      color: meta.color,
      bg: meta.bg,
      action: t(d.action),
      genres: d.genres,
      weather: d.weather,
      source: "static",
    };
  });
}

export const MOODS: Mood[] = [
  { id: "lazy",   emoji: "😴", get label() { return t("mood.lazy"); },   get sub() { return t("mood.lazy.sub"); } },
  { id: "active", emoji: "🚀", get label() { return t("mood.active"); }, get sub() { return t("mood.active.sub"); } },
  { id: "calm",   emoji: "🧘", get label() { return t("mood.calm"); },   get sub() { return t("mood.calm.sub"); } },
  { id: "social", emoji: "🎉", get label() { return t("mood.social"); }, get sub() { return t("mood.social.sub"); } },
];

// Slug values; render with t(`people.${p}`) / t(`time.${t}`)
export const PEOPLE: string[] = [...PEOPLE_SLUGS];
export const TIMES: string[] = [...TIME_SLUGS];

// Curated onboarding genre picker (subset of all feature slugs)
export const ALL_GENRES: string[] = GENRES.filter((g) =>
  [
    "scifi", "drama", "romance", "comedy", "mystery", "action", "series", "animation",
    "games", "indie", "rpg", "quests", "sims", "adventure",
    "literature", "selfdev",
    "sport", "outdoor", "walks",
    "coffee", "cozy", "bars", "music",
    "food", "cooking", "delivery",
  ].includes(g)
);

export const WEATHERS: Weather[] = [
  { id: "sun",   emoji: "☀", get label() { return t("weather.sun"); },   temp: 22, get desc() { return t("weather.sun.desc"); } },
  { id: "cloud", emoji: "⛅", get label() { return t("weather.cloud"); }, temp: 17, get desc() { return t("weather.cloud.desc"); } },
  { id: "rain",  emoji: "🌧", get label() { return t("weather.rain"); },  temp: 13, get desc() { return t("weather.rain.desc"); } },
  { id: "snow",  emoji: "❄", get label() { return t("weather.snow"); },  temp: -3, get desc() { return t("weather.snow.desc"); } },
  { id: "storm", emoji: "⛈", get label() { return t("weather.storm"); }, temp: 10, get desc() { return t("weather.storm.desc"); } },
  { id: "fog",   emoji: "🌫", get label() { return t("weather.fog"); },   temp: 8,  get desc() { return t("weather.fog.desc"); } },
];
