import type { NavItem } from "@/types";

/**
 * Language-independent brand info. Translatable copy lives in `src/i18n/dictionaries`.
 * Contact channels are used by the FAQ section and the footer.
 */
export const siteConfig = {
  name: "MOSHERBLOX",
  url: process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000",
  themeColor: "#a5e34a",
  /** Show/hide switches for small UI pieces (texts stay in the dictionaries). */
  ui: {
    /** Small label pill above each section title (e.g. "TOP UP ROBUX"). */
    showEyebrows: false,
    /** "Beli Robux" / "Lihat item" buttons under the hero text. */
    showHeroButtons: false,
  },
  contact: {
    discord: {
      url: "https://discord.gg/5Y82ZH7GgP",
      display: "discord.gg/5Y82ZH7GgP",
    },
    whatsapp: {
      /** International format without "+" (used by wa.me). */
      number: "6281211980741",
      display: "0812-1198-0741",
    },
    whatsappGroup: {
      url: "https://chat.whatsapp.com/KqW18a2Li0YDZjwQccxHRY",
    },
  },
} as const;

export const navItems: readonly NavItem[] = [
  { key: "robux", href: "/robux" },
  { key: "gamepass", href: "/gamepass" },
  { key: "shop", href: "#shop" },
  { key: "deals", href: "#deals" },
  { key: "leaderboard", href: "#leaderboard" },
  { key: "reviews", href: "#reviews" },
  { key: "faq", href: "#faq" },
  { key: "checkOrder", href: "/check-order" },
];
