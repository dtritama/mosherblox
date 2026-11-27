/** One completed Robux order as shown publicly on a home hero card. */
export interface RecentDelivery {
  /** Masked Roblox username (`maskUsername`). */
  name: string;
  avatarUrl: string | null;
  robux: number;
  method: RobuxDeliveryMethod;
  /** ISO time the order was completed. null = sample card (no date shown). */
  finishedAt: string | null;
}

export type RobuxDeliveryMethod = "send-username" | "gamepass";

/** Latest completed orders per method: left hero card = Send Username, right = Gamepass. */
export type RecentDeliveries = Record<RobuxDeliveryMethod, RecentDelivery[]>;

/** How many completed orders each hero card can swipe through. */
export const RECENT_DELIVERIES_LIMIT = 10;

/**
 * Used for a side with no completed orders yet (or when the database is down).
 * Illustration only: the hero hides its cards from screen readers.
 */
export const SAMPLE_DELIVERIES: RecentDeliveries = {
  "send-username": [{ name: "Builderman_01", avatarUrl: null, robux: 1700, method: "send-username", finishedAt: null }],
  gamepass: [{ name: "BloxyKid_22", avatarUrl: null, robux: 800, method: "gamepass", finishedAt: null }],
};
