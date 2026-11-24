#!/usr/bin/env bash
# Nightly backup on the VPS (cron, see docs/deploy.md): database + uploaded images, kept 14 days.
set -euo pipefail
umask 077
cd /opt/mosherblox/app
compose() { docker compose --env-file /opt/mosherblox/.env -f deploy/compose.yml "$@"; }
out=/opt/mosherblox/backups
stamp=$(date +%Y%m%d-%H%M%S)
mkdir -p "$out"

compose exec -T postgres pg_dump -U mosherblox -Fc mosherblox > "$out/db-$stamp.dump.part"
# Fails when the dump can't be read back.
compose exec -T postgres pg_restore --list < "$out/db-$stamp.dump.part" >/dev/null
mv "$out/db-$stamp.dump.part" "$out/db-$stamp.dump"

docker run --rm -v mosherblox_uploads:/u:ro postgres:17-alpine tar -C /u -czf - . > "$out/uploads-$stamp.tar.gz.part"
mv "$out/uploads-$stamp.tar.gz.part" "$out/uploads-$stamp.tar.gz"

find "$out" -type f -mtime +14 -delete
echo "backup ok: $stamp"
