import "server-only";
import { cacheLife, cacheTag } from "next/cache";

/**
 * Roblox's public web APIs (no key needed). Used to show the buyer which account they typed
 * (display name + avatar) and to attach the account's Roblox user ID to an order.
 * Results are cached; a network failure throws (and is not cached) so callers can decide.
 */

export interface RobloxUser {
  id: number;
  /** Canonical username (Roblox's own casing). */
  name: string;
  displayName: string;
  /** Headshot on tr.rbxcdn.com, or null when Roblox has none ready. */
  avatarUrl: string | null;
}

const TIMEOUT = 5000;

async function robloxFetch(url: string, init?: RequestInit) {
  const response = await fetch(url, {
    ...init,
    headers: { Accept: "application/json", ...(init?.body ? { "Content-Type": "application/json" } : {}) },
    signal: AbortSignal.timeout(TIMEOUT),
    cache: "no-store",
  });
  if (!response.ok) throw new Error(`Roblox API ${response.status} for ${new URL(url).pathname}`);
  return response.json() as Promise<unknown>;
}

/** Only accept image URLs on Roblox's own CDN (they end up in an <img> on our pages). */
const safeAvatar = (url: unknown) =>
  typeof url === "string" && /^https:\/\/tr\.rbxcdn\.com\/[\w./-]+$/.test(url) ? url : null;

/** Headshot URLs for up to 100 users per call. Missing / not-ready avatars are left out. */
export async function getAvatarUrls(ids: readonly number[]): Promise<Record<number, string>> {
  "use cache";
  cacheLife("hours");
  cacheTag("roblox-avatars");
  const unique = [...new Set(ids)].filter((id) => Number.isSafeInteger(id) && id > 0).slice(0, 100);
  if (unique.length === 0) return {};
  const json = (await robloxFetch(
    `https://thumbnails.roblox.com/v1/users/avatar-headshot?userIds=${unique.join(",")}&size=150x150&format=Png&isCircular=false`,
  )) as { data?: { targetId?: number; state?: string; imageUrl?: string }[] };
  const out: Record<number, string> = {};
  for (const item of json.data ?? []) {
    const url = item.state === "Completed" ? safeAvatar(item.imageUrl) : null;
    if (url && typeof item.targetId === "number") out[item.targetId] = url;
  }
  return out;
}

/** Looks a username up. null = no such (non-banned) account. Throws when Roblox can't be reached. */
export async function lookupRobloxUser(username: string): Promise<RobloxUser | null> {
  "use cache";
  cacheLife("hours");
  cacheTag("roblox-users");
  const json = (await robloxFetch("https://users.roblox.com/v1/usernames/users", {
    method: "POST",
    body: JSON.stringify({ usernames: [username], excludeBannedUsers: true }),
  })) as { data?: { id?: number; name?: string; displayName?: string }[] };
  const user = json.data?.[0];
  if (!user || typeof user.id !== "number" || typeof user.name !== "string") return null;
  const avatars = await getAvatarUrls([user.id]).catch(() => ({}) as Record<number, string>);
  return {
    id: user.id,
    name: user.name,
    displayName: typeof user.displayName === "string" && user.displayName ? user.displayName : user.name,
    avatarUrl: avatars[user.id] ?? null,
  };
}
