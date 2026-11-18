import "server-only";
import type { NewPaymentRow } from "@/server/db/schema";

/**
 * A way to get paid. `manual-qris` (the store's static QRIS, confirmed by an admin) is the first;
 * a gateway (Duitku / Midtrans, phase 3) becomes a second implementation with its own webhook.
 */
export interface PaymentProvider {
  readonly id: string;
  /** The payment row to store together with a new order (same transaction). */
  createPayment(order: { id: string; total: number; uniqueCode: number }): NewPaymentRow;
}

export const manualQrisProvider: PaymentProvider = {
  id: "manual-qris",
  createPayment: (order) => ({
    orderId: order.id,
    provider: "manual-qris",
    status: "pending",
    amount: order.total,
    uniqueCode: order.uniqueCode,
  }),
};

/** Which provider handles a checkout payment method. Only QRIS exists today. */
export function providerFor(paymentMethodId: string): PaymentProvider {
  if (paymentMethodId === "qris") return manualQrisProvider;
  throw new Error(`No payment provider for method "${paymentMethodId}"`);
}
