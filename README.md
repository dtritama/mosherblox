# MOSHERBLOX — Roblox Top-Up Store (Frontend · Phase 1)

A fast, modern, animated portfolio/storefront for **MOSHERBLOX**, built with:

- **Next.js 16** (App Router, Turbopack, statically prerendered)
- **React 19** + **TypeScript** (strict)
- **Tailwind CSS v4** (theme tokens in `src/app/globals.css`)
- **Motion** (`motion/react`, using `LazyMotion` + `m` components to keep the bundle small)
- **Poppins** font (self-hosted with `next/font/local`, so there are no Google requests)
- Theme: white + soft green (`brand-*`) + soft pink (`blush-*`)
- Roblox-only catalogue: Robux via Gamepass, Roblox Premium, gift cards and in-game items

> Phase 1 = frontend only. The checkout is a working **demo** (validation, order summary, success screen). No payment is made. Phase 2 adds the backend/API and Phase 3 the database.

---

## Requirements

| Tool    | Version                                              |
| ------- | ---------------------------------------------------- |
| Node.js | **20.9 or newer** (22 LTS recommended, see `.nvmrc`) |
| npm     | comes with Node.js                                   |

Check with:

```bash
node -v
npm -v
```

Download Node.js from https://nodejs.org (choose the **LTS** installer for Windows or macOS).

---

## Run locally

The commands are the same on **Windows (PowerShell / CMD)** and **macOS (Terminal)**.

```bash
# 1. Go into the project folder
cd mosherblox

# 2. Install dependencies (first time only)
npm install

# 3. (optional) copy env file
#    macOS:    cp .env.example .env.local
#    Windows:  copy .env.example .env.local

# 4. Start the dev server
npm run dev
```

Then open **http://localhost:3000**. It redirects to **/id** (Bahasa Indonesia, the default). English is at **/en**.

### Production build (to test real performance)

```bash
npm run build
npm start
```

### Scripts

| Script              | What it does                               |
| ------------------- | ------------------------------------------ |
| `npm run dev`       | Dev server with hot reload                 |
| `npm run build`     | Production build                           |
| `npm start`         | Serve the production build                 |
| `npm run lint`      | ESLint (Next.js + TypeScript rules)        |
| `npm run typecheck` | TypeScript check                           |
| `npm run format`    | Prettier (+ Tailwind class sorting)        |
| `npm run check`     | typecheck + lint + build (run before push) |

---

## Project structure

```
src/
├─ app/
│  ├─ [lang]/                # Root layout + page per locale (/id, /en), localized 404 & error
│  ├─ fonts/                 # Self-hosted Poppins (SIL OFL)
│  └─ globals.css            # Tailwind v4 theme tokens (brand/ink colors, animations, utilities)
├─ components/
│  ├─ layout/                # Navbar, LanguageSwitcher, Footer, ScrollProgress, BackToTop
│  ├─ providers/             # MotionProvider (LazyMotion + reduced-motion support)
│  ├─ sections/              # Hero, ExperienceMarquee, ShopSection, FlashSale, Features, HowItWorks, Faq, Cta
│  ├─ topup/                 # TopUpProvider (context), TopUpDialog (checkout), ProductCard
│  └─ ui/                    # Reusable primitives: Button, Container, Logo, Reveal, SectionHeading…
├─ config/site.ts            # Brand name, URL, contact info, nav  ← edit your real details here
├─ data/                     # Products (with id/en labels) & payment methods (sample data)
├─ hooks/                    # useTilt, useDialogA11y
├─ i18n/                     # Locale config, dictionaries (id.ts, en.ts), provider, formatting
├─ lib/                      # catalog helpers, validation, utils
├─ proxy.ts                  # Redirects "/" (and paths without a locale) to /id or the saved language
└─ types/                    # Shared TypeScript types (Product, ProductOption, PaymentMethod…)
```

### Localization (Bahasa Indonesia + English)

- URLs: `/id` (default) and `/en`. Both are pre-rendered as static pages at build time.
- Visiting `/` redirects to `/id`, or to the language the visitor picked last time (saved in the `NEXT_LOCALE` cookie by the ID/EN switcher in the navbar).
- All text lives in `src/i18n/dictionaries/`. `id.ts` is the source of truth. `en.ts` must have exactly the same keys, and TypeScript fails the build if a translation is missing.
- Server Components read text with `await getI18n()`; Client Components use `useI18n()`.
- Numbers follow the language (1.000 vs 1,000); prices are always Rupiah (Rp 118.000).
- To add a language: add it to `locales` in `src/i18n/config.ts`, create a dictionary file, and register it in `src/i18n/get-dictionary.ts`.

### Where to edit things

