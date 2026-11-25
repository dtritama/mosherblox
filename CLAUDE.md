# MOSHERBLOX

Roblox-only top-up store (Robux, Gamepass, Roblox Premium, gift cards, in-game items) for an
Indonesian audience. Freelance project: Devan builds it for a client. Target domain: mosherblox.com.

- Phase 1 — frontend: **done** (this repo).
- Phase 2 — backend inside this Next.js app + manual QRIS payment + admin: **next**. See `docs/roadmap.md`.
- History, decisions and client answers: `docs/decisions.md`. Read it before changing product behaviour.

@AGENTS.md

## Commands

```bash
npm run dev          # http://localhost:3000 → redirects to /id
npm run check        # typecheck + lint + build — run before saying a change is done
npm run typecheck | lint | lint:fix | format | build
npm run tokens       # regenerate design/tokens.json from src/app/globals.css
npm run db:up        # local Postgres 17 in Docker on port 5433 (5432 is taken on Devan's Mac)
npm run db:generate  # after editing src/server/db/schema.ts → new SQL file in drizzle/
npm run db:migrate   # apply migrations (drizzle-kit reads .env.local via @next/env)
npm run db:seed      # reset the 4 dev sample orders (refuses non-local databases)
npm run admin:create -- --email you@example.com --name "Name" [--role owner|staff]  # asks password; resets if exists
npm run worker       # background worker (expire unpaid orders, Discord pings) — run next to `npm run dev`
npm run worker:build # bundle → dist/worker.mjs, run with: node --conditions=react-server dist/worker.mjs
npm run db:studio | db:down
npm run deploy       # update https://mosherblox.com on the VPS — see docs/deploy.md
```

Node ≥ 20.9 (`.nvmrc` = 22). Must keep working on Windows and macOS (no bash-only npm scripts).
If CSS changes don't show up in dev, stop the server and delete `.next` (Turbopack cache).

## Stack

Next.js **16.4.6** (App Router, `src/`), React 19.3, TypeScript strict, Tailwind CSS v4 (tokens in
`@theme` inside `src/app/globals.css`, no tailwind.config), Motion 14 (`motion/react`), Poppins
self-hosted with `next/font/local` (`src/app/fonts`), lucide-react icons, simple-icons for brand
icons (Discord). PostgreSQL + Drizzle ORM (`postgres` driver, `drizzle-kit` migrations in `drizzle/`). Prettier + prettier-plugin-tailwindcss, ESLint 9 flat config.

### Next.js 16 specifics used here (not like older Next.js — read `node_modules/next/dist/docs/` first)

- `cacheComponents` + `partialPrefetching` are on (`next.config.ts`). Route segments are kept alive
  hidden with React `<Activity>` → **never reuse a DOM id across pages** (e.g. `#robux` on home vs
  `#robux-panel` on /robux, `passes-${slug}`).
- Anything reading params/searchParams/cookies must sit under `<Suspense>` (instant navigation).
  `new Date()` in a Server Component breaks prerendering — avoid it there.
- `src/proxy.ts` (not `middleware.ts`): locale redirect + rewrites unknown gamepass games to a real 404.
- Locale comes from `next/root-params` (`getI18n()`), `generateStaticParams` for `[lang]`,
  global `PageProps` / `LayoutProps` types.
- CSP + security headers are in `next.config.ts`; fonts/images are local — don't add third-party
  origins without updating the CSP.

## Architecture

