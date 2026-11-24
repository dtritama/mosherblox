#!/usr/bin/env bash
# Runs ON THE VPS (started by `npm run deploy`): build, back up, migrate, restart, check.
set -euo pipefail
# One deploy at a time.
exec 9>/opt/mosherblox/.deploy.lock
flock -n 9 || { echo "Another deploy is still running. Wait for it to finish."; exit 1; }
cd /opt/mosherblox/app
compose() { docker compose --env-file /opt/mosherblox/.env -f deploy/compose.yml "$@"; }

# Made once and kept: changing it breaks pages that are open during the next deploy.
if ! grep -q '^NEXT_SERVER_ACTIONS_ENCRYPTION_KEY=.' /opt/mosherblox/.env; then
  echo "NEXT_SERVER_ACTIONS_ENCRYPTION_KEY=$(openssl rand -base64 32)" >> /opt/mosherblox/.env
fi

echo "== Checking the Caddy config"
docker run --rm -v "$PWD/deploy/Caddyfile:/etc/caddy/Caddyfile:ro" caddy:2-alpine caddy validate --config /etc/caddy/Caddyfile --adapter caddyfile >/dev/null 2>/tmp/caddy-check.log || { cat /tmp/caddy-check.log; exit 1; }

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
# The Caddyfile is a mounted file: a new copy only reaches Caddy through a restart.
compose restart caddy

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
compose ps --format "table {{.Service}}\t{{.Status}}"
for service in postgres app worker caddy; do
  id=$(compose ps -q "$service")
  state=$(docker inspect -f '{{.State.Status}} {{.RestartCount}}' "${id:-none}" 2>/dev/null || echo missing)
  if [ "$state" != "running 0" ]; then
    echo "!! $service is not healthy ($state):"
    compose logs --no-log-prefix --tail 20 "$service"
    exit 1
  fi
done
curl -fsS -m 20 -o /dev/null https://mosherblox.com/id || { echo "!! https://mosherblox.com/id does not answer"; exit 1; }
echo "== Done: https://mosherblox.com"
