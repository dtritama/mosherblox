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

export interface SiteSettings {
  robuxRates: RobuxRates;
  orderExpiryMinutes: number;
  qris: QrisSetting;
}

export const defaultSettings: SiteSettings = {
  robuxRates: defaultRobuxRates,
  orderExpiryMinutes: orderConfig.expiryMinutes,
  qris: { ...manualQris },
};

/** Keys in the `settings` table. */
export const SETTING_KEYS = {
  robuxRates: "robux.rates",
  orderExpiryMinutes: "orders.expiryMinutes",
  qris: "payment.qris",
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

export function isValidExpiry(value: unknown): value is number {
  return isInt(value) && value >= SETTING_LIMITS.expiryMin && value <= SETTING_LIMITS.expiryMax;
}

/** Merges stored values over the defaults, ignoring anything malformed (never breaks the shop). */
export function mergeSettings(stored: Partial<Record<keyof SiteSettings, unknown>>): SiteSettings {
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
  };
}