```
src/
  app/[lang]/          pages: / (home), /robux, /gamepass, /gamepass/[game], /check-order,
                       /design-kit (dev only, 404 in prod unless DESIGN_KIT=1), not-found, error
  components/          layout/ sections/ robux/ checkout/ orders/ topup/ gamepass/ ui/ design-kit/
  config/site.ts       name, nav, contact (Discord, WhatsApp, WA group), ui show/hide flags
  data/                ALL content lives here: products, gamepasses, banners, payments, robux pricing
  i18n/                id (default, source of truth) + en; dictionaries/*.ts
  lib/                 pure logic: validation, robux-pricing, catalog, contact, orders/*
  server/db/           Drizzle schema + getDb() (server-only; import only from server code)
  server/orders/       order domain: quote (server pricing), service (create/find/transition), actions
  server/auth/         admin login: scrypt hashes (password-hash.mjs, shared with scripts), DB sessions
  server/admin/        admin read models (orders list/detail) + admin server actions
  server/jobs/         pg-boss queue names/options + enqueue() (web app only sends jobs)
  server/notify/       Discord webhook messages (Roblox account + avatar, amount; no WhatsApp/contact data)
  worker/index.mts     background worker process (schedules + job handlers)
  app/admin/           admin panel (own root layout, Indonesian only, noindex, `instant = false`)
  proxy.ts
design/                tokens.json, screens/*.png, README (Figma)
scripts/export-tokens.mjs
drizzle/               generated SQL migrations — commit them, never edit applied ones
docker-compose.yml     local Postgres
Dockerfile, deploy/    production (VPS): compose, Caddy, deploy + backup scripts — docs/deploy.md
```

Rules:

- **Content = data files.** Prices, products, banners, payment methods, Robux tiers/limits are edited
  in `src/data/*`, never hard-coded in components. **Exception — admin settings**
  (`/admin/settings`, owner only) can override Robux tiers, the QRIS (image/merchant/NMID), the
  payment window and **stock** (sold-out Robux methods / products): `lib/settings.ts` (types, defaults = `src/data/*`, validation),
  `server/settings.ts` (`getSiteSettings()` = `"use cache"` + tag `settings` for pages,
  `getFreshSettings()` for pricing/creating orders; DB down → defaults, so builds work without a DB).
  The `[lang]` layout passes rates + QRIS to client components via `SettingsProvider` /
  `useStoreSettings()`; pricing functions take `rates` as an optional last argument. Saves call
  `updateTag("settings")`. Uploaded QRIS images live in `UPLOAD_DIR/qris`, served by
  `app/payments/qris/[file]` (immutable cache). The QR is rendered `unoptimized` (exact pixels).
- **Home content** (`/admin/content`, owner only): banners, contact links, FAQ and section texts, each
  in id + en (empty en → id for FAQ/banner alt, built-in text for section texts). `lib/site-content.ts`
  (types, `TEXT_GROUPS` = the editable dictionary paths, shared validation), `server/site-content.ts`
  (`getSiteContent()` cached, tag `content`), `server/admin/content-actions.ts`. Defaults stay in code;
  only edits are stored (`settings` table, `content.*` keys). Texts/FAQ are laid over the dictionary
  in `getI18n()` / `getContentDictionary()`, so components keep reading `dict.*`; contact comes from
  `useStoreSettings().contact` / `getSiteContent()` — never read `siteConfig.contact` in components.
  Uploaded banners: `UPLOAD_DIR/banners`, served by `app/banners/[file]`. To make another text
  editable, add its path to `TEXT_GROUPS` (not texts with {placeholders}).
- **Transfer payments** (`/admin/payments`, owner edits, staff view; table `payment_methods`, max 20):
  brands + logos in `data/payment-brands.ts` (`public/payments/logos`, Wikimedia SVGs; DANA and
  ShopeePay have name badges), shared validation `lib/payment-methods.ts`, `server/payment-methods.ts`
  (`getPaymentOptions()` cached, tag `payment-methods`, no account numbers; `resolveCheckoutPayment()`
  fresh), `server/admin/payment-actions.ts`. An order copies the account into `payments.pay_to`, so
  edits/deletes never change existing orders; buyers get the number only with their order
  (`PaymentStep`). Own logos: `UPLOAD_DIR/payment-logos`, served by `app/payments/logo/[file]`, never deleted.
- **Validation & pricing are pure functions** (`lib/validation.ts`, `lib/robux-pricing.ts`) so the
  phase-2 server reuses them. The server must recompute every price — never trust a client total.
