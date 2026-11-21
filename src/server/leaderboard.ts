import "server-only";
import { and, count, desc, eq, inArray, like, max, sql, sum, type SQL } from "drizzle-orm";
import { cacheLife, cacheTag } from "next/cache";
import { products } from "@/data/products";
import { GAMEPASS_SLUG_PREFIX } from "@/lib/catalog";
import type { Leaderboard, LeaderboardEntry } from "@/lib/leaderboard";
import { maskUsername } from "@/lib/mask";
import { getDb, schema } from "@/server/db";
import { getAvatarUrls } from "@/server/roblox/users";
import { STATS_TAG } from "@/server/stats";

/**
 * Top buyers per category, all time, from COMPLETED orders only. Buyers are grouped by Roblox
 * username (case-insensitive) and shown masked. Voucher products (sent to an email) are left out.
 */

export { LEADERBOARD_CATEGORIES } from "@/lib/leaderboard";

const { orders } = schema;
const LIMIT = 10;
const ITEM_SLUGS = products.filter((product) => product.category === "items").map((product) => product.slug);

async function top(filter: SQL, metric: "robux" | "orders") {
  const buyer = sql<string>`lower(${orders.account})`;
  const value =
    metric === "robux" ? sql<number>`coalesce(${sum(orders.robuxAmount)}, 0)::int` : sql<number>`${count()}::int`;
  return (
    getDb()
      .select({
        account: max(orders.account),
        robloxUserId: max(orders.robloxUserId),
        value,
      })
      .from(orders)
      .where(and(eq(orders.status, "completed"), filter))
      .groupBy(buyer)
      // Ties: whoever spent more ranks higher.
      .orderBy(desc(value), desc(sum(orders.total)))
      .limit(LIMIT)
  );
}

export async function getLeaderboard(): Promise<Leaderboard> {
  "use cache";
  cacheTag(STATS_TAG);
  cacheLife("minutes");
  const empty: Leaderboard = { robux: [], gamepass: [], items: [] };
  try {
    const [robux, gamepass, items] = await Promise.all([
      top(eq(orders.kind, "robux"), "robux"),
      top(and(eq(orders.kind, "product"), like(orders.productSlug, `${GAMEPASS_SLUG_PREFIX}%`))!, "orders"),
      ITEM_SLUGS.length > 0
        ? top(and(eq(orders.kind, "product"), inArray(orders.productSlug, ITEM_SLUGS))!, "orders")
        : Promise.resolve([]),
    ]);
    const ids = [...robux, ...gamepass, ...items].flatMap((row) => (row.robloxUserId ? [row.robloxUserId] : []));
    const avatars = await getAvatarUrls(ids).catch(() => ({}) as Record<number, string>);
    const shape = (rows: Awaited<ReturnType<typeof top>>): LeaderboardEntry[] =>
      rows.map((row, index) => ({
        rank: index + 1,
        name: maskUsername(row.account ?? ""),
        avatarUrl: row.robloxUserId ? (avatars[row.robloxUserId] ?? null) : null,
        value: Number(row.value) || 0,
      }));
    return { robux: shape(robux), gamepass: shape(gamepass), items: shape(items) };
  } catch (error) {
    console.warn("[leaderboard] none shown:", error instanceof Error ? error.message : error);
    return empty;
  }
}
