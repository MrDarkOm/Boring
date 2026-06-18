// Минимальный прокси для Anthropic API.
// Браузер шлёт запрос на /api/ai-tip, сервер добавляет ключ из .env и
// проксирует на api.anthropic.com. Ключ никогда не попадает в клиент.
//
// Запуск:  node server/proxy.mjs   (или npm run server)
// Требует Node 18+ (встроенный fetch).

import http from "node:http";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

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

if (!API_KEY) {
  console.error("[proxy] Нет ANTHROPIC_API_KEY. Добавь его в .env");
}

const server = http.createServer(async (req, res) => {
  // CORS для dev
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  if (req.method === "OPTIONS") { res.writeHead(204); res.end(); return; }

  if (req.method === "POST" && req.url === "/api/ai-tip") {
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
  console.log(`[proxy] слушаю http://localhost:${PORT}  → /api/ai-tip`);
});