- **Orders go through `orderService`** (`lib/orders/service.ts`) → Server Actions
  (`server/orders/actions.ts`) → domain (`server/orders/service.ts`, `quote.ts`). The browser sends
  only choices (method, amount, product slug, option id, payment id) — **never a price**; the server
  re-validates, prices from `src/data/*`, adds a random unique code (`data/orders.ts`) and returns
  error codes, not rows. Status changes only via `transitionOrder()` (checks `lib/orders/status.ts`,
  locks the row, writes `order_events`). Lookup needs order ID **and** WhatsApp; pending orders past
  `expires_at` expire on lookup. Lookups/creates are rate-limited per IP (`server/rate-limit.ts`,
  in-memory: one instance only). Dev sample orders: `npm run db:seed` (`MB-PEND2026`, `MB-PROC2026`,
  `MB-DONE2026`, `MB-FAIL2026`, WhatsApp `081234567890`), listed on /check-order in dev only.
  Payment: manual QRIS (`server/payments/provider.ts`, image + merchant in `data/payments.ts`
  `manualQris`). After checkout and on Check Order a pending order shows `PaymentStep` (QR or transfer account, exact
  total, countdown, "Saya sudah bayar" + optional screenshot → payment `submitted`; only an admin
  marks it paid). **Live progress:** an open order (Check Order, success screen) polls `POST /api/order-live`
  every 6 s (`lib/orders/use-live-order.ts`; own rate limits, WhatsApp in the body). **Recent orders:** the success screen remembers the order on the device
  (`lib/orders/recent-orders.ts`, localStorage, max 5, 30 days) and sets `?order=MB-…` in the URL;
  a page loaded with it goes to Check Order (`components/orders/resume-order.tsx`), which opens a
  remembered order by itself and lists them ("Pesanan terakhir kamu"). Proofs go to `UPLOAD_DIR` (default `storage/uploads`, git-ignored, never public).
- **Admin panel** (`/admin`): every page, action and route calls `requireAdmin()` / `getAdmin()`
  itself (DAL pattern). Sessions: random token in an httpOnly cookie (`__Host-mb_admin` in prod),
  only its SHA-256 stored in `admin_sessions` (12 h). Login rate-limited per IP and per email.
  Status changes go through `transitionOrder()` with `expectedFrom` (stale clicks are refused) and
  notes on failed and completed orders are shown to the buyer on Check Order (`Order.adminNote`;
  completing prefills a thank-you, `order_events.buyer_note` keeps older completed notes private), all other notes are
  admin-only; they also update the payment (paid → confirmed + who, failed-from-pending → rejected). Proof images
  only via `/admin/proofs/[paymentId]` (no-store, nosniff, sandbox CSP). **Bukti pengiriman:** on
  a paid/processing/completed order the admin can add up to 6 / remove screenshots that the
  Robux / item was sent (`components/admin/delivery-proof.tsx`, `deliveryProofAction`, column
  `orders.delivery_proofs`; one image per action call). Stored as random UUID names in `UPLOAD_DIR/delivery`, served by
  `app/orders/delivery/[file]` (the unguessable name is the key; it only reaches the buyer through
  a Check Order lookup) and shown on Check Order. `/admin` is skipped by
  `proxy.ts` (no locale) and disallowed in robots. The order list updates itself: `components/admin/live-orders.tsx` polls
  `/admin/orders-version` (newest `order_events` row) every 5 s while visible and refreshes on change,
  so every order change must write an order event. **CSV export** ("Export CSV" → `/admin/orders-export`, any admin): columns in
  `copy.ts` `export.columns`, dates in WIB, `lib/csv.ts` (BOM, `;` by default for Indonesian Excel, formula-safe cells). Copy lives in `app/admin/copy.ts`.
- **Background jobs** (pg-boss in the `pgboss` schema of the same Postgres): the worker
  (`src/worker/index.mts`) runs `orders.expire` every minute (`expireOverdueOrders()`; never expires
  an order whose buyer pressed "Saya sudah bayar") and `notify.discord` (retries with backoff).
  The web app only enqueues, via `after()` so a queue problem never slows or breaks a buyer's
  request. First "Saya sudah bayar" → Discord ping; `DISCORD_NOTIFY_NEW_ORDERS=1` adds new-order
  pings; `DISCORD_MENTION_ROLE_IDS` / `DISCORD_MENTION_USER_IDS` (comma-separated Discord role / user IDs) are tagged in the "Saya sudah
  bayar" ping only. `DISCORD_WEBHOOK_URL` is a secret (only in `.env.local` / server env). The worker reuses
  `server-only` code, so it runs with Node's `--conditions=react-server` (tsx in dev, esbuild bundle
  in prod; `pg-boss` is in `serverExternalPackages`).
