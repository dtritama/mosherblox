import "server-only";
import { and, desc, eq, inArray, lt, notExists, sql } from "drizzle-orm";
import { getPaymentMethod } from "@/data/payments";
import { orderConfig } from "@/data/orders";
import { getDb, schema } from "@/server/db";
import type { OrderRow, PaymentRow } from "@/server/db/schema";
import { createOrderId, normalizeOrderId } from "@/lib/orders/order-id";
import { canTransition } from "@/lib/orders/status";
import type { Order, OrderStatus } from "@/lib/orders/types";
import type { OrderQuote } from "@/server/orders/quote";
import { providerFor } from "@/server/payments/provider";
import { deliveryProofUrl } from "@/server/payments/proof-storage";
import { SETTING_KEYS } from "@/lib/settings";

/**
 * Order domain: create, look up and move orders through the status machine, and record the
 * buyer's "Saya sudah bayar". Server actions (./actions.ts) and later the admin panel and the
 * worker call these — never the database directly.
 */

const { orders, orderEvents, payments } = schema;

export type Actor = "system" | "buyer" | "admin" | "provider";

type Db = ReturnType<typeof getDb>;
type Tx = Parameters<Parameters<Db["transaction"]>[0]>[0];

export class OrderTransitionError extends Error {
  constructor(
    readonly orderId: string,
    readonly from: OrderStatus | null,
    readonly to: OrderStatus,
  ) {
    super(from ? `Order ${orderId}: ${from} → ${to} is not allowed` : `Order ${orderId} not found`);
  }
}

const graceMs = orderConfig.paymentGraceMinutes * 60_000;

/** Shape database rows for the browser (only what the UI shows). */
export function toOrder(row: OrderRow, payment?: PaymentRow | null): Order {
  return {
    id: row.id,
    status: row.status,
    createdAt: row.createdAt.toISOString(),
    expiresAt: row.expiresAt.toISOString(),
    claimUntil: new Date(row.expiresAt.getTime() + graceMs).toISOString(),
    product: row.productName,
    item: row.itemLabel,
    account: row.account,
    whatsapp: row.whatsapp,
    payment: payment?.payTo?.name ?? getPaymentMethod(row.paymentMethod)?.name ?? row.paymentMethod,
    payTo: payment?.payTo ?? null,
    total: row.total,
    uniqueCode: row.uniqueCode,
    paymentStatus: payment?.status ?? null,
    hasProof: Boolean(payment?.proofPath),
    hasReview: false,
    deliveryProofUrls: row.deliveryProofs.map(deliveryProofUrl),
    adminNote: null,
  };
}

async function latestPayment(db: Db | Tx, orderId: string) {
  const [payment] = await db
    .select()
    .from(payments)
    .where(eq(payments.orderId, orderId))
    .orderBy(desc(payments.createdAt))
    .limit(1);
  return payment ?? null;
}

function randomUniqueCode() {
  const bytes = new Uint32Array(1);
  crypto.getRandomValues(bytes);
  return 1 + (bytes[0] % orderConfig.uniqueCodeMax);
}

/** Postgres "unique_violation" — a random order ID or pending total that is already taken. */
function isUniqueViolation(error: unknown) {
  const cause = error instanceof Error && "cause" in error ? error.cause : error;
  return typeof cause === "object" && cause !== null && "code" in cause && cause.code === "23505";
}

export async function createOrder(
  { payTo, ...quote }: OrderQuote,
  { expiryMinutes = orderConfig.expiryMinutes }: { expiryMinutes?: number } = {},
): Promise<Order> {
  const db = getDb();
  const provider = providerFor(quote.paymentMethod, payTo);
  // The order ID and unique code are random; on the rare clash with another order, roll again.
  // With 99 possible codes, re-roll generously before giving up.
  for (let attempt = 0; attempt < 20; attempt++) {
    const uniqueCode = randomUniqueCode();
    const id = createOrderId();
    const total = quote.subtotal + quote.fee + uniqueCode;
    try {
      const [row, payment] = await db.transaction(async (tx) => {
        const [created] = await tx
          .insert(orders)
          .values({
            id,
            ...quote,
            uniqueCode,
            total,
            expiresAt: new Date(Date.now() + expiryMinutes * 60_000),
          })
          .returning();
        const [paymentRow] = await tx
          .insert(payments)
          .values(provider.createPayment({ id, total, uniqueCode }))
          .returning();
        await tx.insert(orderEvents).values({ orderId: id, toStatus: "pending", actor: "buyer" });
        return [created, paymentRow] as const;
      });
      return toOrder(row, payment);
    } catch (error) {
      if (!isUniqueViolation(error)) throw error;
    }
  }
  throw new Error("Could not allocate a unique order total — too many pending orders with the same price.");
}

