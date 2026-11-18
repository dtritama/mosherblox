import { createProductOrderAction, createRobuxOrderAction, findOrderAction } from "@/server/orders/actions";
import type { CreateOrderResult, FindOrderResult, ProductOrderInput, RobuxOrderInput } from "@/lib/orders/types";

/**
 * The only place the UI talks to for orders. Backed by Server Actions (src/server/orders):
 * the server validates the input again, computes the price (the browser never sends one),
 * adds the unique payment code, stores the order in Postgres and rate-limits lookups.
 */
export interface OrderService {
  createRobuxOrder(input: RobuxOrderInput): Promise<CreateOrderResult>;
  createProductOrder(input: ProductOrderInput): Promise<CreateOrderResult>;
  /** Both the ID and the WhatsApp number must match, so an ID alone can't reveal an order. */
  findOrder(id: string, whatsapp: string): Promise<FindOrderResult>;
}

/** A network failure or a stale page after a deploy ("Failed to find Server Action") → retryable error. */
async function safely<T extends { ok: boolean }>(call: () => Promise<T>, fallback: T): Promise<T> {
  try {
    return await call();
  } catch {
    return fallback;
  }
}

export const orderService: OrderService = {
  createRobuxOrder: (input) => safely(() => createRobuxOrderAction(input), { ok: false, error: "unavailable" }),
  createProductOrder: (input) => safely(() => createProductOrderAction(input), { ok: false, error: "unavailable" }),
  findOrder: (id, whatsapp) => safely(() => findOrderAction(id, whatsapp), { ok: false, error: "unavailable" }),
};

/**
 * Real payment instructions (QRIS + unique code) arrive in roadmap step 4. Until then the
 * checkout keeps saying no money is charged.
 */
export const PAYMENTS_LIVE = false;
