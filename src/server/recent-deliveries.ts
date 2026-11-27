import "server-only";
import { and, desc, eq, sql } from "drizzle-orm";
import { cacheLife, cacheTag } from "next/cache";
import {
  RECENT_DELIVERIES_LIMIT,
  type RecentDeliveries,
  type RecentDelivery,
  type RobuxDeliveryMethod,
} from "@/lib/recent-deliveries";
import { maskUsername } from "@/lib/mask";
import { getDb, schema } from "@/server/db";
import { getAvatarUrls } from "@/server/roblox/users";
import { STATS_TAG } from "@/server/stats";

const { orders } = schema;

async function latest(method: RobuxDeliveryMethod) {
  const finishedAt = sql<Date>`coalesce(${orders.completedAt}, ${orders.updatedAt})`;
  return getDb()
    .select({
      account: orders.account,
      robloxUserId: orders.robloxUserId,
      robux: orders.robuxAmount,
      finishedAt,
    })
    .from(orders)
    .where(and(eq(orders.status, "completed"), eq(orders.kind, "robux"), eq(orders.robuxMethod, method)))
    .orderBy(desc(finishedAt))
    .limit(RECENT_DELIVERIES_LIMIT);
}

/**
 * The latest COMPLETED Robux orders per method for the home hero cards: masked name, Roblox
 * avatar, amount and when it was finished. No order ID, price or contact data (public page).
 * Cached with the stats tag, so completing an order in /admin refreshes it.
 * A database problem returns empty lists and the hero shows its sample cards instead.
 */
export async function getRecentDeliveries(): Promise<RecentDeliveries> {
  "use cache";
  cacheTag(STATS_TAG);
  cacheLife("minutes");
  try {
    const [sendUsername, gamepass] = await Promise.all([latest("send-username"), latest("gamepass")]);
    const ids = [...sendUsername, ...gamepass].flatMap((row) => (row.robloxUserId ? [row.robloxUserId] : []));
    const avatars = await getAvatarUrls(ids).catch(() => ({}) as Record<number, string>);
    const shape = (rows: typeof sendUsername, method: RobuxDeliveryMethod): RecentDelivery[] =>
      rows.flatMap((row) =>
        row.robux
          ? [
              {
                name: maskUsername(row.account),
                avatarUrl: row.robloxUserId ? (avatars[row.robloxUserId] ?? null) : null,
                robux: row.robux,
                method,
                finishedAt: new Date(row.finishedAt).toISOString(),
              },
            ]
          : [],
      );
    return { "send-username": shape(sendUsername, "send-username"), gamepass: shape(gamepass, "gamepass") };
  } catch (error) {
    console.warn("[recent-deliveries] none shown:", error instanceof Error ? error.message : error);
    return { "send-username": [], gamepass: [] };
  }
}
