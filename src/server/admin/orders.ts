import "server-only";
import { and, asc, count, desc, eq, gte, ilike, inArray, lt, max, or, type SQL } from "drizzle-orm";
import type { PayTo } from "@/lib/payment-methods";
import { getPaymentMethod } from "@/data/payments";
import { deliveryProofUrl } from "@/server/payments/proof-storage";
import { getDb, schema } from "@/server/db";
import type { OrderStatus, PaymentStatus } from "@/lib/orders/types";
import type { ExportRange } from "@/lib/export-period";
import { normalizeWhatsapp } from "@/lib/validation";

/**
 * Read models for the admin panel. Callers must have checked `requireAdmin()` first.
 * Returned shapes are plain objects (dates as ISO strings) — only what the pages show.
 */

const { orders, payments, orderEvents, admins } = schema;

/** "check" = pending orders where the buyer pressed "Saya sudah bayar": the admin's to-do list. "preorder" = paid (or said so) pre-orders still to be delivered. */
export const ADMIN_FILTERS = [
  "check",
  "preorder",
  "pending",
  "paid",
  "processing",
  "completed",
  "failed",
  "expired",
  "all",
] as const;
export type AdminFilter = (typeof ADMIN_FILTERS)[number];

export const isAdminFilter = (value: string): value is AdminFilter =>
  (ADMIN_FILTERS as readonly string[]).includes(value);

export const PAGE_SIZE = 25;

export interface AdminOrderListItem {
  id: string;
  status: OrderStatus;
  createdAt: string;
  productName: string;
  item: string;
  account: string;
  whatsapp: string;
  total: number;
  paymentStatus: PaymentStatus | null;
  hasProof: boolean;
  isPreorder: boolean;
}

/** Latest payment per order (one row per order). */
function latestPayments() {
  return getDb()
    .selectDistinctOn([payments.orderId], {
      orderId: payments.orderId,
      status: payments.status,
      proofPath: payments.proofPath,
      confirmedBy: payments.confirmedBy,
    })
    .from(payments)
    .orderBy(payments.orderId, desc(payments.createdAt))
    .as("lp");
}

function openPreorders(lp: ReturnType<typeof latestPayments>) {
  return and(
    eq(orders.isPreorder, true),
    or(
      inArray(orders.status, ["paid", "processing"]),
      and(eq(orders.status, "pending"), eq(lp.status, "submitted")),
    ),
  );
}

function filterWhere(filter: AdminFilter, lp: ReturnType<typeof latestPayments>): SQL | undefined {
  if (filter === "all") return undefined;
  if (filter === "check") return and(eq(orders.status, "pending"), eq(lp.status, "submitted"));
  if (filter === "preorder") return openPreorders(lp);
  return eq(orders.status, filter);
}

/** Search by order ID, WhatsApp (any format) or Roblox username / email. */
function searchWhere(q: string): SQL | undefined {
  const term = q.trim().slice(0, 64);
  if (!term) return undefined;
  const like = `%${term.replace(/[\\%_]/g, (c) => `\\${c}`)}%`;
  const phone = normalizeWhatsapp(term);
  return or(
    ilike(orders.id, like),
    ilike(orders.account, like),
    phone ? eq(orders.whatsapp, phone) : ilike(orders.whatsapp, like),
  );
}

export async function listOrders({ filter, q, page }: { filter: AdminFilter; q: string; page: number }) {
  const db = getDb();
  const lp = latestPayments();
  const where = and(filterWhere(filter, lp), searchWhere(q));

  const [rows, [{ total }]] = await Promise.all([
    db
      .select({ order: orders, paymentStatus: lp.status, proofPath: lp.proofPath })
      .from(orders)
      .leftJoin(lp, eq(lp.orderId, orders.id))
      .where(where)
      // Oldest first in the to-do lists (first come, first served); newest first elsewhere.
      .orderBy(filter === "check" || filter === "preorder" ? asc(orders.createdAt) : desc(orders.createdAt))
      .limit(PAGE_SIZE)
      .offset((page - 1) * PAGE_SIZE),
    db.select({ total: count() }).from(orders).leftJoin(lp, eq(lp.orderId, orders.id)).where(where),
  ]);

  const items: AdminOrderListItem[] = rows.map(({ order, paymentStatus, proofPath }) => ({
    id: order.id,
    status: order.status,
    createdAt: order.createdAt.toISOString(),
    productName: order.productName,
    item: order.itemLabel.id,
    account: order.account,
    whatsapp: order.whatsapp,
    total: order.total,
    paymentStatus: paymentStatus ?? null,
    hasProof: Boolean(proofPath),
    isPreorder: order.isPreorder,
  }));
  return { items, total, pages: Math.max(1, Math.ceil(total / PAGE_SIZE)) };
}

/** Every order for the CSV export, newest first, with its latest payment. */
export async function listOrdersForExport(filter: AdminFilter, { from, until }: ExportRange) {
  const lp = latestPayments();
  const rows = await getDb()
    .select({ order: orders, paymentStatus: lp.status, confirmedBy: admins.name })
    .from(orders)
    .leftJoin(lp, eq(lp.orderId, orders.id))
    .leftJoin(admins, eq(admins.id, lp.confirmedBy))
    .where(
      and(
        filterWhere(filter, lp),
        from ? gte(orders.createdAt, from) : undefined,
        until ? lt(orders.createdAt, until) : undefined,
      ),
    )
    .orderBy(desc(orders.createdAt));
  return rows.map(({ order, paymentStatus, confirmedBy }) => ({ ...order, paymentStatus, confirmedBy }));
}

/**
 * Changes whenever an order is created, claimed or changes status: each writes an order event.
 * (Count as well as max: a slower transaction can commit an event with a lower ID later.)
 */
