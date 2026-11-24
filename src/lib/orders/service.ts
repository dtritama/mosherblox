import { unstable_isUnrecognizedActionError } from "next/navigation";

import {
  claimPaymentAction,
  createProductOrderAction,
  createRobuxOrderAction,
  findOrderAction,
} from "@/server/orders/actions";
import type {
  ClaimPaymentResult,
  CreateOrderResult,
  FindOrderResult,
  ProductOrderInput,
  RobuxOrderInput,
} from "@/lib/orders/types";

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
  /** "Saya sudah bayar", with an optional transfer screenshot. */
  claimPayment(input: { orderId: string; whatsapp: string; proof?: File | null }): Promise<ClaimPaymentResult>;
}

/** Nothing ever throws into the UI: a page from before a deploy → "reload", anything else → "try again". */
async function safely<T>(call: () => Promise<T>): Promise<T | { ok: false; error: "unavailable" | "outdated" }> {
  try {
    return await call();
  } catch (error) {
    return { ok: false, error: unstable_isUnrecognizedActionError(error) ? "outdated" : "unavailable" };
  }
}

export const orderService: OrderService = {
  createRobuxOrder: (input) => safely(() => createRobuxOrderAction(input)),
  createProductOrder: (input) => safely(() => createProductOrderAction(input)),
  findOrder: (id, whatsapp) => safely(() => findOrderAction(id, whatsapp)),
  claimPayment: ({ orderId, whatsapp, proof }) => {
    const form = new FormData();
    form.set("orderId", orderId);
    form.set("whatsapp", whatsapp);
    if (proof) form.set("proof", proof);
    return safely(() => claimPaymentAction(form));
  },
};

/** Manual QRIS payment is live (roadmap step 4): the checkout shows the QRIS and asks for payment. */
export const PAYMENTS_LIVE = true;
