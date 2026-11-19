import type { LocalizedText } from "@/i18n/config";
import type { Product, ProductCategory, ProductOption } from "@/types";

/**
 * Sample Roblox catalogue for the phase 1 portfolio.
 * In phase 2 this comes from the API / database using the same `Product` shape.
 * Prices are placeholders — replace them with your real price list.
 */

/** Same text in every locale (item names, Rupiah amounts…). */
const same = (text: string): LocalizedText => ({ id: text, en: text });
const t = (id: string, en: string): LocalizedText => ({ id, en });

type Row = readonly [label: LocalizedText, amount: number, price: number, originalPrice?: number];

function options(slug: string, rows: readonly Row[]): ProductOption[] {
  return rows.map(([label, amount, price, originalPrice], index) => ({
    id: `${slug}-${index + 1}`,
    label,
    amount,
    price,
    ...(originalPrice ? { originalPrice } : {}),
  }));
}

export const products: readonly Product[] = [
  {
    slug: "roblox-premium",
    name: "Roblox Premium",
    subtitle: t("Robux bulanan + fitur Premium", "Monthly Robux + Premium perks"),
    category: "premium",
    icon: "crown",
    accent: ["#d9f6a6", "#86c92b"],
    tag: "Best value",
    delivery: "voucher",
    options: options("roblox-premium", [
      [t("Premium 450 · 1 Bulan", "Premium 450 · 1 Month"), 1, 62900, 69000],
      [t("Premium 1000 · 1 Bulan", "Premium 1000 · 1 Month"), 1, 139000],
      [t("Premium 2200 · 1 Bulan", "Premium 2200 · 1 Month"), 1, 279000],
    ]),
  },
  {
    slug: "roblox-gift-card",
    name: "Roblox Gift Card",
    subtitle: t("Kode digital dikirim ke email", "Digital code sent to your email"),
    category: "giftcard",
    icon: "gift",
    accent: ["#ffc8da", "#a5e34a"],
    delivery: "voucher",
    options: options("roblox-gift-card", [
      [same("Rp 50.000"), 50000, 52500],
      [same("Rp 100.000"), 100000, 104000],
      [same("Rp 200.000"), 200000, 207000],
      [same("Rp 500.000"), 500000, 515000],
    ]),
  },
  {
    slug: "blox-fruits",
    name: "Blox Fruits",
    subtitle: t("Buah fisik · dikirim via trade", "Physical fruits · delivered by trade"),
    category: "items",
    icon: "apple",
    accent: ["#8fd3f4", "#86c92b"],
    tag: "Hot",
    delivery: "trade",
    options: options("blox-fruits", [
      [same("Buddha Fruit"), 1, 25000],
      [same("Portal Fruit"), 1, 35000],
      [same("Dough Fruit"), 1, 59000],
      [same("Leopard Fruit"), 1, 89000, 99000],
      [same("Kitsune Fruit"), 1, 129000],
      [same("Dragon Fruit"), 1, 189000],
    ]),
  },
  {
    slug: "grow-a-garden",
    name: "Grow a Garden",
    subtitle: t("Pet & bibit · dikirim via gift", "Pets & seeds · delivered by gift"),
    category: "items",
    icon: "sprout",
    accent: ["#bdef6d", "#6fb21f"],
    tag: "New",
    delivery: "trade",
    options: options("grow-a-garden", [
      [same("Red Fox"), 1, 15000],
      [same("Dragonfly"), 1, 29000],
      [same("Queen Bee"), 1, 39000],
      [same("Raccoon"), 1, 59000],
    ]),
  },
  {
    slug: "adopt-me",
    name: "Adopt Me!",
    subtitle: t("Pet legendaris · dikirim via trade", "Legendary pets · delivered by trade"),
    category: "items",
    icon: "egg",
    accent: ["#e2f7b0", "#86c92b"],
    delivery: "trade",
    options: options("adopt-me", [
      [same("Owl"), 1, 39000],
      [same("Giraffe"), 1, 69000],
      [same("Frost Dragon"), 1, 89000],
      [same("Bat Dragon"), 1, 119000],
      [same("Shadow Dragon"), 1, 149000],
    ]),
  },
  {
    slug: "pet-simulator-99",
    name: "Pet Simulator 99",
    subtitle: t("Diamonds · dikirim via mail", "Diamonds · delivered by mail"),
    category: "items",
    icon: "gem",
    accent: ["#b9e3f5", "#a5e34a"],
    delivery: "trade",
    options: options("pet-simulator-99", [
      [same("1B Diamonds"), 1, 9000],
      [same("5B Diamonds"), 5, 42000],
      [same("10B Diamonds"), 10, 79000],
      [same("25B Diamonds"), 25, 189000],
    ]),
  },
];

/** Shop filter tabs; labels come from `dict.shop.categories`. */
/** Categories shown as filter tabs in the shop section (Robux and gamepasses have their own sections/pages). */
export type ShopCategory = Extract<ProductCategory, "items" | "premium" | "giftcard"> | "all";

export const shopCategories: readonly ShopCategory[] = ["all", "items", "premium", "giftcard"];
