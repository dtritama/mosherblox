"use server";

import { isRobloxUsername } from "@/lib/validation";
import { rateLimit } from "@/server/rate-limit";
import { lookupRobloxUser, type RobloxUser } from "@/server/roblox/users";

export type RobloxLookupResult =
  { ok: true; user: RobloxUser } | { ok: false; error: "invalid" | "notFound" | "unavailable" | "rateLimited" };

/** Checkout preview: who is this username? (display name + avatar). */
export async function lookupRobloxUserAction(username: string): Promise<RobloxLookupResult> {
  const name = typeof username === "string" ? username.trim().slice(0, 20) : "";
  if (!isRobloxUsername(name)) return { ok: false, error: "invalid" };
  if (!(await rateLimit("robloxLookup"))) return { ok: false, error: "rateLimited" };
  try {
    // Cache key is case-insensitive: Roblox usernames are.
    const user = await lookupRobloxUser(name.toLowerCase());
    return user ? { ok: true, user } : { ok: false, error: "notFound" };
  } catch (error) {
    console.warn("[roblox] lookup failed:", error instanceof Error ? error.message : error);
    return { ok: false, error: "unavailable" };
  }
}
