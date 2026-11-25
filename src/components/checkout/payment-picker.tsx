"use client";

import { PaymentLogo } from "@/components/ui/payment-logo";
import { formatIDR } from "@/i18n/format";
import { useI18n } from "@/i18n/i18n-provider";
import { cn } from "@/lib/utils";
import { useCheckoutPayments, type CheckoutPaymentOption } from "@/lib/use-checkout-payments";
import type { PaymentGroup } from "@/types";

/** Payment methods grouped by type, as accessible radio cards. */
export function PaymentPicker({
  name,
  value,
  onChange,
  invalid = false,
  columns = 2,
}: {
  name: string;
  value: string;
  onChange: (id: string) => void;
  invalid?: boolean;
  columns?: 2 | 3;
}) {
  const { dict } = useI18n();
  const paymentGroups = useCheckoutPayments().reduce<Partial<Record<PaymentGroup, CheckoutPaymentOption[]>>>(
    (acc, method) => {
      (acc[method.group] ??= []).push(method);
      return acc;
    },
    {},
  );
  return (
    <div className="grid gap-4" aria-invalid={invalid || undefined}>
      {(Object.keys(paymentGroups) as PaymentGroup[]).map((group) => (
        <fieldset key={group}>
          <legend className="mb-2 text-xs font-semibold tracking-wider text-ink-500 uppercase">
            {dict.checkout.paymentGroups[group]}
          </legend>
          <div className={cn("grid grid-cols-[minmax(0,1fr)] gap-2 sm:grid-cols-2", columns === 3 && "lg:grid-cols-3")}>
            {paymentGroups[group]?.map((method) => {
              const selected = method.id === value;
              return (
                <label
                  key={method.id}
                  className={cn(
                    "flex cursor-pointer items-center justify-between gap-2 rounded-xl border-2 px-3 py-2.5 text-sm transition-colors duration-150 has-focus-visible:ring-2 has-focus-visible:ring-brand-400",
                    selected ? "border-brand-500 bg-brand-50" : "border-brand-100 bg-white hover:border-brand-300",
                    invalid && !value && "border-blush-200",
                  )}
                >
                  <input
                    type="radio"
                    name={name}
                    value={method.id}
                    checked={selected}
                    onChange={() => onChange(method.id)}
                    className="sr-only"
                  />
                  <span className="flex min-w-0 items-center gap-3">
                    <PaymentLogo name={method.name} brand={method.brand} logo={method.logo} />
                    <span className="truncate font-medium text-ink-900">{method.name}</span>
                  </span>
                  {method.fee ? (
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
