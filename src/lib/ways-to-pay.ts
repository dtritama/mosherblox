import { getPaymentBrand, QRIS_LOGO } from "@/data/payment-brands";
import { paymentMethods } from "@/data/payments";
import type { PaymentOption } from "@/lib/payment-methods";

/** Every way to pay today, for the home page: QRIS, the apps that can pay it, and transfer accounts. */
export function waysToPay(options: readonly PaymentOption[]) {
  const ways = paymentMethods.map(({ id, name }) => ({
    id,
    name,
    brand: id,
    logo: id === "qris" ? QRIS_LOGO : (getPaymentBrand(id)?.logo ?? null),
  }));
  for (const option of options) {
    const known = ways.find((way) => way.name === option.name);
    if (known) known.logo = option.logo ?? known.logo;
    else ways.push(option);
  }
  return ways;
}
