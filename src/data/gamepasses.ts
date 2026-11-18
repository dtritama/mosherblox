import type { LocalizedText } from "@/i18n/config";
import type { ProductIcon, ProductTag } from "@/types";

/**
 * SAMPLE gamepass catalogue for the phase 1 portfolio.
 * Gamepass names, in-game Robux prices and IDR prices are placeholders —
 * replace them with your real list (phase 2 will load this from the API / database).
 */

export interface Gamepass {
  id: string;
  name: string;
  /** Official in-game price in Robux (shown for reference). */
  robux: number;
  /** MOSHERBLOX selling price in IDR. */
  price: number;
  /** When set, the pass is discounted and this is the price before discount. */
  originalPrice?: number;
  popular?: boolean;
}

export interface GamepassGame {
  slug: string;
  name: string;
  icon: ProductIcon;
  accent: readonly [from: string, to: string];
  tag?: ProductTag;
  description: LocalizedText;
  passes: readonly Gamepass[];
}

type PassRow = readonly [
  name: string,
  robux: number,
  price: number,
  extra?: Pick<Gamepass, "originalPrice" | "popular">,
];

function passes(slug: string, rows: readonly PassRow[]): Gamepass[] {
  return rows.map(([name, robux, price, extra], index) => ({
    id: `${slug}-pass-${index + 1}`,
    name,
    robux,
    price,
    ...extra,
  }));
}

export const gamepassGames: readonly GamepassGame[] = [
  {
    slug: "blox-fruits",
    name: "Blox Fruits",
    icon: "apple",
    accent: ["#8fd3f4", "#86c92b"],
    tag: "Hot",
    description: {
      id: "Gamepass untuk farming lebih cepat, simpan buah, dan berlayar lebih kencang.",
      en: "Passes for faster farming, storing fruits and sailing faster.",
    },
    passes: passes("blox-fruits", [
      ["Fruit Notifier", 2700, 289000, { popular: true }],
      ["Dark Blade", 1200, 129000],
      ["2x Mastery", 450, 44900, { originalPrice: 49000, popular: true }],
      ["2x Money", 450, 49000],
      ["+1 Fruit Storage", 400, 45000],
      ["2x Boss Drops", 350, 39000],
      ["Fast Boats", 350, 39000],
    ]),
  },
  {
    slug: "pet-simulator-99",
    name: "Pet Simulator 99",
    icon: "gem",
    accent: ["#b9e3f5", "#a5e34a"],
    description: {
      id: "Tingkatkan peluang pet langka dan otomatiskan farming kamu.",
      en: "Boost your rare-pet odds and automate your farming.",
    },
    passes: passes("pet-simulator-99", [
      ["VIP", 699, 79000, { popular: true }],
      ["Lucky", 199, 22000],
      ["Ultra Lucky", 649, 72000],
      ["Magic Eggs", 449, 49000],
      ["Huge Hunter", 999, 109000],
      ["Auto Farm", 249, 28000],
    ]),
  },
  {
    slug: "murder-mystery-2",
    name: "Murder Mystery 2",
    icon: "sword",
    accent: ["#d9f6a6", "#5f9a17"],
    description: {
      id: "Gamepass eksklusif untuk tampil beda di setiap ronde.",
      en: "Exclusive passes to stand out every round.",
    },
    passes: passes("murder-mystery-2", [
      ["Elite", 1000, 109000, { popular: true }],
      ["Radio", 250, 28000],
      ["Godly Pack", 800, 89000],
    ]),
  },
  {
    slug: "blade-ball",
    name: "Blade Ball",
    icon: "target",
    accent: ["#ffc8da", "#a5e34a"],
    tag: "New",
    description: {
      id: "Kumpulkan koin lebih cepat dan buka skin lebih awal.",
      en: "Earn coins faster and unlock skins sooner.",
    },
    passes: passes("blade-ball", [
      ["VIP", 499, 54000, { popular: true }],
      ["2x Coins", 299, 32000],
      ["Extra Ability Slot", 399, 43000],
    ]),
  },
  {
    slug: "brookhaven-rp",
    name: "Brookhaven RP",
    icon: "house",
    accent: ["#ecfbd2", "#86c92b"],
    description: {
      id: "Buka rumah, kendaraan, dan fitur roleplay premium.",
      en: "Unlock premium houses, vehicles and roleplay features.",
    },
    passes: passes("brookhaven-rp", [
      ["Premium", 300, 33000, { popular: true }],
      ["Vehicle Pack", 250, 28000],
      ["Speed Pass", 150, 17000],
    ]),
  },
  {
    slug: "grow-a-garden",
    name: "Grow a Garden",
    icon: "sprout",
    accent: ["#bdef6d", "#6fb21f"],
    tag: "Hot",
    description: {
      id: "Panen lebih cepat dan perluas kebunmu.",
      en: "Harvest faster and grow a bigger garden.",
    },
    passes: passes("grow-a-garden", [
      ["VIP", 399, 44000, { popular: true }],
      ["Extra Garden Slot", 299, 32000],
      ["Faster Growth", 199, 19900, { originalPrice: 22000 }],
    ]),
  },
];
