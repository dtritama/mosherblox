// Exports the design tokens to design/tokens.json (W3C Design Tokens format),
// for Figma via the Tokens Studio plugin. Colors come from the @theme block in
// src/app/globals.css (the single source of truth); the rest mirrors the
// Tailwind defaults this project uses.  Run: npm run tokens
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const root = new URL("..", import.meta.url);
const css = readFileSync(fileURLToPath(new URL("src/app/globals.css", root)), "utf8");

const color = {};
for (const [, group, step, value] of css.matchAll(/--color-([a-z]+)-(\d+):\s*(#[0-9a-f]{3,8});/gi)) {
  color[group] ??= {};
  color[group][step] = { $type: "color", $value: value.toLowerCase() };
}
if (!Object.keys(color).length) throw new Error("No --color-* tokens found in globals.css");

const ref = (group, step) => `{color.${group}.${step}}`;
const px = (value) => ({ $type: "dimension", $value: `${value}px` });
const shadow = (y, blur, spread, hex) => ({
  $type: "shadow",
  $value: { offsetX: "0px", offsetY: `${y}px`, blur: `${blur}px`, spread: `${spread}px`, color: hex },
});

const tokens = {
  color: {
    ...color,
    white: { $type: "color", $value: "#ffffff" },
    status: {
      pending: { $type: "color", $value: "#fef3c7", $description: "Badge bg (amber-100); text amber-800 #92400e" },
      processing: { $type: "color", $value: "#e0f2fe", $description: "Badge bg (sky-100); text sky-800 #075985" },
      completed: { $type: "color", $value: ref("brand", 100), $description: "Badge bg; text brand-800" },
      failed: { $type: "color", $value: ref("blush", 100), $description: "Badge bg; text blush-800" },
    },
  },
  semantic: {
    background: { $type: "color", $value: "{color.white}" },
    surface: { $type: "color", $value: ref("brand", 50), $description: "Tinted panels, footer" },
    border: { $type: "color", $value: ref("brand", 100) },
    "border-strong": { $type: "color", $value: ref("brand", 300), $description: "Hover border" },
    focus: { $type: "color", $value: ref("brand", 500), $description: "Focused input border / ring brand-400" },
    primary: { $type: "color", $value: ref("brand", 400), $description: "Main buttons — always with ink-900 text" },
    "primary-hover": { $type: "color", $value: ref("brand", 300) },
    accent: { $type: "color", $value: ref("blush", 200), $description: "Pink buttons, underline on highlights" },
    "accent-strong": { $type: "color", $value: ref("blush", 500), $description: "Hot/popular badges, alerts" },
    text: { $type: "color", $value: ref("ink", 900) },
    "text-muted": { $type: "color", $value: ref("ink", 500) },
    "text-subtle": { $type: "color", $value: ref("ink", 300), $description: "Placeholders" },
    "text-link": { $type: "color", $value: ref("brand", 700) },
    error: { $type: "color", $value: ref("blush", 700) },
  },
  font: {
    family: { sans: { $type: "fontFamily", $value: ["Poppins", "ui-sans-serif", "system-ui", "sans-serif"] } },
    weight: {
      regular: { $type: "fontWeight", $value: 400 },
      medium: { $type: "fontWeight", $value: 500 },
      semibold: { $type: "fontWeight", $value: 600 },
      bold: { $type: "fontWeight", $value: 700 },
      extrabold: { $type: "fontWeight", $value: 800 },
    },
    size: {
      xs: px(12),
      sm: px(14),
      base: px(16),
      lg: px(18),
      xl: px(20),
      "2xl": px(24),
      "3xl": px(30),
      "4xl": px(36),
      "section-title": px(44),
      "5xl": px(48),
      "6xl": px(60),
      "7xl": px(72),
    },
  },
  radius: {
    lg: px(8),
    xl: px(12),
    "2xl": px(16),
    "3xl": px(24),
    card: px(28),
    panel: px(32),
    footer: px(40),
    full: px(9999),
  },
  spacing: {
    1: px(4),
    2: px(8),
    3: px(12),
    4: px(16),
    5: px(20),
    6: px(24),
    8: px(32),
    10: px(40),
    12: px(48),
    14: px(56),
    20: px(80),
    "container-max": px(1280),
    "gutter-mobile": px(16),
    "gutter-desktop": px(32),
  },
  shadow: {
    card: shadow(30, 80, -20, "#5f9a1747"),
    soft: shadow(10, 40, -20, "#1a231240"),
    "button-primary": shadow(10, 15, -3, "#86c92b4d"),
    "button-pink": shadow(10, 15, -3, "#ffa9c266"),
  },
};

const out = fileURLToPath(new URL("design/tokens.json", root));
writeFileSync(out, `${JSON.stringify(tokens, null, 2)}\n`);
console.log(`Wrote design/tokens.json (${Object.keys(color).length} color scales)`);
