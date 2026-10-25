// Сервер Вайбматча. Ключи читаются из .env и не попадают в клиент.
//   GET  /api/cards?lat=&lng=[&only=places|steam|films|books] — реальные карточки
//   POST /api/ai-tip           — подсказка от Claude
//   GET  /*                    — собранный фронтенд из dist/ (если есть)
//
// Разработка: npm run server (+ npm run dev)
// Продакшен:  npm run build && npm start
// Требует Node 18+ (встроенный fetch).

import http from "node:http";
import { readFileSync, existsSync, statSync, createReadStream } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join, normalize, extname, sep } from "node:path";
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
const PORT = Number(process.env.PORT || env.PORT || env.PROXY_PORT || process.env.PROXY_PORT || 8787);
const HOST = process.env.HOST || env.HOST || "127.0.0.1";
const AI_MODEL = env.AI_MODEL || process.env.AI_MODEL || "claude-sonnet-5-5";
// сколько AI-подсказок в час можно одному IP — чтобы публичный сайт не сжёг ключ
const AI_LIMIT_PER_HOUR = Number(env.AI_LIMIT_PER_HOUR || process.env.AI_LIMIT_PER_HOUR || 20);

const DIST = join(__dirname, "..", "dist");
const SERVE_STATIC = existsSync(join(DIST, "index.html"));
const MIME = {
  ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".css": "text/css; charset=utf-8",
  ".json": "application/json", ".svg": "image/svg+xml", ".png": "image/png", ".jpg": "image/jpeg",
  ".ico": "image/x-icon", ".webp": "image/webp", ".woff2": "font/woff2", ".webmanifest": "application/manifest+json",
};

function serveStatic(pathname, res) {
  let decoded;
  try {
    decoded = decodeURIComponent(pathname);
  } catch {
    decoded = "/";
  }
  // защищаемся от ../ в пути
  let file = normalize(join(DIST, decoded));
  if (!file.startsWith(DIST + sep)) file = join(DIST, "index.html");
  if (!existsSync(file) || statSync(file).isDirectory()) file = join(DIST, "index.html"); // SPA fallback
  const immutable = file.includes(`${join(DIST, "assets")}`);
  res.writeHead(200, {
    "Content-Type": MIME[extname(file)] || "application/octet-stream",
    "Cache-Control": immutable ? "public, max-age=31536000, immutable" : "no-cache",
  });
  createReadStream(file).pipe(res);
}

const aiHits = new Map();
function aiAllowed(ip) {
  const now = Date.now();
  const hits = (aiHits.get(ip) || []).filter((t) => now - t < 3600_000);
  if (hits.length >= AI_LIMIT_PER_HOUR) return false;
  hits.push(now);
  aiHits.set(ip, hits);
  return true;
}
const clientIp = (req) => String(req.headers["x-forwarded-for"] || "").split(",")[0].trim() || req.socket.remoteAddress || "";

const TMDB_KEY = env.TMDB_API_KEY || process.env.TMDB_API_KEY;
const GOOGLE_BOOKS_KEY = env.GOOGLE_BOOKS_API_KEY || process.env.GOOGLE_BOOKS_API_KEY;

if (!API_KEY) console.warn("[proxy] Нет ANTHROPIC_API_KEY — AI-подсказки выключены");
if (!TMDB_KEY) console.warn("[proxy] Нет TMDB_API_KEY — фильмы будут из встроенной подборки");

const server = http.createServer(async (req, res) => {
  // CORS нужен только в разработке; в продакшене фронтенд и API на одном домене
  if (!SERVE_STATIC) {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  }
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
    if (!aiAllowed(clientIp(req))) {
      res.writeHead(429, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ tip: null, error: "rate limit" }));
      return;
    }
    let body = "";
    req.on("data", (c) => {
      body += c;
      if (body.length > 20_000) req.destroy();
    });
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
            model: AI_MODEL,
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

  if (req.method === "GET" && url.pathname === "/healthz") {
    res.writeHead(200, { "Content-Type": "text/plain" });
    res.end("ok");
    return;
  }

  if (SERVE_STATIC && (req.method === "GET" || req.method === "HEAD") && !url.pathname.startsWith("/api/")) {
    serveStatic(url.pathname, res);
    return;
  }

  res.writeHead(404);
  res.end("Not found");
});

server.listen(PORT, HOST, () => {
  console.log(`[proxy] слушаю http://${HOST}:${PORT}  → /api/cards, /api/ai-tip${SERVE_STATIC ? ", сайт из dist/" : ""}`);
});
