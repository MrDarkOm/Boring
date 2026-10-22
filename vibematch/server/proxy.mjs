// Локальный сервер Вайбматча. Ключи читаются из .env и не попадают в клиент.
//   GET  /api/cards?lat=&lng=[&only=places|steam|films|books] — реальные карточки
//   POST /api/ai-tip           — подсказка от Claude
//
// Запуск:  node server/proxy.mjs   (или npm run server)
// Требует Node 18+ (встроенный fetch).

import http from "node:http";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { fetchAllCards } from "./content.mjs";

// --- читаем .env вручную (без зависимостей) ---------------------------------
const __dirname = dirname(fileURLToPath(import.meta.url));
const env = {};
try {
  const raw = readFileSync(join(__dirname, "..", ".env"), "utf8");
  for (const line of raw.split("\n")) {
    const m = line.match(/^\s*([A-Z_]+)\s*=\s*(.*)\s*$/);
    if (m) env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
} catch {
  console.warn("[proxy] .env не найден — скопируй .env.example в .env");
}

const API_KEY = env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_API_KEY;
const PORT = Number(env.PROXY_PORT || process.env.PROXY_PORT || 8787);

const TMDB_KEY = env.TMDB_API_KEY || process.env.TMDB_API_KEY;
const GOOGLE_BOOKS_KEY = env.GOOGLE_BOOKS_API_KEY || process.env.GOOGLE_BOOKS_API_KEY;

if (!API_KEY) console.warn("[proxy] Нет ANTHROPIC_API_KEY — AI-подсказки выключены");
if (!TMDB_KEY) console.warn("[proxy] Нет TMDB_API_KEY — фильмы будут из встроенной подборки");

const server = http.createServer(async (req, res) => {
  // CORS для dev
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  if (req.method === "OPTIONS") { res.writeHead(204); res.end(); return; }

  const url = new URL(req.url, "http://localhost");

  if (req.method === "GET" && url.pathname === "/api/cards") {
    const num = (k) => (url.searchParams.has(k) && Number.isFinite(Number(url.searchParams.get(k))) ? Number(url.searchParams.get(k)) : null);
    try {
      const data = await fetchAllCards({ lat: num("lat"), lng: num("lng"), tmdbKey: TMDB_KEY, googleBooksKey: GOOGLE_BOOKS_KEY, only: url.searchParams.get("only") });
      res.writeHead(200, { "Content-Type": "application/json; charset=utf-8" });
      res.end(JSON.stringify(data));
    } catch (e) {
      res.writeHead(500, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: String(e) }));
    }
    return;
  }

  if (req.method === "POST" && url.pathname === "/api/ai-tip") {
    if (!API_KEY) {
      res.writeHead(503, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ tip: null, error: "no key" }));
      return;
    }
    let body = "";
    req.on("data", (c) => (body += c));
    req.on("end", async () => {
      try {
        const { liked, disliked, context, weather } = JSON.parse(body || "{}");
        const r = await fetch("https://api.anthropic.com/v1/messages", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-api-key": API_KEY,
            "anthropic-version": "2023-06-01",
          },
          body: JSON.stringify({
            model: "claude-sonnet-4-20250514",
            max_tokens: 100,
            system:
              "Ты помощник Вайбматча. Одна короткая фраза по-русски (макс 2 предложения). Без приветствий.",
            messages: [
              {
                role: "user",
                content: `Понравилось: ${(liked || []).join(", ") || "ничего"}. Не понравилось: ${(disliked || []).join(", ") || "ничего"}. Вайб: ${context?.mood}, ${context?.people}, ${context?.time}. Погода: ${weather}.`,
              },
            ],
          }),
        });
        const data = await r.json();
        const tip = data?.content?.find((b) => b.type === "text")?.text || "";
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ tip }));
      } catch (e) {
        res.writeHead(500, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: String(e) }));
      }
    });
    return;
  }

  res.writeHead(404);
  res.end("Not found");
});

server.listen(PORT, () => {
  console.log(`[proxy] слушаю http://localhost:${PORT}  → /api/cards, /api/ai-tip`);
});
