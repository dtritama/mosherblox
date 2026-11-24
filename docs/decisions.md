# Decisions & history

What was decided, by whom, and why — so nobody re-litigates it. Newest first inside each section.

## Product / client requests (phase 1)

| Date       | Request                                                                                                                                       | What we did                                                                                         |
| ---------- | --------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| 2026-11-10 | Hide small UI bits ("Beli Robux / Lihat item" hero buttons, "TOP UP ROBUX" pills)                                                             | `siteConfig.ui.showHeroButtons/showEyebrows = false` (hidden, not deleted)                          |
| 2026-11-10 | Footer like a reference (rounded panel + CTA card + columns + newsletter)                                                                     | New footer; CTA card replaced the old "Siap upgrade?" section; newsletter slot = order lookup       |
| 2026-11-05 | "Change the promotion to no password required" → then clarified: **delete** it                                                                | All "tanpa password" promo copy removed; headline back to "Upgrade Roblox-mu bareng MOSHERBLOX"     |
| 2026-11-05 | Visend (Send Username) requirements: 2SV on, 5k/day, 10k/month                                                                                | Requirements box + required checkbox, per-method max, FAQ entry                                     |
| 2026-11-05 | Promote Robux USN instead of Gamepass                                                                                                         | USN first/default + "Paling laris" badge, home Robux section sells USN, hero main card = USN        |
| 2026-11-04 | Hero: text centered, transaction cards left/right behind text, tilted, moving, full screen                                                    | Done (`hero.tsx`)                                                                                   |
| 2026-11-04 | Old Robux panel back on home; new full panel on its own page                                                                                  | Home `RobuxSection` (slider, links to `/robux?method=&amount=`) + `/robux` page                     |
| 2026-11-04 | Use the real Robux icon                                                                                                                       | `RobuxIcon` component ready; **waiting for the official icon file**                                 |
| 2026-11-04 | Client to-do: (1) all Robux options in one compact panel like Golrox, (2) Check Order, (3) optional login, (4) manual Robux amount + auto IDR | (1)(4) Robux panel, (2) Check Order UI with demo data. Login + real statuses need backend → phase 2 |
| earlier    | Theme white + soft green + soft pink, Roblox-only store                                                                                       | Lime from logo `#a5e34a`, pink accents only                                                         |
| earlier    | Less pink; no gradient heading text; lime text + pink underline                                                                               | `.text-highlight` utility                                                                           |
| earlier    | Bahasa default + English                                                                                                                      | `/id` default, `/en`                                                                                |
| earlier    | Banner carousel with peek of next banner + autoplay                                                                                           | `banner-carousel.tsx` (pause button, keyboard-focus pause, reduced-motion starts paused)            |
| earlier    | FAQ contacts: Discord (real icon), clickable WhatsApp, WA group                                                                               | `config/site.ts` + `lib/contact.ts`                                                                 |
| earlier    | Gamepass page: game list → pick game → its gamepasses                                                                                         | `/gamepass`, `/gamepass/[game]` (unknown game → real 404 via proxy)                                 |

## Open questions for the client

1. Real Robux rates / tiers per method (current values are placeholders in `src/data/robux.ts`).
2. Min/max per order and whether any amount is allowed (currently min 10 — client asked 2026-11-19 —, Gamepass max 100.000, USN max 5.000).
3. Delivery time difference between Gamepass and Send Username (to show on method cards).
4. Golrox screenshot for the panel layout reference.
5. ~~Official Robux icon file~~ → done 2026-11-21: Robux symbol from Wikimedia Commons (public-domain
   shape, trademark of Roblox), used only to label Robux amounts.
6. ~~QRIS image + usaha mikro~~ → received; registered as UMI. Still to confirm: is "Kautsars, Gaming"
   the right merchant for MOSHERBLOX, or will a QRIS in the store's own name follow?
7. Unpaid-order expiry time (30 or 60 min?).
8. Does the client already own mosherblox.com?

## Architecture decisions (phase 2)

