import type { PaymentMethod } from "@/types";

export const paymentMethods: readonly PaymentMethod[] = [
  { id: "qris", name: "QRIS", group: "QRIS", fee: 0 },
  { id: "gopay", name: "GoPay", group: "E-Wallet", fee: 0 },
  { id: "ovo", name: "OVO", group: "E-Wallet", fee: 0 },
  { id: "dana", name: "DANA", group: "E-Wallet", fee: 0 },
  { id: "shopeepay", name: "ShopeePay", group: "E-Wallet", fee: 0 },
  { id: "bca-va", name: "BCA Virtual Account", group: "Virtual Account", fee: 2500 },
  { id: "mandiri-va", name: "Mandiri Virtual Account", group: "Virtual Account", fee: 2500 },
  { id: "bri-va", name: "BRI Virtual Account", group: "Virtual Account", fee: 2500 },
  { id: "alfamart", name: "Alfamart", group: "Retail", fee: 3500 },
  { id: "indomaret", name: "Indomaret", group: "Retail", fee: 3500 },
];

export function getPaymentMethod(id: string) {
  return paymentMethods.find((method) => method.id === id);
}
