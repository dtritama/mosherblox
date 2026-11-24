import type { LocalizedText } from "@/i18n/config";

/** Robux are not a product here — they have their own panel and pricing (src/data/robux.ts). */
export type ProductCategory = "premium" | "giftcard" | "items" | "gamepass";

export type ProductIcon =
  "coins" | "crown" | "gift" | "apple" | "sprout" | "egg" | "gem" | "sparkles" | "sword" | "house" | "target";

export type ProductTag = "Hot" | "New" | "Promo" | "Best value";

/**
 * How an order reaches the customer — this decides which account field the checkout asks for.
 * - trade:    item is traded/gifted in-game to the customer's Roblox username.
 * - voucher:  a redeem code is emailed to the customer.
 * - gift:     an in-game Gamepass is sent as a gift to the customer's Roblox username.
 */
export type DeliveryType = "trade" | "voucher" | "gift";

export interface ProductOption {
  id: string;
  /** Quantity (Robux amount, months, item count…). */
  amount: number;
  /** Display label per locale, e.g. "1.000 Robux" / "1,000 Robux". */
  label: LocalizedText;
  /** Selling price in IDR. */
  price: number;
  /** When set, the option is on flash sale and this is the price before discount. */
  originalPrice?: number;
}

export interface Product {
  slug: string;
  name: string;
  /** Short line under the name, per locale. */
  subtitle: LocalizedText;
  category: ProductCategory;
  icon: ProductIcon;
  /** Gradient stops for the generated cover art. */
  accent: readonly [from: string, to: string];
  tag?: ProductTag;
  delivery: DeliveryType;
  options: readonly ProductOption[];
}

export type PaymentGroup = "QRIS" | "E-Wallet" | "Virtual Account" | "Retail";

/**
 * - checkout: selectable at checkout now (manual QRIS)
 * - via-qris: not a separate option, but the buyer can pay the QRIS with it (e-wallet apps)
 * - later:    needs a payment gateway (phase 3) — hidden everywhere until then
 */
export type PaymentAvailability = "checkout" | "via-qris" | "later";

export interface PaymentMethod {
  id: string;
  name: string;
  group: PaymentGroup;
  /** Flat fee in IDR. */
  fee: number;
  availability: PaymentAvailability;
}

export type NavKey = "robux" | "gamepass" | "shop" | "deals" | "leaderboard" | "reviews" | "faq" | "checkOrder";

export interface NavItem {
  /** Key into `dict.nav.items`. */
  key: NavKey;
  /**
   * Path relative to the locale root: "#robux" (a section of the home page) or "/gamepass" (a page).
   * Build the final URL with `localeHref()`.
   */
  href: `#${string}` | `/${string}`;
}