export async function getOrdersVersion(): Promise<string> {
  const [row] = await getDb()
    .select({ last: max(orderEvents.id), total: count() })
    .from(orderEvents);
  return `${row?.last ?? 0}-${row?.total ?? 0}`;
}

/** Counts for the filter tabs. */
export async function countByFilter(): Promise<Record<AdminFilter, number>> {
  const db = getDb();
  const lp = latestPayments();
  const [byStatus, [{ check }], [{ preorder }]] = await Promise.all([
    db.select({ status: orders.status, n: count() }).from(orders).groupBy(orders.status),
    db
      .select({ check: count() })
      .from(orders)
      .innerJoin(lp, eq(lp.orderId, orders.id))
      .where(and(eq(orders.status, "pending"), eq(lp.status, "submitted"))),
    db.select({ preorder: count() }).from(orders).leftJoin(lp, eq(lp.orderId, orders.id)).where(openPreorders(lp)),
  ]);
  const result = Object.fromEntries(ADMIN_FILTERS.map((f) => [f, 0])) as Record<AdminFilter, number>;
  for (const { status, n } of byStatus) {
    result[status] = n;
    result.all += n;
  }
  result.check = check;
  result.preorder = preorder;
  return result;
}

export interface AdminOrderDetail {
  id: string;
  status: OrderStatus;
  isPreorder: boolean;
  kind: "robux" | "product";
  createdAt: string;
  expiresAt: string;
  paidAt: string | null;
  completedAt: string | null;
  /** "Bukti pengiriman" images (also shown to the buyer). */
  deliveryProofs: { file: string; url: string }[];
  productName: string;
  productSlug: string | null;
  item: string;
  robuxMethod: string | null;
  robuxAmount: number | null;
  account: string;
  /** The Roblox account the buyer confirmed; null for email products or when Roblox was unreachable. */
  robloxUserId: number | null;
  robloxDisplayName: string | null;
  whatsapp: string;
  paymentMethod: string;
  subtotal: number;
  fee: number;
  uniqueCode: number;
  total: number;
  payments: {
    id: string;
    provider: string;
    /** Transfer account shown to the buyer; null = QRIS. */
    payTo: PayTo | null;
    status: PaymentStatus;
    amount: number;
    hasProof: boolean;
    proofUploadedAt: string | null;
    confirmedBy: string | null;
    confirmedAt: string | null;
    createdAt: string;
  }[];
  events: {
    id: number;
    fromStatus: OrderStatus | null;
    toStatus: OrderStatus;
    actor: "system" | "buyer" | "admin" | "provider";
    adminName: string | null;
    note: string | null;
    createdAt: string;
  }[];
}

const iso = (date: Date | null) => (date ? date.toISOString() : null);

export async function getOrderDetail(id: string): Promise<AdminOrderDetail | null> {
  const db = getDb();
  const [order] = await db.select().from(orders).where(eq(orders.id, id)).limit(1);
  if (!order) return null;
  const [paymentRows, eventRows] = await Promise.all([
    db
      .select({ payment: payments, confirmedBy: admins.name })
      .from(payments)
      .leftJoin(admins, eq(admins.id, payments.confirmedBy))
      .where(eq(payments.orderId, id))
      .orderBy(desc(payments.createdAt)),
    db
      .select({ event: orderEvents, adminName: admins.name })
      .from(orderEvents)
      .leftJoin(admins, eq(admins.id, orderEvents.adminId))
      .where(eq(orderEvents.orderId, id))
      .orderBy(desc(orderEvents.id)),
  ]);

  return {
    id: order.id,
    status: order.status,
    isPreorder: order.isPreorder,
    kind: order.kind,
    createdAt: order.createdAt.toISOString(),
    expiresAt: order.expiresAt.toISOString(),
    paidAt: iso(order.paidAt),
    completedAt: iso(order.completedAt),
    deliveryProofs: order.deliveryProofs.map((file) => ({ file, url: deliveryProofUrl(file) })),
    productName: order.productName,
    productSlug: order.productSlug,
    item: order.itemLabel.id,
    robuxMethod: order.robuxMethod,
    robuxAmount: order.robuxAmount,
    account: order.account,
    robloxUserId: order.robloxUserId,
    robloxDisplayName: order.robloxDisplayName,
    whatsapp: order.whatsapp,
    paymentMethod: paymentRows[0]?.payment.payTo?.name ?? getPaymentMethod(order.paymentMethod)?.name ?? order.paymentMethod,
    subtotal: order.subtotal,
    fee: order.fee,
    uniqueCode: order.uniqueCode,
    total: order.total,
    payments: paymentRows.map(({ payment, confirmedBy }) => ({
      id: payment.id,
      provider: payment.provider,
      payTo: payment.payTo,
      status: payment.status,
      amount: payment.amount,
      hasProof: Boolean(payment.proofPath),
      proofUploadedAt: iso(payment.proofUploadedAt),
      confirmedBy,
      confirmedAt: iso(payment.confirmedAt),
      createdAt: payment.createdAt.toISOString(),
    })),
    events: eventRows.map(({ event, adminName }) => ({
      id: event.id,
      fromStatus: event.fromStatus,
      toStatus: event.toStatus,
      actor: event.actor,
      adminName,
      note: event.note,
      createdAt: event.createdAt.toISOString(),
    })),
  };
}

/** Where a payment's proof file is (relative to UPLOAD_DIR), for the proof route. */
export async function getProofPath(paymentId: string) {
  if (!/^[0-9a-f-]{36}$/i.test(paymentId)) return null;
  const [row] = await getDb()
    .select({ proofPath: payments.proofPath })
    .from(payments)
    .where(eq(payments.id, paymentId))
    .limit(1);
  return row?.proofPath ?? null;
}
