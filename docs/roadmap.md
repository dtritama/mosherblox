# Roadmap

## Phase 1 — Frontend ✅

Home (hero, banners, Robux section, shop, flash deals, features, how it works, FAQ, footer CTA),
`/robux` panel, `/gamepass`, `/check-order` (demo data), product checkout dialog, i18n id/en,
design kit, Figma foundations + components.

## Phase 2 — Backend + manual QRIS (next)

Order of work (each step ends with `npm run check` and a browser test):

1. ✅ **Repo hygiene** — `git init`, first commit, `.env` handling (`.env.example` up to date).
2. ✅ **Database** — Postgres (local via Docker Compose), Drizzle schema + migrations:
   `orders`, `order_events` (audit log / status history), `payments` (amount, unique code, proof,
   provider, provider event id), `settings` (prices, QRIS image, expiry), `users` (later), `admins`.
   Done: `src/server/db/schema.ts`, `drizzle/0000_init.sql`. Guards in the DB: total =
   subtotal + fee + unique code, no two _pending_ orders with the same total, robux/product fields.
3. ✅ **Order domain** (`src/server/orders`) — create order (server-side price via
   `lib/robux-pricing.ts` + `lib/validation.ts`), status machine
   `pending → paid → processing → completed | failed | expired`, lookup by ID + WhatsApp.
   Swap `orderService` to the real implementation (server actions). Rate-limit lookups.
   Done: `src/server/orders/*`, `lib/orders/status.ts`, `npm run db:seed`. Rate limit is in-memory
   (fine for one VPS instance; move to Postgres/Redis if the app ever runs twice).
4. ✅ **Manual QRIS payment** — checkout shows the owner's QRIS + exact total with unique code,
   countdown to expiry, "Saya sudah bayar" + optional proof upload (validate type/size, store
   outside `public/`). `PaymentProvider` interface with `manual-qris` as the first provider.
   Done: `src/server/payments/*`, `components/checkout/qris-payment.tsx` (QR, exact amount, countdown,
   save-QR for phones, "Saya sudah bayar" + screenshot). Checkout offers QRIS only (e-wallets pay it).
5. ✅ **Admin** (`/admin`) — login (admin accounts only), order list with filters, order detail,
   mark paid / processing / completed / failed with a note, settings (prices, QRIS, expiry).
   Done: `/admin` (login, order list with "Perlu dicek" to-do filter + search, order detail with
   proof screenshot, history and status changes with notes), `npm run admin:create`.
   Settings (`/admin/settings`, owner only): Robux price tiers per method, QRIS image + merchant
   name + NMID (checked in the browser before saving), payment window in minutes, stock switches ("Stok habis") per Robux method / product. Product /
   gamepass prices are still edited in `src/data/*` (a later CMS step if the client needs it).
6. ✅ **Notifications + jobs** — worker with pg-boss: expire unpaid orders, Discord webhook on new
   paid order, (later) WhatsApp to the buyer.
   Done: `src/worker` (`npm run worker`), expire job every minute, Discord ping when a buyer presses
   "Saya sudah bayar" (optional ping for every new order). WhatsApp to the buyer is still later
   (needs a WhatsApp API provider — cost/approval to decide with the client).
7. **Deploy** — Dockerfile (Next.js `output: "standalone"`), docker-compose (app, worker, postgres,
   caddy), GitHub Actions build → GHCR → deploy on the VPS, Cloudflare DNS for mosherblox.com,
   nightly DB backup. Set `NEXT_PUBLIC_SITE_URL=https://mosherblox.com`.

## Phase 2.5 — Trust & social features ✅ (2026-11-21)

Roblox account check at checkout (display name + avatar, "ini akun saya"), Robux stock (admin,
auto-decreasing), real "pesanan berhasil" counter, buyer reviews (after completion, admin-approved),
all-time leaderboard per category (masked names). Later: weekly/monthly leaderboard periods.

## Phase 3 — Growth

- Payment gateway (Duitku or Midtrans) as a second `PaymentProvider`, signed + idempotent webhooks.
- Optional customer login (Better Auth: Google + OTP) with order history.
- Auto delivery for Robux via Send Username (`FulfillmentProvider`, manual fallback, ToS check).
- Monthly Send Username limit enforced per Roblox account.
- Figma: finish the Screens page.