/**
 * Move an order to a new status, if the status machine allows it. Locks the row so two admins
 * (or the worker and an admin) can't change the same order at once, and logs an order event.
 */
export async function transitionOrder(
  orderId: string,
  to: OrderStatus,
  by: { actor: Actor; adminId?: string; note?: string; buyerNote?: boolean; expectedFrom?: OrderStatus },
): Promise<Order> {
  const [row, payment] = await getDb().transaction(async (tx) => {
    const [current] = await tx.select().from(orders).where(eq(orders.id, orderId)).for("update");
    const stale = by.expectedFrom !== undefined && current?.status !== by.expectedFrom;
    if (!current || stale || !canTransition(current.status, to)) {
      throw new OrderTransitionError(orderId, current?.status ?? null, to);
    }
    const now = new Date();
    const [updated] = await tx
      .update(orders)
      .set({
        status: to,
        ...(to === "paid" ? { paidAt: now } : {}),
        ...(to === "completed" ? { completedAt: now, paidAt: current.paidAt ?? now } : {}),
      })
      .where(eq(orders.id, orderId))
      .returning();
    // Keep the payment in step with the order.
    const open = and(eq(payments.orderId, orderId), inArray(payments.status, ["pending", "submitted"]));
    if (to === "expired") {
      await tx.update(payments).set({ status: "expired" }).where(open);
    } else if (to === "paid" || (to === "completed" && current.status === "pending")) {
      await tx
        .update(payments)
        .set({ status: "confirmed", confirmedBy: by.adminId ?? null, confirmedAt: now })
        .where(open);
    } else if (to === "failed" && current.status === "pending") {
      await tx.update(payments).set({ status: "rejected" }).where(open);
    }
    // Delivered Robux leave the store's stock (only if the owner tracks stock; never below 0).
    if (to === "completed" && current.kind === "robux" && current.robuxAmount) {
      await tx
        .update(schema.settings)
        .set({ value: sql`to_jsonb(GREATEST((${schema.settings.value})::text::int - ${current.robuxAmount}, 0))` })
        .where(
          and(eq(schema.settings.key, SETTING_KEYS.robuxStock), sql`jsonb_typeof(${schema.settings.value}) = 'number'`),
        );
    }
    await tx.insert(orderEvents).values({
      orderId,
      fromStatus: current.status,
      toStatus: to,
      actor: by.actor,
      adminId: by.adminId,
      note: by.note,
      buyerNote: Boolean(by.note && by.buyerNote),
    });
    return [updated, await latestPayment(tx, orderId)] as const;
  });
  return toOrder(row, payment);
}

/**
 * A pending order expires once the payment window and the grace period have passed — unless the
 * buyer already said they paid: then an admin has to check the money first (never auto-expire a
 * possibly paid order).
 */
function shouldExpire(row: OrderRow, payment: PaymentRow | null) {
  return row.status === "pending" && payment?.status !== "submitted" && row.expiresAt.getTime() + graceMs <= Date.now();
}

/**
 * Check Order lookup: the ID and the WhatsApp number must both match, so an ID alone
 * reveals nothing. An order past its window is expired on the spot (the worker in roadmap
 * step 6 also does this in the background).
 */
export async function findOrder(rawId: string, whatsapp: string): Promise<Order | null> {
  const id = normalizeOrderId(rawId);
  if (!id) return null;
  const db = getDb();
  const [row] = await db
    .select()
    .from(orders)
    .where(and(eq(orders.id, id), eq(orders.whatsapp, whatsapp)))
    .limit(1);
  if (!row) return null;
  const payment = await latestPayment(db, row.id);
  if (shouldExpire(row, payment)) {
    try {
      return await transitionOrder(row.id, "expired", { actor: "system", note: "Tidak dibayar sampai batas waktu" });
    } catch (error) {
      // Someone else changed it at the same moment (e.g. admin marked it paid) — show that instead.
      if (!(error instanceof OrderTransitionError)) throw error;
      return findOrder(id, whatsapp);
    }
  }
  const order = toOrder(row, payment);
  if (order.status === "failed" || order.status === "completed")
    order.adminNote = await adminNote(db, row.id, order.status);
  return order;
}

