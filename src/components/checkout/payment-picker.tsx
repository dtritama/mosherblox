"use client";

import { Info } from "lucide-react";

import { PaymentLogo } from "@/components/ui/payment-logo";
import { acceptsAmount } from "@/data/payments";
import { formatIDR, interpolate } from "@/i18n/format";
import { useI18n } from "@/i18n/i18n-provider";
import { cn } from "@/lib/utils";
import { useCheckoutPayments, type CheckoutPaymentOption } from "@/lib/use-checkout-payments";
import type { PaymentGroup } from "@/types";

/** Payment methods grouped by type, as accessible radio cards. */
export function PaymentPicker({
  name,
  value,
  onChange,
  price = null,
  invalid = false,
  columns = 2,
}: {
  name: string;
  value: string;
  onChange: (id: string) => void;
  /** Order price: methods with a lower limit (QRIS) are switched off. null = not known yet. */
  price?: number | null;
  invalid?: boolean;
  columns?: 2 | 3;
}) {
  const { dict } = useI18n();
  const methods = useCheckoutPayments();
  const overLimit = (method: CheckoutPaymentOption) => price !== null && !acceptsAmount(method, price);
  const limited = methods.find(overLimit);
  const paymentGroups = methods.reduce<Partial<Record<PaymentGroup, CheckoutPaymentOption[]>>>(
    (acc, method) => {
      (acc[method.group] ??= []).push(method);
      return acc;
    },
    {},
  );
  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-4" aria-invalid={invalid || undefined}>
      {limited?.maxAmount ? (
        <p role="status" className="flex items-start gap-2 rounded-xl bg-blush-50 px-3 py-2.5 text-sm text-blush-900">
          <Info className="mt-0.5 size-4 shrink-0 text-blush-500" aria-hidden="true" />
          {interpolate(
            methods.every(overLimit) ? dict.checkout.paymentLimit.noOther : dict.checkout.paymentLimit.pickOther,
            { method: limited.name, amount: formatIDR(limited.maxAmount) },
          )}
        </p>
      ) : null}
      {(Object.keys(paymentGroups) as PaymentGroup[]).map((group) => (
        <fieldset key={group}>
          <legend className="mb-2 text-xs font-semibold tracking-wider text-ink-500 uppercase">
            {dict.checkout.paymentGroups[group]}
          </legend>
          <div className={cn("grid grid-cols-[minmax(0,1fr)] gap-2 sm:grid-cols-2", columns === 3 && "lg:grid-cols-3")}>
            {paymentGroups[group]?.map((method) => {
              const off = overLimit(method);
              const selected = method.id === value && !off;
              return (
                <label
                  key={method.id}
                  className={cn(
                    "relative flex items-center justify-between gap-2 rounded-xl border-2 px-3 py-2.5 text-sm transition-colors duration-150 has-focus-visible:ring-2 has-focus-visible:ring-brand-400",
                    off
                      ? "cursor-not-allowed border-dashed border-brand-100 bg-ink-300/10"
                      : selected
                        ? "cursor-pointer border-brand-500 bg-brand-50"
                        : "cursor-pointer border-brand-100 bg-white hover:border-brand-300",
                    invalid && !off && "border-blush-200",
                  )}
                >
                  <input
                    type="radio"
                    name={name}
                    value={method.id}
                    checked={selected}
                    disabled={off}
                    onChange={() => onChange(method.id)}
                    className="sr-only"
                  />
                  <span className={cn("flex min-w-0 items-center gap-3", off && "opacity-50")}>
                    <PaymentLogo name={method.name} brand={method.brand} logo={method.logo} />
                    <span className="truncate font-medium text-ink-900">{method.name}</span>
                  </span>
                  {off && method.maxAmount ? (
                    <span className="shrink-0 rounded-full bg-coal px-2 py-0.5 text-[11px] font-semibold text-snow">
                      {interpolate(dict.checkout.paymentLimit.max, { amount: formatIDR(method.maxAmount) })}
                    </span>
                  ) : method.fee ? (
                    <span className="shrink-0 text-xs text-ink-500">+{formatIDR(method.fee)}</span>
                  ) : null}
                </label>
              );
            })}
          </div>
        </fieldset>
      ))}
    </div>
  );
}
