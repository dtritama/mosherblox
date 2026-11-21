import { orderConfig } from "@/data/orders";
import { manualQris } from "@/data/payments";
import { robuxConfig, type RobuxMethodId, type RobuxRateTier } from "@/data/robux";
import { defaultRobuxRates, type RobuxRates } from "@/lib/robux-pricing";

/**
 * Store settings the owner can change in /admin/settings. The values in src/data/* are the
 * defaults (used until the owner saves something, and whenever the database can't be read).
 * Pure: the admin form and the server use the same validation.
 */

export interface QrisSetting {
  /** Public URL of the QRIS image. */
  image: string;
  width: number;
  height: number;
  /** Name buyers see in their e-wallet after scanning. */
  merchantName: string;
  nmid: string;
}

/** What can't be bought right now (out of stock). Everything else is available. */
export interface SoldOut {
  robuxMethods: RobuxMethodId[];
  /** Product slugs from src/data/products.ts and gamepass games as `gamepass-<game>`. */
  products: string[];
}

export interface SiteSettings {
  robuxRates: RobuxRates;
  orderExpiryMinutes: number;
  qris: QrisSetting;
  soldOut: SoldOut;
  /**
   * Robux the store has available, shown on the site. Completed Robux orders subtract their amount
   * automatically. null = not tracked (hidden, no limit).
   */
  robuxStock: number | null;
}

export const defaultSettings: SiteSettings = {
  robuxRates: defaultRobuxRates,
  orderExpiryMinutes: orderConfig.expiryMinutes,
  qris: { ...manualQris },
  soldOut: { robuxMethods: [], products: [] },
  robuxStock: null,
};

/** Keys in the `settings` table. */
export const SETTING_KEYS = {
  robuxRates: "robux.rates",
  orderExpiryMinutes: "orders.expiryMinutes",
  qris: "payment.qris",
  soldOut: "stock.soldOut",
  robuxStock: "robux.stock",
} as const satisfies Record<keyof SiteSettings, string>;

export const SETTING_LIMITS = {
  maxTiers: 6,
  /** IDR per Robux. */
  rateMin: 1,
  rateMax: 10_000,
  expiryMin: 10,
  expiryMax: 240,
  merchantNameMax: 60,
} as const;

export type RatesError = "firstTierZero" | "tierOrder" | "rateRange" | "tierCount" | "amountRange";

const isInt = (value: unknown): value is number => typeof value === "number" && Number.isSafeInteger(value);

/** Checks one method's tiers: starts at 0, strictly increasing minimums, whole-rupiah rates in range. */
export function validateTiers(tiers: unknown): RatesError | null {
  if (!Array.isArray(tiers) || tiers.length < 1 || tiers.length > SETTING_LIMITS.maxTiers) return "tierCount";
  for (const [index, tier] of tiers.entries()) {
    const { minAmount, rate } = (tier ?? {}) as Partial<RobuxRateTier>;
    if (!isInt(minAmount) || minAmount < 0 || minAmount > robuxConfig.maxAmount) return "amountRange";
    if (!isInt(rate) || rate < SETTING_LIMITS.rateMin || rate > SETTING_LIMITS.rateMax) return "rateRange";
    if (index === 0 && minAmount !== 0) return "firstTierZero";
    if (index > 0 && minAmount <= (tiers[index - 1] as RobuxRateTier).minAmount) return "tierOrder";
  }
  return null;
}

/** Validates the full rates object; returns a clean copy or the first error per method. */
export function parseRobuxRates(
  input: unknown,
): { ok: true; rates: RobuxRates } | { ok: false; errors: Partial<Record<RobuxMethodId, RatesError>> } {
  const errors: Partial<Record<RobuxMethodId, RatesError>> = {};
  const rates = {} as Record<RobuxMethodId, RobuxRateTier[]>;
  for (const { id } of robuxConfig.methods) {
    const tiers = (input as Record<string, unknown> | null)?.[id];
    const error = validateTiers(tiers);
    if (error) errors[id] = error;
    else rates[id] = (tiers as RobuxRateTier[]).map(({ minAmount, rate }) => ({ minAmount, rate }));
  }
  return Object.keys(errors).length > 0 ? { ok: false, errors } : { ok: true, rates };
}

/** Robux stock: a whole number from 0 to 100 million. */
export function isValidStock(value: unknown): value is number {
  return isInt(value) && value >= 0 && value <= 100_000_000;
}

export function isValidExpiry(value: unknown): value is number {
  return isInt(value) && value >= SETTING_LIMITS.expiryMin && value <= SETTING_LIMITS.expiryMax;
}

const robuxMethodIds = robuxConfig.methods.map((method) => method.id) as readonly string[];

/** Keeps only known ids (unknown slugs from an old setting are dropped). */
export function parseSoldOut(input: unknown, productSlugs: readonly string[]): SoldOut {
  const value = (input ?? {}) as Partial<Record<keyof SoldOut, unknown>>;
  const pick = (list: unknown, allowed: readonly string[]) =>
    Array.isArray(list) ? [...new Set(list.filter((item): item is string => allowed.includes(item as string)))] : [];
  return {
    robuxMethods: pick(value.robuxMethods, robuxMethodIds) as RobuxMethodId[],
    products: pick(value.products, productSlugs),
  };
}

export function isRobuxMethodSoldOut(soldOut: SoldOut, method: RobuxMethodId) {
  return soldOut.robuxMethods.includes(method);
}

export function isProductSoldOut(soldOut: SoldOut, slug: string) {
  return soldOut.products.includes(slug);
}

/** Merges stored values over the defaults, ignoring anything malformed (never breaks the shop). */
export function mergeSettings(
  stored: Partial<Record<keyof SiteSettings, unknown>>,
  productSlugs: readonly string[] = [],
): SiteSettings {
  const rates = stored.robuxRates !== undefined ? parseRobuxRates(stored.robuxRates) : null;
  const qris = stored.qris as Partial<QrisSetting> | undefined;
  const validQris =
    qris &&
    typeof qris.image === "string" &&
    qris.image.startsWith("/") &&
    isInt(qris.width) &&
    isInt(qris.height) &&
    typeof qris.merchantName === "string" &&
    qris.merchantName.length > 0;
  return {
    robuxRates: rates?.ok ? rates.rates : defaultSettings.robuxRates,
    orderExpiryMinutes: isValidExpiry(stored.orderExpiryMinutes)
      ? stored.orderExpiryMinutes
      : defaultSettings.orderExpiryMinutes,
    qris: validQris
      ? {
          image: qris.image!,
          width: qris.width!,
          height: qris.height!,
          merchantName: qris.merchantName!,
          nmid: typeof qris.nmid === "string" ? qris.nmid : "",
        }
      : defaultSettings.qris,
    soldOut: stored.soldOut !== undefined ? parseSoldOut(stored.soldOut, productSlugs) : defaultSettings.soldOut,
    robuxStock: isValidStock(stored.robuxStock) ? stored.robuxStock : defaultSettings.robuxStock,
  };
}