/** The note an admin wrote for the buyer when failing or completing the order. Other notes stay private. */
async function adminNote(db: Db, orderId: string, status: "failed" | "completed") {
  const [event] = await db
    .select({ note: orderEvents.note })
    .from(orderEvents)
    .where(
      and(
        eq(orderEvents.orderId, orderId),
        eq(orderEvents.toStatus, status),
        eq(orderEvents.actor, "admin"),
        // Older "completed" notes were written as admin-only.
        status === "failed" ? undefined : eq(orderEvents.buyerNote, true),
      ),
    )
    .orderBy(desc(orderEvents.id))
    .limit(1);
  return event?.note?.trim() || null;
}

export type ClaimError = "notFound" | "notPending" | "tooLate";

/**
 * The buyer pressed "Saya sudah bayar" (optionally with a screenshot). The order stays pending —
 * only an admin (or later a gateway webhook) moves it to paid — but the payment becomes
 * "submitted" so the admin sees it and the order no longer auto-expires.
 * Needs the order ID and WhatsApp number, like the lookup.
 */
export async function claimPayment(
  rawId: string,
  whatsapp: string,
  proofPath: string | null,
): Promise<{ ok: true; order: Order; firstClaim: boolean } | { ok: false; error: ClaimError }> {
  const id = normalizeOrderId(rawId);
  if (!id) return { ok: false, error: "notFound" };
  return getDb().transaction(async (tx) => {
    const [row] = await tx
      .select()
      .from(orders)
      .where(and(eq(orders.id, id), eq(orders.whatsapp, whatsapp)))
      .for("update");
    if (!row) return { ok: false, error: "notFound" } as const;
    const payment = await latestPayment(tx, id);
    if (row.status !== "pending" || !payment || !["pending", "submitted"].includes(payment.status)) {
      return { ok: false, error: "notPending" } as const;
    }
    if (payment.status === "pending" && row.expiresAt.getTime() + graceMs <= Date.now()) {
      return { ok: false, error: "tooLate" } as const;
    }
    const now = new Date();
    const [updated] = await tx
      .update(payments)
      .set({
        status: "submitted",
        ...(proofPath ? { proofPath, proofUploadedAt: now } : {}),
      })
      .where(eq(payments.id, payment.id))
      .returning();
    await tx.insert(orderEvents).values({
      orderId: id,
      fromStatus: "pending",
      toStatus: "pending",
      actor: "buyer",
      note: proofPath ? "Dengan bukti transfer" : "Tanpa bukti transfer",
    });
    // firstClaim: only the first "Saya sudah bayar" pings the team (adding a screenshot later doesn't).
    return { ok: true, order: toOrder(row, updated), firstClaim: payment.status === "pending" } as const;
  });
}

/**
 * Worker job: expire every unpaid order past its window + grace, except those whose buyer said
 * they paid (an admin must check those). Returns how many were expired.
 */
export async function expireOverdueOrders(limit = 200): Promise<number> {
  const cutoff = new Date(Date.now() - graceMs);
  const candidates = await getDb()
    .select({ id: orders.id })
    .from(orders)
    .where(
      and(
        eq(orders.status, "pending"),
        lt(orders.expiresAt, cutoff),
        notExists(
          getDb()
            .select({ one: sql`1` })
            .from(payments)
            .where(and(eq(payments.orderId, orders.id), eq(payments.status, "submitted"))),
        ),
      ),
    )
    .limit(limit);
  let expired = 0;
  for (const { id } of candidates) {
    try {
      await transitionOrder(id, "expired", { actor: "system", note: "Tidak dibayar sampai batas waktu" });
      expired++;
    } catch (error) {
      // Changed meanwhile (paid by an admin, or the buyer pressed "Saya sudah bayar"): leave it.
      if (!(error instanceof OrderTransitionError)) throw error;
    }
  }
  return expired;
}

/** What a team notification shows about an order (Roblox account for delivery; no WhatsApp number). */
export async function getOrderSummary(orderId: string) {
  const [row] = await getDb().select().from(orders).where(eq(orders.id, orderId)).limit(1);
  if (!row) return null;
  const payment = await latestPayment(getDb(), orderId);
  return {
    id: row.id,
    status: row.status,
    kind: row.kind,
    item: row.itemLabel.id,
    productName: row.productName,
    robuxAmount: row.robuxAmount,
    robuxMethod: row.robuxMethod,
    // The buyer's Roblox account (needed by the team to deliver). No WhatsApp number.
    account: row.account,
    robloxUserId: row.robloxUserId,
    robloxDisplayName: row.robloxDisplayName,
    subtotal: row.subtotal + row.fee,
    uniqueCode: row.uniqueCode,
    total: row.total,
    createdAt: row.createdAt.toISOString(),
    hasProof: Boolean(payment?.proofPath),
    paymentStatus: payment?.status ?? null,
    paymentName: payment?.payTo?.name ?? null,
  };
}
