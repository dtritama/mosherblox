import "server-only";
import { and, avg, count, desc, eq, sql } from "drizzle-orm";
import { cacheLife, cacheTag } from "next/cache";
import { getDb, schema } from "@/server/db";
import { maskUsername } from "@/lib/mask";
import { normalizeOrderId } from "@/lib/orders/order-id";
import type { LocalizedText } from "@/i18n/config";
import { getAvatarUrls } from "@/server/roblox/users";

/**
 * Buyer reviews: one per completed order, written on Check Order (order ID + WhatsApp, like the
 * lookup), shown on the site only after an admin approves it.
 */

const { reviews, orders, admins } = schema;

export const REVIEWS_TAG = "reviews";
export const REVIEW_LIMITS = { bodyMin: 3, bodyMax: 500 } as const;

export type ReviewError = "notFound" | "notCompleted" | "alreadyReviewed" | "invalid";

function isUniqueViolation(error: unknown) {
  const cause = error instanceof Error && "cause" in error ? error.cause : error;
  return typeof cause === "object" && cause !== null && "code" in cause && cause.code === "23505";
}

export async function submitReview(input: {
  orderId: string;
  whatsapp: string;
  rating: number;
  body: string;
}): Promise<{ ok: true } | { ok: false; error: ReviewError }> {
  const id = normalizeOrderId(input.orderId);
  const body = input.body.trim().replace(/\s+\n/g, "\n");
  if (!Number.isInteger(input.rating) || input.rating < 1 || input.rating > 5) return { ok: false, error: "invalid" };
  if (body.length < REVIEW_LIMITS.bodyMin || body.length > REVIEW_LIMITS.bodyMax)
    return { ok: false, error: "invalid" };
  const db = getDb();
  const [order] = await db
    .select({ status: orders.status })
    .from(orders)
    .where(and(eq(orders.id, id), eq(orders.whatsapp, input.whatsapp)))
    .limit(1);
  if (!order) return { ok: false, error: "notFound" };
  if (order.status !== "completed") return { ok: false, error: "notCompleted" };
  try {
    await db.insert(reviews).values({ orderId: id, rating: input.rating, body });
    return { ok: true };
  } catch (error) {
    if (isUniqueViolation(error)) return { ok: false, error: "alreadyReviewed" };
    throw error;
  }
}

/** Whether this order already has a review (any status) — Check Order hides the form then. */
export async function hasReview(orderId: string) {
  const [row] = await getDb().select({ id: reviews.id }).from(reviews).where(eq(reviews.orderId, orderId)).limit(1);
  return Boolean(row);
}

export interface PublicReview {
  id: string;
  rating: number;
  body: string;
  name: string;
  avatarUrl: string | null;
  item: LocalizedText;
  createdAt: string;
}

export interface PublicReviews {
  items: PublicReview[];
  total: number;
  average: number | null;
}

/** Approved reviews for the home page (cached; refreshed when an admin moderates). */
export async function getPublicReviews(limit = 9): Promise<PublicReviews> {
  "use cache";
  cacheTag(REVIEWS_TAG);
  cacheLife("hours");
  try {
    const db = getDb();
    const [rows, [stats]] = await Promise.all([
      db
        .select({
          id: reviews.id,
          rating: reviews.rating,
          body: reviews.body,
          createdAt: reviews.createdAt,
          account: orders.account,
          robloxUserId: orders.robloxUserId,
          item: orders.itemLabel,
        })
        .from(reviews)
        .innerJoin(orders, eq(orders.id, reviews.orderId))
        .where(eq(reviews.status, "approved"))
        .orderBy(desc(reviews.createdAt))
        .limit(limit),
      db
        .select({ total: count(), average: avg(reviews.rating) })
        .from(reviews)
        .where(eq(reviews.status, "approved")),
    ]);
    const avatars = await getAvatarUrls(rows.flatMap((row) => (row.robloxUserId ? [row.robloxUserId] : []))).catch(
      () => ({}) as Record<number, string>,
    );
    return {
      total: stats?.total ?? 0,
      average: stats?.average ? Math.round(Number(stats.average) * 10) / 10 : null,
      items: rows.map((row) => ({
        id: row.id,
        rating: row.rating,
        body: row.body,
        name: maskUsername(row.account),
        avatarUrl: row.robloxUserId ? (avatars[row.robloxUserId] ?? null) : null,
        item: row.item,
        createdAt: row.createdAt.toISOString(),
      })),
    };
  } catch (error) {
    console.warn("[reviews] none shown:", error instanceof Error ? error.message : error);
    return { items: [], total: 0, average: null };
  }
}

// ----------------------------------------------------------------------------- admin

export type ReviewStatus = "pending" | "approved" | "rejected";

export interface AdminReview {
  id: string;
  orderId: string;
  status: ReviewStatus;
  rating: number;
  body: string;
  account: string;
  item: string;
  createdAt: string;
  moderatedBy: string | null;
}

export async function listReviewsForAdmin(status: ReviewStatus) {
  const db = getDb();
  const [rows, counts] = await Promise.all([
    db
      .select({ review: reviews, account: orders.account, item: orders.itemLabel, moderatedBy: admins.name })
      .from(reviews)
      .innerJoin(orders, eq(orders.id, reviews.orderId))
      .leftJoin(admins, eq(admins.id, reviews.moderatedBy))
      .where(eq(reviews.status, status))
      .orderBy(status === "pending" ? reviews.createdAt : desc(reviews.createdAt))
      .limit(100),
    db.select({ status: reviews.status, n: count() }).from(reviews).groupBy(reviews.status),
  ]);
  const byStatus = { pending: 0, approved: 0, rejected: 0 } as Record<ReviewStatus, number>;
  for (const row of counts) byStatus[row.status] = row.n;
  const items: AdminReview[] = rows.map(({ review, account, item, moderatedBy }) => ({
    id: review.id,
    orderId: review.orderId,
    status: review.status,
    rating: review.rating,
    body: review.body,
    account,
    item: item.id,
    createdAt: review.createdAt.toISOString(),
    moderatedBy,
  }));
  return { items, counts: byStatus };
}

export async function moderateReview(id: string, status: "approved" | "rejected", adminId: string) {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return false;
  const updated = await getDb()
    .update(reviews)
    .set({ status, moderatedBy: adminId, moderatedAt: sql`now()` })
    .where(eq(reviews.id, id))
    .returning({ id: reviews.id });
  return updated.length > 0;
}