- **Store info & contact** → `src/config/site.ts`
- **Products & prices** → `src/data/products.ts` (add `originalPrice` to an option and it appears in **Flash Deals** automatically)
- **Robux pricing** → `src/data/robux.ts` (min/max, presets, rate tiers per method). The first method (Send Username / USN) is the default and the one promoted on the home page. Send Username has `requires2sv: true` (buyer must confirm 2-Step Verification) and `limits: { daily: 5000, monthly: 10000 }` — the daily limit is also the max per order. The monthly limit is shown to buyers but can only be enforced by the backend (phase 2). The FAQ answer repeats these numbers, so update it too if they change
- **Promo banners (carousel under the hero)** → drop the image in `src/assets/banners/` and add it to `src/data/banners.ts` (≈2000×700 px). Arrows, dots and autoplay appear automatically once there are 2+ banners.
- **Gamepass page (`/id/gamepass`)** → games and their gamepasses live in `src/data/gamepasses.ts` (sample data — replace with your real list). Each game automatically gets its own pre-built page, e.g. `/id/gamepass/blox-fruits`.
- **Payment methods & fees** → `src/data/payments.ts`
- **All website text (both languages)** → `src/i18n/dictionaries/id.ts` and `en.ts`
- **Colors** → `--color-brand-*` in `src/app/globals.css`

---

## What's built in

**Sections:** Hero (animated headline, 3D tilt order card, Robux count-up), Roblox experiences marquee, Robux section (slider + amount chips, Gamepass price helper, links into the Robux page with the amount pre-filled, plus a CTA to the Robux page), Roblox shop  (Premium, gift cards, game items with category filter + search + tilt cards), Flash Deals with live countdown, Why Us bento grid with cursor spotlight, How It Works + payment methods, FAQ accordion, CTA, footer.

**Robux page** (`/robux`, also `?method=gamepass&amount=1500`): the full buy panel — method cards, manual amount with −/+ and multiples-of-100 presets, live IDR price with tier hints, Gamepass price helper, username + WhatsApp, payment, sticky summary / mobile buy bar.

**Check Order page** (`/check-order`): order ID + WhatsApp → status (Pending / Processing / Completed / Failed) with timeline and details. Demo orders: `MB-PEND2026`, `MB-PROC2026`, `MB-DONE2026`, `MB-FAIL2026` with `081234567890`.

**Orders:** all order calls go through `src/lib/orders/service.ts`. Phase 1 stores demo orders in the browser; in phase 2 swap `orderService` for an API version (same interface) — the server must recompute prices, own the status and rate-limit lookups.

**Checkout dialog:** Roblox username (validated against Roblox username rules) or email for code delivery, WhatsApp number, amount picker, payment picker grouped by type, live order summary, validation with inline errors, success screen. Opens from any product card or flash deal (Robux has its own panel).

**Performance**

- Page is fully **static** (prerendered at build time).
- `LazyMotion` + `m` components (~15 kB instead of ~34 kB for Motion).
- Checkout dialog is **code-split** and only loaded on first click.
- Marquee, floating chips and backgrounds are pure CSS transforms (GPU, zero JS).
- Tilt and spotlight effects use motion values or CSS variables, so mouse moves never re-render React.
- No external images or fonts, so there are no layout shifts and no third-party requests.

**Accessibility**

- Skip link, semantic landmarks and headings, `aria-*` on menu, tabs, accordion and dialog.
- The dialog traps focus, closes on Escape, restores focus and locks scroll.
- Respects **prefers-reduced-motion** (Motion + CSS).
- Native radio inputs behind the amount and payment cards (keyboard friendly).

**Security**

- Strict security headers in `next.config.ts`: CSP, `X-Frame-Options: DENY`, `nosniff`, Referrer-Policy, Permissions-Policy, HSTS, COOP.
- `X-Powered-By` header disabled.
- No `dangerouslySetInnerHTML` anywhere. User input is sanitized while typing and validated by pure functions in `src/lib/validation.ts`. These can be reused on the server in phase 2, where server-side validation is still required.

---

## Roadmap

- **Phase 2 — Backend:** API routes / service for orders, payment-gateway integration (e.g. Midtrans/Xendit), provider API for fulfilment, webhooks. Add the API origin to `connect-src` in the CSP.
- **Phase 3 — Database:** products/prices/orders/users stored in a DB; `src/data/*` replaced by real queries (same TypeScript types).

---

MOSHERBLOX is not affiliated with Roblox Corporation. Roblox, Robux and game names are trademarks of their respective owners. Poppins font © The Poppins Project Authors, SIL Open Font License 1.1.

## Figma / design kit

See [`design/README.md`](design/README.md): design tokens (`npm run tokens` → `design/tokens.json`), a dev-only component kit at `/id/design-kit`, and page screenshots in `design/screens/` — plus step-by-step import into Figma.