- **Roblox account check:** username fields (Robux panel, product dialog for username delivery)
  show `RobloxAccountCheck` — display name + avatar via `server/roblox/*` (Roblox public APIs,
  cached 1 h, rate-limited) and a required "Ya, ini akun Roblox saya" (`confirmedAccount`). The
  order action looks the account up again on the server: unknown username → refused
  (`robloxNotFound`); found → stores canonical `account`, `roblox_user_id`, `roblox_display_name`;
  Roblox unreachable → order still allowed. Avatars come from `tr.rbxcdn.com` (in the CSP).
- **Open / closed = pre-order** (`storeOpen` setting, switch in the admin header; text = `closedMessage`): closed →
  buyers can still order and pay, as a **pre-order** (`orders.is_preorder`): `StoreClosedNotice` (fixed pre-order info
  + owner's text) on Robux page/home/product dialog, required `PreorderConsent`, "Pre-order" buttons. The server decides
  from the fresh setting: closed without `acceptedPreorder` → `storeClosed` (a page opened before then shows the consent);
  open → normal order. Marked on Check Order (`PreorderNote`), Discord, CSV and in admin (badge + "Pre-order" tab =
  paid/claimed pre-orders not finished). Sold-out and stock rules still apply.
- **Robux stock** (`robuxStock` setting, admin): shown on the Robux page/home; 0 = every Robux
  method sold out; bigger orders are refused (`notEnoughStock`); completing a Robux order subtracts
  its amount inside `transitionOrder()`. **Public stats / leaderboard / reviews** are cached
  (`server/stats.ts` tag `stats`, `server/leaderboard.ts`, `server/reviews.ts` tag `reviews`) and
  refreshed by admin actions (`updateTag`). Counter = real completed Send Username orders (always
  shown). Leaderboard = completed orders only, all time, masked names (`lib/mask.ts`), no voucher
  products. Reviews: one per completed order (Check Order, order ID + WhatsApp), shown only after
  admin approval in `/admin/reviews`; home shows 9 per page (`sections/review-pages.tsx`, more from `GET /api/reviews?page=`); the home sections hide themselves while empty — never add
  placeholder or invented reviews/numbers.
- Order IDs: `MB-` + 8 chars from an unambiguous alphabet (`lib/orders/order-id.ts`).
- Server Components by default; `"use client"` only for interactivity. Motion via `LazyMotion` +
  `m.*` components, `MotionConfig reducedMotion="user"`.
- Shared checkout pieces in `components/checkout/` (Step, Field, SummaryRow, PaymentPicker,
  OrderSuccess) are used by both the Robux panel and the product dialog — reuse them.
- Robux icon comes from one component: `components/ui/robux-icon.tsx` — the official Robux symbol
  (Wikimedia Commons "Robux 2019 Logo gold.svg", public-domain shape, Roblox trademark). `tone="gold"`
  (default, Roblox's gradient) or `tone="ink"` (currentColor) on lime buttons/panels. Don't redraw it.

## i18n

- Bahasa Indonesia is default (`/id`), English at `/en`. `id.ts` is the source of truth; `en.ts` is
  typed against it (`Dictionary = Widen<typeof id>`) so a missing key is a type error.
- Server: `getI18n()`. Client: `useI18n()`. Placeholders: `interpolate(str, { key })`.
  Numbers: `formatNumber(n, locale)`; money: `formatIDR(n)` (always IDR).
- Every user-facing string goes in **both** dictionaries.

## Design system (client-approved — keep it)

- Theme: white + **lime green** (`brand-*`, logo green `#a5e34a` = brand-400) + **soft pink** accents
  (`blush-*`), dark text `ink-*`. Pink is an accent only — the client rejected "too much pink".
- Highlighted heading words: `.text-highlight` = lime fill, dark ink outline, pink underline.
  **No gradient text.**
- **Dark mode** (store and /admin, one shared choice; admin uses `ThemeButton` in its header and login): `<html data-theme="dark">`, light is the default; the
  choice is saved in localStorage `mb.theme` and applied before paint by `THEME_SCRIPT`
  (`components/layout/theme-toggle.tsx`, in the `[lang]` layout `<head>`). The toggle (navbar)
  grows the new theme in a circle from the button (View Transitions; instant under reduced motion).
  Dark works by **redefining the same tokens** in `globals.css` (`white`, `ink-*`, light `brand-*` /
  `blush-*` tints), so normal classes follow. Solid lime 300–500 stays lime. Where a colour must
  NOT flip use the fixed tokens: `text-coal` (dark text on lime), `bg-coal` (small dark badges),
  `text-snow` (white text). Use `text-snow`, never `text-white`, in store components;
  `dark:` variants for the rest.
- Primary buttons: lime background with **ink text** (`text-coal`). Radius scale: xl 12, 2xl 16, card 28, panel 32.
- Hero: centered text, two tilted "order cards" (Send Username = main/left, Gamepass = right) that
  drift; full viewport height (`min-h-svh`). Badge, stats bar and hero buttons were removed by request.
- Section eyebrow pills and hero buttons are hidden via `siteConfig.ui` flags (`showEyebrows`,
  `showHeroButtons`) — flip to bring them back.
- Footer = rounded lime panel with a CTA card + orbit animation, link columns, order-lookup box.
- Mobile first; test at 390px and 1440px. No horizontal scroll (main has `overflow-x-clip`).
- Respect `prefers-reduced-motion`. Keyboard focus visible. Real `<button>`/`<a>`, labels on inputs.
- The `taste-skill` plugin (Leonxlnx/taste-skill) may be installed for design work: where its rules
  conflict with the approved design above, keep the approved design and mention the suggestion.

## Business rules (from the client)

- **Robux via Send Username (USN / "Visend") is the main, featured method** (default in the panel,
  promoted on home). Requirements: buyer must have **2-Step Verification ON** (confirmation checkbox
  required) and be age-verified 18+ (text only); limits **5.000 Robux/day and 10.000 Robux/month per account** — daily limit = max per order.
  Monthly limit can only be enforced server-side (phase 2). Values live in `src/data/robux.ts`; the
  FAQ repeats them, so update both (the owner may have edited the FAQ in /admin/content).
- Robux via Gamepass: shows the Gamepass price to set (`ceil(robux / 0.7)`, Roblox takes 30%).
- Robux prices/tiers in `src/data/robux.ts` are **placeholders** until the client confirms.
- **Do not advertise "no password required" / "tanpa password"** — the client asked to remove it.
  (Safety hint "never share your password" and the FAQ answer are fine.)
- Checkout always collects a WhatsApp number, any country (`PhoneInput` picker, Indonesia default):
  Indonesian → `628…`, others → `+<code>…` **with the plus** (`normalizeWhatsapp`; use `whatsappDigits()` for wa.me).
- **Stock:** the owner can mark a Robux method or a product / gamepass game "Stok habis" in
  /admin/settings. It stays visible with a badge, can't be selected or bought, flash deals hide it,
  and the server refuses the order (`soldOut` error) even from a stale page. Shop "Blox Fruits"
  items and the "Blox Fruits" gamepass game are separate switches.
- Payment today = the store's own static QRIS (merchant shown to buyers: "Kautsars, Gaming") plus the
  bank / e-wallet accounts the owner adds in /admin/payments (manual transfer, confirmed by an admin).
  VA / Alfamart / Indomaret are hidden (`availability: "later"`) until a payment gateway exists.
- Contacts: Discord https://discord.gg/5Y82ZH7GgP · WhatsApp 081211980741 ·
  WA group https://chat.whatsapp.com/KqW18a2Li0YDZjwQccxHRY (in `config/site.ts`).

## Working conventions

- Run `npm run check` (typecheck + lint + build) before calling anything done; check the page in a
  browser at mobile and desktop width for UI changes; no console errors or hydration warnings.
- Keep the user's edits: read a file before rewriting it; prefer small focused edits.
- Explain changes to Devan in plain language (he relays them to the client); Indonesian UI copy
  should sound natural, casual-friendly ("kamu").
