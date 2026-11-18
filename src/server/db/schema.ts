/**
 * Database schema (PostgreSQL + Drizzle). After changing this file:
 *   npm run db:generate   → writes a new SQL migration to drizzle/
 *   npm run db:migrate    → applies it
 * Money is always whole rupiah (integer IDR). Timestamps are timestamptz.
 */
import { sql } from "drizzle-orm";
import {
  bigint,
  check,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import type { LocalizedText } from "@/i18n/config";

const createdAt = () => timestamp("created_at", { withTimezone: true }).notNull().defaultNow();
const updatedAt = () =>
  timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date());

// ---------------------------------------------------------------------------------------------
// Enums
// ---------------------------------------------------------------------------------------------

/** pending → paid → processing → completed | failed; pending → expired (unpaid in time). */
export const orderStatus = pgEnum("order_status", ["pending", "paid", "processing", "completed", "failed", "expired"]);

/** Robux have their own pricing (src/data/robux.ts); everything else is a catalog product. */
export const orderKind = pgEnum("order_kind", ["robux", "product"]);

export const robuxMethod = pgEnum("robux_method", ["send-username", "gamepass"]);

/** Who caused an order event (audit log). */
export const actorType = pgEnum("actor_type", ["system", "buyer", "admin", "provider"]);

/**
 * pending:   waiting for the buyer to pay
 * submitted: buyer pressed "Saya sudah bayar" (optionally with proof)
 * confirmed: admin (or a gateway webhook) confirmed the money arrived
 * rejected:  admin found no matching payment
 * expired:   never paid before the order expired
 */
export const paymentStatus = pgEnum("payment_status", ["pending", "submitted", "confirmed", "rejected", "expired"]);

export const adminRole = pgEnum("admin_role", ["owner", "staff"]);

// ---------------------------------------------------------------------------------------------
// Admins (store owner + staff). Customer accounts come later (phase 3).
// ---------------------------------------------------------------------------------------------

