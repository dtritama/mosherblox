import type { OrderStatus } from "@/lib/orders/types";

/**
 * Order status machine — the only allowed moves. Pure so the server (and later the admin UI,
 * to decide which buttons to show) use the same rules.
 *
 *   pending ──► paid ──► processing ──► completed
 *      │          │           │
 *      │          └───────────┴──► failed   (e.g. couldn't deliver → refund)
 *      ├──► failed   (cancelled by admin)
 *      └──► expired  (not paid in time)
 */
export const ORDER_TRANSITIONS: Readonly<Record<OrderStatus, readonly OrderStatus[]>> = {
  pending: ["paid", "failed", "expired"],
  paid: ["processing", "completed", "failed"],
  processing: ["completed", "failed"],
  completed: [],
  failed: [],
  expired: [],
};

export function canTransition(from: OrderStatus, to: OrderStatus) {
  return ORDER_TRANSITIONS[from].includes(to);
}

export function isFinalStatus(status: OrderStatus) {
  return ORDER_TRANSITIONS[status].length === 0;
}
