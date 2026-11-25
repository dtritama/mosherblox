"use client";

import { useMemo } from "react";

import { useStoreSettings } from "@/components/providers/settings-provider";
import { QRIS_LOGO } from "@/data/payment-brands";
import { checkoutPaymentMethods } from "@/data/payments";
import type { PaymentGroup } from "@/types";

export interface CheckoutPaymentOption {
  id: string;
  name: string;
  group: PaymentGroup;
  fee: number;
  brand: string;
  logo: string | null;
}

/** Everything the buyer can pick at checkout: the QRIS, then the owner's transfer accounts. */
export function useCheckoutPayments(): CheckoutPaymentOption[] {
  const { paymentOptions } = useStoreSettings();
  return useMemo(
    () => [
      ...checkoutPaymentMethods.map(({ id, name, group, fee }) => ({
        id,
        name,
        group,
        fee,
        brand: id,
        logo: id === "qris" ? QRIS_LOGO : null,
      })),
      ...paymentOptions.map(({ id, name, kind, brand, logo }) => ({
        id,
        name,
        group: kind === "ewallet" ? ("E-Wallet" as const) : ("Bank" as const),
        fee: 0,
        brand,
        logo,
      })),
    ],
    [paymentOptions],
  );
}
