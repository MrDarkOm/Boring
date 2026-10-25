# Задание для Claude на VPS: развернуть Вайбматч на https://boring.omlet.space

Ты работаешь на VPS владельца. Нужно запустить приложение из этого репозитория
так, чтобы оно открывалось с телефона по адресу **https://boring.omlet.space**.
Подробные варианты описаны в `vibematch/DEPLOY.md`, а здесь — конкретный план.

## Что разворачиваем

- Репозиторий: `https://github.com/mrdarkom/boring`, ветка
  **`claude/vigilant-brahmagupta-zr2qoy`** (не `main` — в `main` другая версия
  приложения, которая требует Supabase).
- Приложение лежит в `vibematch/`. Это один Node-процесс
  (`vibematch/server/proxy.mjs`, без npm-зависимостей в рантайме): отдаёт
  собранный сайт из `vibematch/dist/` и API `/api/cards`, `/api/ai-tip`,
  `/healthz`. Слушает `127.0.0.1:8787`.
- Перед ним — веб-сервер с HTTPS. На этом сервере, судя по прошлой настройке,
  стоит **openresty**, и он уже обслуживает `boring.omlet.space` как статику
  (каталог вроде `/var/www/boring`). Его нужно перевести на reverse proxy к
  `127.0.0.1:8787`.

## Правила

- Сначала осмотрись и покажи владельцу, что нашёл: какой веб-сервер слушает
  80/443 (`sudo ss -ltnp`), где лежит конфиг `boring.omlet.space`, откуда
  берётся сертификат, есть ли Node/Docker.
- Не ломай другие сайты на сервере. Перед правкой любого конфига сделай копию
  (`cp file file.bak.$(date +%F)`) и проверяй синтаксис (`openresty -t` /
  `nginx -t`) до перезагрузки.
- Не ставь Caddy, если 80/443 уже заняты openresty/nginx.
- Сертификат для домена, скорее всего, уже есть — переиспользуй его. Если нет —
  certbot (`certbot certonly --webroot` или плагин nginx).
- Ключи (`.env`) не коммить и не выводи в чат целиком.

## Шаги

1. **Node 22** (если `node -v` ниже 18):
   ```bash
   curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
   sudo apt install -y nodejs git
   ```

2. **Код:**
   ```bash
   sudo mkdir -p /opt/boring && sudo chown "$USER" /opt/boring
   git clone -b claude/vigilant-brahmagupta-zr2qoy https://github.com/mrdarkom/boring.git /opt/boring
   cd /opt/boring/vibematch
   npm ci && npm run build
   ```

3. **Ключи:** `cp .env.example .env`, спроси у владельца и впиши
   `TMDB_API_KEY` (фильмы) и, по желанию, `ANTHROPIC_API_KEY` (AI-подсказки),
   `GOOGLE_BOOKS_API_KEY`. Без ключей приложение тоже работает: места, игры,
   скидки и книги не требуют ключей. `chmod 600 .env`.

4. **Сервис systemd:** возьми `deploy/vibematch.service`. Поменяй
   `User=` на пользователя, которому принадлежит `/opt/boring` (или дай
   `www-data` права на чтение, включая `.env`). Затем:
   ```bash
   sudo cp deploy/vibematch.service /etc/systemd/system/
   sudo systemctl daemon-reload && sudo systemctl enable --now vibematch
   curl -s http://127.0.0.1:8787/healthz   # должно быть: ok
   ```
   (Альтернатива — `docker compose up -d --build` в `vibematch/`, если Docker
   уже используется на сервере.)

5. **openresty / nginx:** в server-блоке `boring.omlet.space` (443) замени
   раздачу статики (`root ...; try_files ...`) на проксирование, как в
   `deploy/nginx.conf`:
   ```nginx
   location / {
       proxy_pass http://127.0.0.1:8787;
       proxy_http_version 1.1;
       proxy_set_header Host $host;
       proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
       proxy_set_header X-Forwarded-Proto $scheme;
       proxy_read_timeout 60s;
   }
   ```
   Блоки `ssl_certificate` и редирект с 80 на 443 оставь как есть. Проверь
   конфиг и перезагрузи веб-сервер.

6. **Проверка снаружи:**
   ```bash
   curl -s https://boring.omlet.space/healthz                       # ok
   curl -s https://boring.omlet.space/ | head -5                     # <!doctype html>
   curl -s "https://boring.omlet.space/api/cards?only=steam" | head -c 300
   curl -s "https://boring.omlet.space/api/cards?only=places&lat=55.751&lng=37.618" | head -c 300
   ```
   Для мест сервер должен достучаться до OpenStreetMap:
   `curl -sI https://overpass-api.de/api/status`. Если места пустые — смотри
   `journalctl -u vibematch -n 50`.

7. **Автообновление.** Скрипт `deploy/update.sh` подтягивает ветку,
   пересобирает и перезапускает сервис. Чтобы его можно было вызывать без
   пароля:
   ```bash
   echo "$USER ALL=(root) NOPASSWD: /usr/bin/systemctl restart vibematch" | sudo tee /etc/sudoers.d/vibematch
   ```
   Для автодеплоя по пушу workflow `.github/workflows/deploy-vibematch.yml`
   ждёт секреты репозитория `DEPLOY_HOST`, `DEPLOY_USER`, `DEPLOY_SSH_KEY`
   (`DEPLOY_PORT` — по желанию). Подскажи владельцу, какие значения вписать;
   для ключа создай отдельную пару `ssh-keygen -t ed25519 -f ~/.ssh/gh_deploy`
   и добавь публичную часть в `~/.ssh/authorized_keys`.

   Важно: в ветке `main` есть другой workflow (`deploy.yml`), который по пушу в
   `main` делает rsync статики в каталог сайта. После перехода на proxy он
   ничего не ломает, но и не нужен — скажи об этом владельцу.

## Готово, когда

- `https://boring.omlet.space` открывается с телефона, геолокация
  запрашивается, на вкладке «Карта» есть реальные места рядом;
- «Ещё» → «Источники данных» показывает зелёные статусы (фильмы — если
  добавлен `TMDB_API_KEY`);
- `systemctl status vibematch` — active, сервис переживает перезагрузку
  (`enabled`).
