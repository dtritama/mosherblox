/**
 * Robux pricing — PLACEHOLDER values until the client confirms real rates.
 * Everything the Robux panel shows (presets, limits, rates, tiers) is derived from this file.
 * Phase 2: load this from the API/admin panel; the server must recompute the price at checkout.
 */

export type RobuxMethodId = "gamepass" | "send-username";

export interface RobuxRateTier {
  /** The tier applies from this many Robux upwards. */
  minAmount: number;
  /** Price in IDR per 1 Robux. */
  rate: number;
}

export interface RobuxMethodLimits {
  /** Max Robux per account per day (also the max for one order). */
  daily: number;
  /** Max Robux per account per calendar month. */
  monthly: number;
}

export interface RobuxMethod {
  id: RobuxMethodId;
  /** Roblox-side limits for this method. Omit when only the global min/max apply. */
  limits?: RobuxMethodLimits;
  /** The buyer must have Roblox 2-Step Verification turned on. */
  requires2sv?: boolean;
  /** Shown first and marked as the most popular. */
  featured?: boolean;
  /** Sorted from the smallest `minAmount` (must start at 0). */
  tiers: readonly RobuxRateTier[];
}

export const robuxConfig = {
  minAmount: 100,
  maxAmount: 100_000,
  /** Step for the − / + buttons. */
  step: 100,
  defaultAmount: 1000,
  /** Quick-pick buttons (multiples of 100). */
  presets: [100, 200, 300, 400, 500, 800, 1000, 1500, 2000, 3000, 5000, 10000],
  /** The IDR total is rounded up to this many rupiah. */
  roundTo: 100,
  /** The first method is the default in the panel and the one promoted across the site. */
  methods: [
    {
      // "Via Send Username" (USN / Visend): Robux sent straight to the buyer's username.
      id: "send-username",
      featured: true,
      requires2sv: true,
      limits: { daily: 5000, monthly: 10_000 },
      tiers: [
        { minAmount: 0, rate: 125 },
        { minAmount: 1000, rate: 120 },
        { minAmount: 5000, rate: 115 },
      ],
    },
    {
      id: "gamepass",
      tiers: [
        { minAmount: 0, rate: 120 },
        { minAmount: 1000, rate: 115 },
        { minAmount: 5000, rate: 110 },
      ],
    },
  ] satisfies readonly RobuxMethod[],
} as const;
