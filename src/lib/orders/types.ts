import type { LocalizedText } from "@/i18n/config";
import type { RobuxMethodId } from "@/data/robux";
import type { OrderErrorCode } from "@/lib/validation";

/** Mirrors the `order_status` enum in the database (src/server/db/schema.ts). */
export type OrderStatus = "pending" | "paid" | "processing" | "completed" | "failed" | "expired";

/** What the browser gets back about an order — never a raw database row. */
export interface Order {
  /** Random, hard-to-guess ID (e.g. MB-7F3K9Q2A). */
  id: string;
  status: OrderStatus;
  /** ISO 8601 timestamp. */
  createdAt: string;
  /** ISO 8601 timestamp: pay before this (the countdown on the payment screen). */
  expiresAt: string;
  /** ISO 8601 timestamp: "Saya sudah bayar" is still accepted until this (expiresAt + grace). */
  claimUntil: string;
  product: string;
  item: LocalizedText;
  /** Roblox username or email (for vouchers). */
  account: string;
  /** Normalised Indonesian number: 628xxxxxxxxx. Used together with the ID to look an order up. */
  whatsapp: string;
  /** Payment method display name (e.g. "QRIS"). */
  payment: string;
  /** Exact amount to pay in IDR, including fee and unique code. */
  total: number;
  /** Small amount added to the total so a QRIS transfer can be matched to this order. */
  uniqueCode: number;
  /** State of the latest payment (null for old orders without one). */
  paymentStatus: PaymentStatus | null;
  /** The buyer attached a transfer screenshot. */
  hasProof: boolean;
  /** A review exists for this order (Check Order then hides the review form). */
  hasReview: boolean;
  /** Screenshots the admin uploaded showing the Robux / item was sent ("bukti pengiriman"). */
  deliveryProofUrls: string[];
  /** Note an admin wrote for the buyer when failing or completing the order (Check Order only). */
  adminNote: string | null;
}

/** Mirrors the `payment_status` enum. "submitted" = buyer pressed "Saya sudah bayar". */
export type PaymentStatus = "pending" | "submitted" | "confirmed" | "rejected" | "expired";

/* ---------- What the checkout sends (prices are never sent: the server computes them) ---------- */

export interface RobuxOrderInput {
  method: RobuxMethodId;
  amount: number;
  account: string;
  whatsapp: string;
  paymentId: string;
  confirmed2sv: boolean;
  confirmedAccount: boolean;
}

export interface ProductOrderInput {
  productSlug: string;
  optionId: string;
  account: string;
  whatsapp: string;
  paymentId: string;
  confirmedAccount: boolean;
}

/**
 * - invalid:     the input failed server-side validation (`fields` says where)
 * - rateLimited: too many attempts from this connection — wait a few minutes
 * - unavailable: something went wrong on our side (database down…) — try again later
 * - soldOut:     the Robux method or product is out of stock (admin settings)
 * - notEnoughStock: more Robux than the store has in stock right now
 * - storeClosed: the owner closed the store for new orders
 */
export type OrderFailure = "invalid" | "rateLimited" | "unavailable" | "soldOut" | "notEnoughStock" | "storeClosed";

export type CreateOrderResult =
  { ok: true; order: Order } | { ok: false; error: OrderFailure; fields?: Partial<Record<string, OrderErrorCode>> };

/**
 * "Saya sudah bayar". `tooLate`: the payment window (plus grace) has passed; `notPending`: the
 * order is no longer waiting for payment; `badProof`: the screenshot is too big or not an image.
 */
export type ClaimPaymentResult =
  | { ok: true; order: Order }
  | {
      ok: false;
      error:
        | Exclude<OrderFailure, "invalid" | "soldOut" | "notEnoughStock" | "storeClosed">
        | "notFound"
        | "tooLate"
        | "notPending"
        | "badProof";
    };

export type FindOrderResult =
  | { ok: true; order: Order | null }
  | { ok: false; error: Exclude<OrderFailure, "invalid" | "soldOut" | "notEnoughStock" | "storeClosed"> };
