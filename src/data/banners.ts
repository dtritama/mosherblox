import type { StaticImageData } from "next/image";

import grandOpening from "@/assets/banners/grand-opening.webp";
import topSpender from "@/assets/banners/top-spender.webp";
import type { LocalizedText } from "@/i18n/config";

export interface Banner {
  id: string;
  /** Static import so Next.js knows the size (no layout shift) and can generate a blur placeholder. */
  image: StaticImageData;
  /** Describes the banner for screen readers and SEO. */
  alt: LocalizedText;
  /** Optional link: a section on the page ("#deals") or a full URL (opens in a new tab). */
  href?: string;
}

/**
 * Promo banners shown in the carousel under the hero, in this order.
 * To add one: put the image in `src/assets/banners/` (best at 2130×750 px — a 71:25 frame; other sizes are
 * center-cropped to it), import it, and add an entry.
 * With a single banner the carousel shows just that image, with no arrows or dots.
 */
export const banners: readonly Banner[] = [
  {
    id: "grand-opening",
    image: grandOpening,
    alt: {
      id: "Grand Opening MOSHERBLOX — harga mulai Rp 5.000! Promo spesial grand opening: harga termurah, proses cepat, aman & terpercaya.",
      en: "MOSHERBLOX Grand Opening — prices from Rp 5,000! Special opening promo: lowest prices, fast process, safe & trusted.",
    },
    href: "#robux",
  },
  {
    id: "top-spender",
    image: topSpender,
    alt: {
      id: "Borong dan jajan di MOSHERBLOX — bisa dapet kesempatan jadi Top Spender! Berlaku setiap bulan, cek nama kamu di leaderboard.",
      en: "Shop more at MOSHERBLOX for a chance to become Top Spender! Runs every month — check your name on the leaderboard.",
    },
  },
];
