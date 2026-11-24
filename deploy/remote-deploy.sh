#!/usr/bin/env bash
# Runs ON THE VPS (started by `npm run deploy`): build, back up, migrate, restart, check.
set -euo pipefail
cd /opt/mosherblox/app
compose() { docker compose --env-file /opt/mosherblox/.env -f deploy/compose.yml "$@"; }

echo "== Building (a few minutes on this small server)"
docker image inspect mosherblox-app:latest >/dev/null 2>&1 && docker tag mosherblox-app:latest mosherblox-app:previous
docker image inspect mosherblox-tools:latest >/dev/null 2>&1 && docker tag mosherblox-tools:latest mosherblox-tools:previous
# One at a time: 2 GB RAM. The second build reuses the first one's layers.
compose build app
compose build worker

echo "== Database"
compose up -d --wait postgres
if [ -n "$(compose exec -T postgres psql -U mosherblox -d mosherblox -Atc "select 1 from pg_tables where tablename='orders'")" ]; then
  /opt/mosherblox/app/deploy/backup.sh
fi
compose run --rm -T tools npx drizzle-kit migrate

echo "== Starting"
compose up -d --wait app
compose up -d worker caddy
compose exec -T caddy caddy reload --config /etc/caddy/Caddyfile >/dev/null 2>&1 || true

# Pages are prerendered with the built-in prices; refresh them with the saved settings right away.
sleep 62
for path in /id /en /id/robux /en/robux /id/gamepass /en/gamepass /id/check-order /en/check-order; do
  for _ in 1 2; do
    compose exec -T app node -e "fetch('http://127.0.0.1:3000$path').then(r=>r.text()).catch(()=>{})"
    sleep 1
  done
done

docker image prune -f >/dev/null
docker builder prune -f --filter until=168h >/dev/null
compose ps
echo "== Done"