export const admins = pgTable("admins", {
  id: uuid("id").primaryKey().defaultRandom(),
  /** Stored lower-case. */
  email: text("email").notNull().unique(),
  name: text("name").notNull(),
  passwordHash: text("password_hash").notNull(),
  role: adminRole("role").notNull().default("staff"),
  disabledAt: timestamp("disabled_at", { withTimezone: true }),
  lastLoginAt: timestamp("last_login_at", { withTimezone: true }),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

// ---------------------------------------------------------------------------------------------
// Orders
// ---------------------------------------------------------------------------------------------

export const orders = pgTable(
  "orders",
  {
    /** MB- + 8 chars (src/lib/orders/order-id.ts). */
    id: text("id").primaryKey(),
    status: orderStatus("status").notNull().default("pending"),
    kind: orderKind("kind").notNull(),

    // What was bought. References point at src/data/* (content lives in code, not in the DB).
    /** Product slug for kind = product (e.g. "roblox-premium", "gamepass-blox-fruits"). */
    productSlug: text("product_slug"),
    /** Product option id for kind = product. */
    optionId: text("option_id"),
    robuxMethod: robuxMethod("robux_method"),
    robuxAmount: integer("robux_amount"),
    /** Snapshots at order time, so later catalog edits don't rewrite history. */
    productName: text("product_name").notNull(),
    itemLabel: jsonb("item_label").$type<LocalizedText>().notNull(),

    // Buyer
    /** Roblox username, or email for voucher products. */
    account: text("account").notNull(),
    /** Normalised 628xxxxxxxxx. Needed together with the ID to look an order up. */
    whatsapp: text("whatsapp").notNull(),
    /** Payment method id from src/data/payments.ts (e.g. "qris"). */
    paymentMethod: text("payment_method").notNull(),

    // Money (IDR), all computed on the server: total = subtotal + fee + unique_code.
    subtotal: integer("subtotal").notNull(),
    fee: integer("fee").notNull().default(0),
    /** Small amount added so a manual QRIS transfer can be matched to this order (e.g. +47). */
    uniqueCode: integer("unique_code").notNull().default(0),
    total: integer("total").notNull(),

    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    paidAt: timestamp("paid_at", { withTimezone: true }),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    index("orders_whatsapp_idx").on(t.whatsapp),
    index("orders_status_created_idx").on(t.status, t.createdAt),
    // Two unpaid orders must never share a total, otherwise a QRIS transfer can't be matched.
    uniqueIndex("orders_pending_total_unique")
      .on(t.total)
      .where(sql`${t.status} = 'pending'`),
    check("orders_money_check", sql`${t.subtotal} >= 0 AND ${t.fee} >= 0 AND ${t.uniqueCode} >= 0`),
    check("orders_total_check", sql`${t.total} = ${t.subtotal} + ${t.fee} + ${t.uniqueCode}`),
    check(
      "orders_kind_check",
      sql`(${t.kind} = 'robux' AND ${t.robuxMethod} IS NOT NULL AND ${t.robuxAmount} > 0)
        OR (${t.kind} = 'product' AND ${t.productSlug} IS NOT NULL AND ${t.optionId} IS NOT NULL)`,
    ),
  ],
);

/** Every status change (and notable action) on an order — the audit log / status history. */
export const orderEvents = pgTable(
  "order_events",
  {
    id: bigint("id", { mode: "number" }).primaryKey().generatedAlwaysAsIdentity(),
    orderId: text("order_id")
      .notNull()
      .references(() => orders.id, { onDelete: "cascade" }),
    /** Null for the "created" event. */
    fromStatus: orderStatus("from_status"),
    toStatus: orderStatus("to_status").notNull(),
    actor: actorType("actor").notNull(),
    adminId: uuid("admin_id").references(() => admins.id, { onDelete: "set null" }),
    note: text("note"),
    createdAt: createdAt(),
  },
  (t) => [index("order_events_order_idx").on(t.orderId, t.createdAt)],
);

// ---------------------------------------------------------------------------------------------
// Payments
// ---------------------------------------------------------------------------------------------

export const payments = pgTable(
  "payments",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orderId: text("order_id")
      .notNull()
      .references(() => orders.id, { onDelete: "cascade" }),
    /** PaymentProvider id: "manual-qris" now, a gateway (duitku / midtrans) later. */
    provider: text("provider").notNull(),
    status: paymentStatus("status").notNull().default("pending"),
    /** Exact amount the buyer must pay (= order total). */
    amount: integer("amount").notNull(),
    uniqueCode: integer("unique_code").notNull().default(0),

    /** Uploaded transfer proof, stored outside public/ (path relative to the upload dir). */
    proofPath: text("proof_path"),
    proofUploadedAt: timestamp("proof_uploaded_at", { withTimezone: true }),

    /** Gateway's own reference for this payment. */
    providerRef: text("provider_ref"),
    /** Gateway webhook event id — unique so a replayed webhook is ignored (idempotency). */
    providerEventId: text("provider_event_id").unique(),
    /** Raw gateway payload, kept for debugging disputes. */
    providerPayload: jsonb("provider_payload"),

    confirmedBy: uuid("confirmed_by").references(() => admins.id, { onDelete: "set null" }),
    confirmedAt: timestamp("confirmed_at", { withTimezone: true }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    index("payments_order_idx").on(t.orderId),
    index("payments_status_idx").on(t.status),
    check("payments_amount_check", sql`${t.amount} > 0 AND ${t.uniqueCode} >= 0`),
  ],
);

// ---------------------------------------------------------------------------------------------
// Settings (editable from the admin panel: prices, QRIS image, order expiry…)
// ---------------------------------------------------------------------------------------------

export const settings = pgTable("settings", {
  key: text("key").primaryKey(),
  value: jsonb("value").notNull(),
  updatedBy: uuid("updated_by").references(() => admins.id, { onDelete: "set null" }),
  updatedAt: updatedAt(),
});

export type AdminRow = typeof admins.$inferSelect;
export type OrderRow = typeof orders.$inferSelect;
export type NewOrderRow = typeof orders.$inferInsert;
export type OrderEventRow = typeof orderEvents.$inferSelect;
export type PaymentRow = typeof payments.$inferSelect;
export type SettingRow = typeof settings.$inferSelect;
