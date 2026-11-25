import { robuxConfig, type RobuxMethod, type RobuxMethodId, type RobuxRateTier } from "@/data/robux";

/** Roblox keeps 30% of every Gamepass sale, so the Gamepass must be priced higher than the Robux received. */
export const ROBLOX_MARKETPLACE_FEE = 0.3;

/**
 * Price tiers per method. The defaults live in src/data/robux.ts; the admin can override them
 * (settings page), so every price function takes the rates in effect as an optional argument.
 */
export type RobuxRates = Readonly<Record<RobuxMethodId, readonly RobuxRateTier[]>>;

export const defaultRobuxRates: RobuxRates = Object.fromEntries(
  robuxConfig.methods.map((method) => [method.id, method.tiers]),
) as unknown as RobuxRates;

export function getGamepassPrice(robuxReceived: number) {
  return Math.ceil(robuxReceived / (1 - ROBLOX_MARKETPLACE_FEE));
}

/** Method info (limits, 2SV…) with the tiers currently in effect. */
export function getRobuxMethod(id: RobuxMethodId, rates: RobuxRates = defaultRobuxRates): RobuxMethod {
  const method = robuxConfig.methods.find((item) => item.id === id);
  if (!method) throw new Error(`Unknown Robux method "${id}" in data/robux.ts`);
  return { ...method, tiers: rates[id] ?? method.tiers };
}

/** The tier that applies to `amount` (the highest tier whose minimum is reached). */
export function getRobuxTier(methodId: RobuxMethodId, amount: number, rates?: RobuxRates): RobuxRateTier {
  const { tiers } = getRobuxMethod(methodId, rates);
  return tiers.reduce((current, tier) => (amount >= tier.minAmount ? tier : current), tiers[0]);
}

/** The next cheaper tier above `amount`, if any — used for "buy X more to save" hints. */
export function getNextRobuxTier(
  methodId: RobuxMethodId,
  amount: number,
  rates?: RobuxRates,
): RobuxRateTier | undefined {
  return getRobuxMethod(methodId, rates).tiers.find((tier) => tier.minAmount > amount);
}

/** IDR price for `amount` Robux, rounded up to `robuxConfig.roundTo`. */
export function calculateRobuxPrice(methodId: RobuxMethodId, amount: number, rates?: RobuxRates) {
  const { rate } = getRobuxTier(methodId, amount, rates);
  const { roundTo } = robuxConfig;
  return Math.ceil((amount * rate) / roundTo) * roundTo;
}

/** Lowest rate offered by a method (or across all methods). */
export function getLowestRobuxRate(methodId?: RobuxMethodId, rates: RobuxRates = defaultRobuxRates) {
  const ids = methodId ? [methodId] : robuxConfig.methods.map((method) => method.id);
  return Math.min(...ids.flatMap((id) => rates[id].map((tier) => tier.rate)));
}

/** Largest amount one order can have with this method (its daily limit, if it has one). */
export function getRobuxMaxAmount(methodId: RobuxMethodId) {
  const method = getRobuxMethod(methodId);
  return method.limits ? Math.min(method.limits.daily, robuxConfig.maxAmount) : robuxConfig.maxAmount;
}

export function clampRobuxAmount(amount: number, methodId?: RobuxMethodId) {
  const max = methodId ? getRobuxMaxAmount(methodId) : robuxConfig.maxAmount;
  return Math.min(max, Math.max(robuxConfig.minAmount, Math.round(amount)));
}

/** Too little Robux left for even the smallest order (null = stock not tracked). */
export const isRobuxOutOfStock = (stock: number | null) => stock !== null && stock < robuxConfig.minAmount;

/** Most Robux one order can have right now: the method's limit or what is left in stock. */
export function getRobuxOrderMax(method: RobuxMethodId, stock: number | null) {
  const max = getRobuxMaxAmount(method);
  return stock === null || isRobuxOutOfStock(stock) ? max : Math.min(max, stock);
}
