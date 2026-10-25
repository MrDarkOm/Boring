# Развёртывание на boring.omlet.space

Приложение — один Node-процесс (`server/proxy.mjs`): он отдаёт собранный сайт
из `dist/` и API `/api/*`. Перед ним стоит nginx или Caddy с HTTPS.

> **HTTPS обязателен.** Без него телефон не даст геолокацию, и не будет ни
> мест рядом, ни погоды.

Ниже инструкция для VPS на Ubuntu/Debian с доступом по SSH. Если
разворачивает Claude на самом сервере — дай ему файл
[`deploy/VPS_CLAUDE.md`](deploy/VPS_CLAUDE.md): там пошаговый план под
openresty, который уже обслуживает домен.

## 1. DNS

У регистратора домена добавь A-запись:

```
boring.omlet.space  →  <IP сервера>
```

(и AAAA-запись, если у сервера есть IPv6). Проверка: `ping boring.omlet.space`.

## 2. Код и ключи на сервере

```bash
sudo apt update && sudo apt install -y git
sudo mkdir -p /opt/boring && sudo chown "$USER" /opt/boring
git clone https://github.com/mrdarkom/boring.git /opt/boring
cd /opt/boring && git checkout claude/vigilant-brahmagupta-zr2qoy
cd vibematch
cp .env.example .env && nano .env   # TMDB_API_KEY, ANTHROPIC_API_KEY — по желанию
```

Если репозиторий приватный, то вместо `https://` склонируй по SSH с
deploy key (GitHub → Settings → Deploy keys).

## 3а. Запуск через Docker (проще)

```bash
curl -fsSL https://get.docker.com | sh
cd /opt/boring/vibematch
docker compose up -d --build
curl http://127.0.0.1:8787/healthz   # → ok
```

## 3б. Запуск без Docker (systemd)

```bash
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt install -y nodejs
cd /opt/boring/vibematch
npm ci && npm run build
sudo chown -R www-data /opt/boring/vibematch/.env
sudo cp deploy/vibematch.service /etc/systemd/system/
sudo systemctl daemon-reload && sudo systemctl enable --now vibematch
curl http://127.0.0.1:8787/healthz   # → ok
```

## 4. HTTPS и домен

**Вариант Caddy** (сертификат получается автоматически):

```bash
sudo apt install -y caddy
sudo cp /opt/boring/vibematch/deploy/Caddyfile /etc/caddy/Caddyfile
sudo systemctl reload caddy
```

**Вариант nginx / openresty** (если он уже стоит и занимает 80/443 —
тогда Caddy не ставь; у openresty тот же синтаксис конфига):

```bash
sudo cp /opt/boring/vibematch/deploy/nginx.conf /etc/nginx/sites-available/boring.omlet.space
sudo ln -s /etc/nginx/sites-available/boring.omlet.space /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d boring.omlet.space
```

Открой https://boring.omlet.space с телефона и разреши геолокацию.
Чтобы было похоже на приложение: «Поделиться» → «На экран „Домой“».

## 5. Обновления

Вручную на сервере:

```bash
bash /opt/boring/vibematch/deploy/update.sh
```

Автоматически при каждом пуше — через GitHub Actions
(`.github/workflows/deploy-vibematch.yml`). Добавь в репозитории секреты
**Settings → Secrets and variables → Actions**:

| Секрет | Значение |
|---|---|
| `DEPLOY_HOST` | IP сервера или `boring.omlet.space` |
| `DEPLOY_USER` | пользователь SSH |
| `DEPLOY_SSH_KEY` | приватный ключ, чей публичный ключ лежит в `~/.ssh/authorized_keys` на сервере |
| `DEPLOY_PORT` | порт SSH, если не 22 |

Для варианта systemd пользователю нужно право перезапускать сервис без пароля:

```bash
echo "$USER ALL=(root) NOPASSWD: /usr/bin/systemctl restart vibematch" | sudo tee /etc/sudoers.d/vibematch
```

## Если что-то не работает

- `journalctl -u vibematch -f` или `docker compose logs -f` — логи сервера.
- В приложении: «Ещё» → «Источники данных» показывает, какой источник не ответил.
- Места рядом не грузятся → сервер не достучался до OpenStreetMap (Overpass);
  проверь `curl -I https://overpass-api.de/api/status` с сервера.
- AI-подсказки ограничены 20 в час на один IP (`AI_LIMIT_PER_HOUR` в `.env`).
