import type { PaymentMethod } from "@/types";

/**
 * Payment methods. Today only the store's own QRIS is live (paid manually, confirmed by admin);
 * every e-wallet and m-banking app can pay a QRIS. VA and retail need a payment gateway
 * (phase 3): flip their `availability` when it is connected.
 */
export const allPaymentMethods: readonly PaymentMethod[] = [
  { id: "qris", name: "QRIS", group: "QRIS", fee: 0, availability: "checkout" },
  { id: "gopay", name: "GoPay", group: "E-Wallet", fee: 0, availability: "via-qris" },
  { id: "ovo", name: "OVO", group: "E-Wallet", fee: 0, availability: "via-qris" },
  { id: "dana", name: "DANA", group: "E-Wallet", fee: 0, availability: "via-qris" },
  { id: "shopeepay", name: "ShopeePay", group: "E-Wallet", fee: 0, availability: "via-qris" },
  { id: "bca-va", name: "BCA Virtual Account", group: "Virtual Account", fee: 2500, availability: "later" },
  { id: "mandiri-va", name: "Mandiri Virtual Account", group: "Virtual Account", fee: 2500, availability: "later" },
  { id: "bri-va", name: "BRI Virtual Account", group: "Virtual Account", fee: 2500, availability: "later" },
  { id: "alfamart", name: "Alfamart", group: "Retail", fee: 3500, availability: "later" },
  { id: "indomaret", name: "Indomaret", group: "Retail", fee: 3500, availability: "later" },
];

/** Ways a buyer can pay today (shown on the home page). */
export const paymentMethods: readonly PaymentMethod[] = allPaymentMethods.filter(
  (method) => method.availability !== "later",
);

/** Options in the checkout's payment step. */
export const checkoutPaymentMethods: readonly PaymentMethod[] = allPaymentMethods.filter(
  (method) => method.availability === "checkout",
);

/** Preselected when it is the only option. */
export const defaultPaymentId = checkoutPaymentMethods.length === 1 ? checkoutPaymentMethods[0].id : "";

/** Any known method (old orders may reference one that is no longer offered). */
export function getPaymentMethod(id: string) {
  return allPaymentMethods.find((method) => method.id === id);
}

/** A method the checkout accepts right now — the server only accepts these. */
export function getCheckoutPaymentMethod(id: string) {
  return checkoutPaymentMethods.find((method) => method.id === id);
}

/**
 * The store owner's static QRIS (GoPay merchant, registered as usaha mikro / UMI).
 * Decoded and checksum-verified on 2026-11-19. Buyers see the merchant name below in their app,
 * so the payment screen shows it too. Replace the image + these fields when the QRIS changes
 * (later: editable in the admin settings).
 */
export const manualQris = {
  image: "/payments/qris.jpg",
  width: 1135,
  height: 1600,
  merchantName: "Kautsars, Gaming",
  nmid: "ID1026552374492",
} as const;