- **Trust features (2026-11-21, Devan's answers):** reviews come only from buyers of completed
  orders and are shown after admin approval (no admin-written or invented reviews); leaderboard
  shows masked usernames ("Bui•••01") + Roblox avatar, ranked on completed orders (Robux: total
  Robux; Gamepass/Items: number of orders, ties by spend), all time first; Robux stock is set by the
  owner and auto-decreases on completed Robux orders; the Send Username counter always shows the
  real number. The username hint now says "Pastikan username sesuai dengan akun Roblox kamu".

- **Jobs + notifications (step 6, 2026-11-19):** pg-boss 12.38.1 (pinned: the newest release
  was only days old). Separate worker process; the web app only enqueues. Discord pings go to the
  team's private channel when a buyer presses "Saya sudah bayar" (the moment someone must check
  the money) — not on "paid", because an admin sets that themselves. The ping carries the Roblox account
  (display name, @username, ID, avatar — Devan asked 2026-11-21), Robux amount or item, total with
  unique code, screenshot yes/no and an admin link; no WhatsApp number or other contact data.
  Pressing it again (e.g. adding a screenshot) doesn't ping twice. New-order pings are opt-in.

- **Admin (step 5, 2026-11-19):** own small auth instead of Better Auth for now (admins only):
  scrypt password hashes (Node built-in), DB sessions with hashed tokens, 12-hour login, rate
  limits. Better Auth can still come for _customer_ login (phase 3) without touching this. Admin is
  Indonesian only. "Perlu dicek" (pending + buyer said paid, oldest first) is the default view.
  Marking paid requires ticking that the exact amount is in the GoPay merchant history; marking
  failed requires a note.
- **Settings (2026-11-19, Devan: "build settings"):** owner-only page for Robux tiers, QRIS and
  payment window. Stored as overrides in the `settings` table; `src/data/*` stay the defaults and
  "Kembalikan ke bawaan" deletes the override. Pages read a cached copy (refreshed on save and
  every minute); orders are always priced from a fresh read. A new QRIS is decoded in the admin's
  browser first (checksum, static, merchant name → auto-filled); browsers without a QR reader
  (Safari) ask the admin to confirm they scanned it with a phone. Product/gamepass prices are not
  editable yet.
- **Stock switches (2026-11-19, Devan: "flag gamepass out of stock"):** one setting with the
  sold-out Robux methods and product slugs (shop products + `gamepass-<game>`). Sold-out things
  stay visible with "Stok habis" (no surprise disappearance), can't be chosen, and the server
  refuses them. A Robux link to a sold-out method opens on the first available one. Flash deals of
  a sold-out product are hidden (if every deal is sold out the section disappears, and the "Promo"
  nav link then has nothing to jump to).

- **Manual QRIS (step 4, 2026-11-19):** the client's static QRIS (`public/payments/qris.jpg`) was
  decoded and checksum-verified: GoPay merchant **"Kautsars, Gaming"** (Sukabumi), NMID
  ID1026552374492, criteria **UMI (usaha mikro)** → 0% MDR up to Rp 500.000 (half of open question 6
  answered). Buyers see that merchant name in their app, so the payment screen names it. Checkout
  offers only QRIS (any e-wallet / m-banking pays it); VA and retail are hidden until a gateway
  (`availability: "later"` in `src/data/payments.ts`). "Saya sudah bayar" sets the payment to
  `submitted` (order stays pending until an admin confirms); a submitted payment never auto-expires.
  10-minute grace after the countdown for late "I've paid" clicks. Proof screenshots: JPG/PNG/WebP
  ≤ 4 MB, type checked by file bytes, stored in `UPLOAD_DIR` outside `public/`.

- **Orders (step 3, 2026-11-19):** the browser never sends a price; the server prices from
  `src/data/*`. Status machine: pending → paid → processing → completed; pending/paid/processing →
  failed; pending → expired. Every change is a row in `order_events`. Unique code 1–50 (was 1–499, then 1–99; client asked 2026-11-24 for 50 at most) added to
  every total, and the DB forbids two _pending_ orders with the same total. Expiry **30 min
  (placeholder, open question 7)** in `src/data/orders.ts`. Expired on lookup now; the worker
  (step 6) will also do it in the background. Rate limits: 20 lookups and 10 new orders per IP per
  10 min.

