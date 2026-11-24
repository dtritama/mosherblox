import "server-only";
import { headers } from "next/headers";

/**
 * Small in-memory fixed-window rate limiter. Good enough for one app instance on the VPS
 * (counters reset on restart). If the app ever runs on several instances, move this to
 * Postgres or Redis behind the same `rateLimit()` call.
 */

interface Window {
  count: number;
  resetAt: number;
}

const buckets = new Map<string, Window>();
let lastSweep = 0;

function sweep(now: number) {
  if (now - lastSweep < 60_000) return;
  lastSweep = now;
  for (const [key, window] of buckets) if (window.resetAt <= now) buckets.delete(key);
}

/** Counts one hit for `key`; returns false once `limit` hits happened inside `windowMs`. */
export function hit(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  sweep(now);
  const window = buckets.get(key);
  if (!window || window.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }
  window.count += 1;
  return window.count <= limit;
}

/**
 * The visitor's IP. In production the app sits behind Caddy, which sets X-Forwarded-For;
 * the left-most entry is the client. (Without a proxy in front this header can be faked —
 * never expose the app port directly.)
 */
export async function clientIp(): Promise<string> {
  const h = await headers();
  return h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || "unknown";
}

export const RATE_LIMITS = {
  /** Check Order: ID + WhatsApp guesses. */
  lookup: { limit: 20, windowMs: 10 * 60_000 },
  /** Automatic progress checks of an open order (shared mobile IPs: generous). */
  orderLive: { limit: 3000, windowMs: 10 * 60_000 },
  /** …and the ones with a wrong ID / WhatsApp. */
  orderLiveMiss: { limit: 10, windowMs: 10 * 60_000 },
  /** Roblox username preview while typing (debounced in the browser). */
  robloxLookup: { limit: 60, windowMs: 10 * 60_000 },
  /** Writing a review. */
  review: { limit: 5, windowMs: 10 * 60_000 },
  /** New orders from one connection. */
  createOrder: { limit: 10, windowMs: 10 * 60_000 },
  /** "Saya sudah bayar" (with uploads). */
  claimPayment: { limit: 10, windowMs: 10 * 60_000 },
  /** Admin login attempts from one connection. */
  adminLogin: { limit: 10, windowMs: 15 * 60_000 },
} as const;

export async function rateLimit(name: keyof typeof RATE_LIMITS): Promise<boolean> {
  const { limit, windowMs } = RATE_LIMITS[name];
  return hit(`${name}:${await clientIp()}`, limit, windowMs);
}

/** Whether the limit is already used up, without counting a hit. */
export async function isOverLimit(name: keyof typeof RATE_LIMITS): Promise<boolean> {
  const window = buckets.get(`${name}:${await clientIp()}`);
  return window !== undefined && window.resetAt > Date.now() && window.count >= RATE_LIMITS[name].limit;
}
