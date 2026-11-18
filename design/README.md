# MOSHERBLOX → Figma

Everything needed to rebuild the site as a Figma file: tokens, a component kit and every page.

| What                                                  | Where                         | Becomes in Figma                       |
| ----------------------------------------------------- | ----------------------------- | -------------------------------------- |
| Design tokens (colors, type, radius, spacing, shadow) | `design/tokens.json`          | Variables + styles (via Tokens Studio) |
| Design kit — foundations, components, patterns        | `/id/design-kit` (dev server) | Editable layers (via html.to.design)   |
| Pages — Home, Robux, Gamepass, Check order, 404       | the live pages                | Editable layers (via html.to.design)   |
| Reference screenshots, desktop 1440 + mobile 390      | `design/screens/*.png`        | Images to trace / compare              |

## 1. Font

Poppins (Google Fonts) must be installed or available in Figma — weights 400, 500, 600, 700, 800.

## 2. Tokens → Figma variables

1. Install the free **Tokens Studio for Figma** plugin.
2. Open it → load tokens from a file / JSON → paste or pick `design/tokens.json` (W3C Design Tokens format).
3. Use its export to create **Figma Variables** and styles.

Regenerate after changing colors in `src/app/globals.css`:

```bash
npm run tokens
```

Groups: `color.brand / blush / ink` (scales), `color.status`, `semantic.*` (primary, surface, border, text…),
`font.*`, `radius.*`, `spacing.*`, `shadow.*`.

## 3. Design kit + pages → editable layers

Use the **html.to.design** plugin (free tier available) with its **Chrome extension**, which can capture
pages running on your own computer (`localhost`):

1. `npm run dev`
2. Open http://localhost:3000/id/design-kit (or `/en/design-kit`).
3. **Scroll to the bottom once** so every section has animated in, then scroll back up.
4. Click the html.to.design extension → import into your Figma file.
5. Repeat for each page at desktop width, then again with Chrome DevTools' device toolbar at 390px for mobile:
   `/id`, `/id/robux`, `/id/gamepass`, `/id/gamepass/blox-fruits`, `/id/check-order`.

Each white card on the kit page (Colors, Typography, Radius & shadow, Icons, Buttons, Badges, Forms, Cards,
Patterns, Pages) imports as its own frame. After importing, turn repeated pieces (buttons, inputs, badges,
cards) into Figma components and bind their fills to the token variables.

The kit page renders the real components, so re-importing after a code change gives an up-to-date kit.
It only exists in development — production builds return 404 unless `DESIGN_KIT=1` is set.

## 4. Screenshots

`design/screens/` holds full-page captures (desktop 1440 @1x, mobile 390 @2x) of every page, including the
Check Order result state. Re-capture them after big UI changes.
