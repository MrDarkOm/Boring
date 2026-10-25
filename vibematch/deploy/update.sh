#!/usr/bin/env bash
# Обновить сайт на сервере до последней версии ветки и перезапустить.
# Запуск на сервере: bash /opt/boring/vibematch/deploy/update.sh [ветка]
set -euo pipefail
BRANCH="${1:-claude/vigilant-brahmagupta-zr2qoy}"
cd "$(dirname "$0")/.."
git fetch origin "$BRANCH"
git checkout -q "$BRANCH"
git reset -q --hard "origin/$BRANCH"
if command -v docker >/dev/null && docker compose ps -q vibematch >/dev/null 2>&1 && [ -n "$(docker compose ps -q vibematch)" ]; then
  docker compose up -d --build            # вариант с Docker
else
  npm ci --no-audit --no-fund               # вариант с systemd
  npm run build
  sudo systemctl restart vibematch
fi
echo "Готово: $(git log -1 --format='%h %s')"
