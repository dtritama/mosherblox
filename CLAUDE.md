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
npm run db:studio | db:down
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
  proxy.ts
design/                tokens.json, screens/*.png, README (Figma)
scripts/export-tokens.mjs
drizzle/               generated SQL migrations — commit them, never edit applied ones
docker-compose.yml     local Postgres
```

Rules:

- **Content = data files.** Prices, products, banners, payment methods, Robux tiers/limits are edited
  in `src/data/*`, never hard-coded in components.
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
  `manualQris`). After checkout and on Check Order a pending order shows `QrisPayment` (QR, exact
  total, countdown, "Saya sudah bayar" + optional screenshot → payment `submitted`; only an admin
  marks it paid). Proofs go to `UPLOAD_DIR` (default `storage/uploads`, git-ignored, never public).
- Order IDs: `MB-` + 8 chars from an unambiguous alphabet (`lib/orders/order-id.ts`).
- Server Components by default; `"use client"` only for interactivity. Motion via `LazyMotion` +
  `m.*` components, `MotionConfig reducedMotion="user"`.
- Shared checkout pieces in `components/checkout/` (Step, Field, SummaryRow, PaymentPicker,
  OrderSuccess) are used by both the Robux panel and the product dialog — reuse them.
- Robux icon comes from one component: `components/ui/robux-icon.tsx` (still lucide `Coins`;
  waiting for the official Robux icon file from the client — don't hand-draw Roblox logos).

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
- Primary buttons: lime background with **ink text**. Radius scale: xl 12, 2xl 16, card 28, panel 32.
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
  required); limits **5.000 Robux/day and 10.000 Robux/month per account** — daily limit = max per order.
  Monthly limit can only be enforced server-side (phase 2). Values live in `src/data/robux.ts`; the
  FAQ repeats them, so update both.
- Robux via Gamepass: shows the Gamepass price to set (`ceil(robux / 0.7)`, Roblox takes 30%).
- Robux prices/tiers in `src/data/robux.ts` are **placeholders** until the client confirms.
- **Do not advertise "no password required" / "tanpa password"** — the client asked to remove it.
  (Safety hint "never share your password" and the FAQ answer are fine.)
- Checkout always collects a WhatsApp number (normalized to `628…`).
- Payment today = the store's own static QRIS only (merchant shown to buyers: "Kautsars, Gaming").
  VA / Alfamart / Indomaret are hidden (`availability: "later"`) until a payment gateway exists.
- Contacts: Discord https://discord.gg/5Y82ZH7GgP · WhatsApp 081211980741 ·
  WA group https://chat.whatsapp.com/KqW18a2Li0YDZjwQccxHRY (in `config/site.ts`).

## Working conventions

- Run `npm run check` (typecheck + lint + build) before calling anything done; check the page in a
  browser at mobile and desktop width for UI changes; no console errors or hydration warnings.
- Keep the user's edits: read a file before rewriting it; prefer small focused edits.
- Explain changes to Devan in plain language (he relays them to the client); Indonesian UI copy
  should sound natural, casual-friendly ("kamu").
