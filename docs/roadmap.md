# Roadmap

## Phase 1 — Frontend ✅

Home (hero, banners, Robux section, shop, flash deals, features, how it works, FAQ, footer CTA),
`/robux` panel, `/gamepass`, `/check-order` (demo data), product checkout dialog, i18n id/en,
design kit, Figma foundations + components.

## Phase 2 — Backend + manual QRIS (next)

Order of work (each step ends with `npm run check` and a browser test):

1. **Repo hygiene** — `git init`, first commit, `.env` handling (`.env.example` up to date).
2. **Database** — Postgres (local via Docker Compose), Drizzle schema + migrations:
   `orders`, `order_events` (audit log / status history), `payments` (amount, unique code, proof,
   provider, provider event id), `settings` (prices, QRIS image, expiry), `users` (later), `admins`.
3. **Order domain** (`src/server/orders`) — create order (server-side price via
   `lib/robux-pricing.ts` + `lib/validation.ts`), status machine
   `pending → paid → processing → completed | failed | expired`, lookup by ID + WhatsApp.
   Swap `orderService` to the real implementation (server actions). Rate-limit lookups.
4. **Manual QRIS payment** — checkout shows the owner's QRIS + exact total with unique code,
   countdown to expiry, "Saya sudah bayar" + optional proof upload (validate type/size, store
   outside `public/`). `PaymentProvider` interface with `manual-qris` as the first provider.
5. **Admin** (`/admin`) — login (admin accounts only), order list with filters, order detail,
   mark paid / processing / completed / failed with a note, settings (prices, QRIS, expiry).
6. **Notifications + jobs** — worker with pg-boss: expire unpaid orders, Discord webhook on new
   paid order, (later) WhatsApp to the buyer.
7. **Deploy** — Dockerfile (Next.js `output: "standalone"`), docker-compose (app, worker, postgres,
   caddy), GitHub Actions build → GHCR → deploy on the VPS, Cloudflare DNS for mosherblox.com,
   nightly DB backup. Set `NEXT_PUBLIC_SITE_URL=https://mosherblox.com`.

## Phase 3 — Growth

- Payment gateway (Duitku or Midtrans) as a second `PaymentProvider`, signed + idempotent webhooks.
- Optional customer login (Better Auth: Google + OTP) with order history.
- Auto delivery for Robux via Send Username (`FulfillmentProvider`, manual fallback, ToS check).
- Monthly Send Username limit enforced per Roblox account.
- Figma: finish the Screens page.
