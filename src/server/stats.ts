import "server-only";
import { and, count, eq, sql } from "drizzle-orm";
import { cacheLife, cacheTag } from "next/cache";
import { getDb, schema } from "@/server/db";

/**
 * Public numbers shown on the shop (cached; refreshed when an admin completes an order).
 * A database problem never breaks the page: the numbers are just left out.
 */

export const STATS_TAG = "stats";

export interface PublicStats {
  /** Completed Robux orders via Send Username (all time). null = couldn't be read. */
  sendUsernameCompleted: number | null;
  /** Robux in completed orders, every method, all time, and how many orders that is. */
  robuxSold: { total: number; orders: number } | null;
}

export async function getPublicStats(): Promise<PublicStats> {
  "use cache";
  cacheTag(STATS_TAG);
  cacheLife("minutes");
  try {
    const [row] = await getDb()
      .select({
        sendUsername: sql<number>`(count(*) filter (where ${schema.orders.robuxMethod} = 'send-username'))::int`,
        total: sql<number>`coalesce(sum(${schema.orders.robuxAmount}), 0)::float8`,
        orders: count(),
      })
      .from(schema.orders)
      .where(and(eq(schema.orders.status, "completed"), eq(schema.orders.kind, "robux")));
    return {
      sendUsernameCompleted: row?.sendUsername ?? 0,
      robuxSold: { total: row?.total ?? 0, orders: row?.orders ?? 0 },
    };
  } catch (error) {
    console.warn("[stats] using none:", error instanceof Error ? error.message : error);
    return { sendUsernameCompleted: null, robuxSold: null };
  }
}
