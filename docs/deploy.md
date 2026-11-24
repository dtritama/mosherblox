# Deploy (VPS)

Live: https://mosherblox.com — Biznet Gio NEO Lite SS 2.2 (Ubuntu 24.04, 103.127.135.122), domain at
Rumahweb, DNS at Cloudflare. Everything runs in Docker: Caddy (HTTPS) → Next.js app, worker, Postgres.

## Update the live site

Commit and push as usual (GitHub keeps the code; pushing does **not** deploy), then from the Mac:

```bash
DEPLOY_KEY=~/.ssh/id_ed25519_dtritama npm run deploy
```

It sends the project (uncommitted changes too, never `.env*` or uploads), builds on the VPS, backs up
the database, runs new migrations, restarts and refreshes the pages. Add this to `~/.ssh/config` to
skip `DEPLOY_KEY`:

```
Host 103.127.135.122
  User mosherblox
  IdentityFile ~/.ssh/id_ed25519_dtritama
  IdentitiesOnly yes
```

## On the server

`ssh -i ~/.ssh/id_ed25519_dtritama mosherblox@103.127.135.122`, then
`cd /opt/mosherblox/app` and use:

```bash
alias mb='docker compose --env-file /opt/mosherblox/.env -f deploy/compose.yml'
mb ps                      # what is running
mb logs --tail 100 app     # or worker, caddy, postgres
mb restart app
```

- **Admin account** (create or reset a password; asks for it hidden, at least 12 characters):
  `mb run --rm -it tools npm run admin:create -- --email admin@mosherblox.com --name Admin --role owner`
- **Secrets**: `/opt/mosherblox/.env` (only the server user can read it). After editing:
  `mb up -d app worker`. Don't change `POSTGRES_PASSWORD` there: Postgres keeps the old one.
- **Never** run `db:seed` here, and never `mb down -v` (deletes the database and uploads).

## Roll back the code

```bash
docker tag mosherblox-app:previous mosherblox-app:latest
docker tag mosherblox-tools:previous mosherblox-tools:latest
mb up -d app worker
```

(Database migrations are not undone.)

## Backups

Every night at 03:15 and before each deploy: `/opt/mosherblox/backups` (database + uploads, 14 days).
They are on the **same server**; copy them off it now and then:

```bash
scp -i ~/.ssh/id_ed25519_dtritama "mosherblox@103.127.135.122:/opt/mosherblox/backups/*" ./backups/
```

Restore a database dump (replaces the current data):

```bash
mb stop app worker
mb exec -T postgres pg_restore -U mosherblox -d mosherblox --clean --if-exists < /opt/mosherblox/backups/db-….dump
mb up -d app worker
```

## Server basics

Firewall (ufw): 22, 80, 443 only. SSH: key only, no root. Security updates install automatically.
4 GB swap. Caddy trusts `CF-Connecting-IP` only from Cloudflare's addresses (`deploy/Caddyfile`).