- **Backend inside this Next.js app (modular monolith) + one small worker process.** No separate
  backend until there is a second client (mobile app / reseller API) or very high volume.
  Layout: `src/server/{db,orders,pricing,payments,auth,notify}`; pages/actions stay thin.
- **Database:** PostgreSQL + Drizzle ORM. **Jobs:** pg-boss (Postgres-backed queue) in the worker.
- **Payment now:** the store owner's **static QRIS image** + unique code added to each total
  (e.g. Rp 120.000 → Rp 120.047) to match payments; "Saya sudah bayar" + optional proof upload;
  admin confirms Paid → Processing → Completed; unpaid orders expire. Optional: embed the amount
  into the QRIS payload (dynamic-from-static) — verify with the QRIS issuer first.
- **Payment later:** one gateway behind a `PaymentProvider` adapter. Cheapest for this store:
  **Duitku or Midtrans** (QRIS 0.7% above the free band; Xendit adds a Rp 4.000 fee). Since
  1 Oct 2026 Bank Indonesia set QRIS MDR **0% for transactions ≤ Rp 100.000** for all merchants
  (≤ Rp 500.000 for usaha mikro). Check each gateway's policy on selling game currency first.
- **Delivery:** manual now (admin marks completed, gets a Discord/WhatsApp ping on paid orders).
  Later: auto delivery via Send Username as a `FulfillmentProvider` job with manual fallback —
  check Roblox ToS; unofficial endpoints can get the sending account banned.
- **Auth (optional login):** Better Auth — Google + WhatsApp/email OTP; guest checkout stays default;
  orders linked by WhatsApp number.
- **Security rules:** server recomputes prices; order status state machine + audit log; webhooks
  verified + idempotent (store event IDs); rate-limit Check Order and login (Upstash Redis or DB);
  admin behind role check, every admin action logged.
- **Hosting:** Vercel Hobby is non-commercial only, so not allowed. Chosen: **Indonesian VPS
  (~2 GB RAM, e.g. DomaiNesia / Biznet Gio, roughly Rp 50k–160k/month)** running Docker Compose
  (Next.js standalone + worker + Postgres + Caddy). Build images in GitHub Actions, not on the VPS.
  Domain mosherblox.com via Cloudflare (free DNS/SSL/CDN). Daily `pg_dump` to Cloudflare R2.

## Design tooling

- Figma file: https://www.figma.com/design/c6TuT6X3U5fs5mlwH0GC2D (Starter plan: 3 pages max,
  limited MCP calls). Built: variables (Primitives 31, Color 41 semantic, Layout 20), 23 text
  styles, 6 shadows, Foundations page, Components page (icons, logo, Button 6×3, Status badge,
  Tag, Input field, Step header, Checkbox card, Payment option, Amount preset, Method card,
  Order search, Product card, Order card, Navbar, Highlight heading). **Screens page still empty**;
  small fix pending on the Colors panel (brand-950 swatch clipped, long semantic names cut off).
- `design/` holds `tokens.json` (W3C tokens), `screens/*.png`, and a Figma import guide.
- `/id/design-kit` renders every component from code (dev only).

## Known gotchas hit before

- Turbopack sometimes serves stale CSS → delete `.next`.
- Duplicate DOM ids across pages because of `<Activity>` → make ids unique per page.
- ColorZilla-type extensions cause hydration warnings → `suppressHydrationWarning` on `<body>`.
- `overflow: hidden` on an ancestor breaks `position: sticky` → use `overflow-clip`.
- `document.cookie` writes trip the react-hooks lint rule → kept in `src/i18n/persist-locale.ts`.
- Logo `next/image` "width or height modified" warning → pass `style={{ width, height }}`.
