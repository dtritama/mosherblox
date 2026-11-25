import "server-only";
import type { PayTo } from "@/lib/payment-methods";
import type { NewPaymentRow } from "@/server/db/schema";

/**
 * A way to get paid. `manual-qris` (the store's static QRIS) and `manual-transfer` (a bank / e-wallet
 * account) are confirmed by an admin; a gateway (Duitku / Midtrans, phase 3) becomes another one with its own webhook.
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

const manualTransferProvider = (payTo: PayTo): PaymentProvider => ({
  id: "manual-transfer",
  createPayment: (order) => ({
    orderId: order.id,
    provider: "manual-transfer",
    status: "pending",
    amount: order.total,
    uniqueCode: order.uniqueCode,
    payTo,
  }),
});

/** Which provider handles a checkout payment method. */
export function providerFor(paymentMethodId: string, payTo: PayTo | null): PaymentProvider {
  if (payTo) return manualTransferProvider(payTo);
  if (paymentMethodId === "qris") return manualQrisProvider;
  throw new Error(`No payment provider for method "${paymentMethodId}"`);
}
