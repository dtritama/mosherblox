"use client";

import { CalendarClock, Check } from "lucide-react";

import { useI18n } from "@/i18n/i18n-provider";
import type { Order } from "@/lib/orders/types";
import { cn } from "@/lib/utils";

/** "Saya paham ini pre-order": required to order while the store is closed. */
export function PreorderConsent({
  checked,
  onChange,
  invalid,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  invalid: boolean;
}) {
  const { preorder: t } = useI18n().dict;
  return (
    <div>
      <label
        className={cn(
          "relative flex cursor-pointer items-start gap-3 rounded-2xl border-2 bg-white px-4 py-3 text-sm transition-colors has-focus-visible:ring-2 has-focus-visible:ring-brand-400",
          invalid ? "border-blush-500" : checked ? "border-brand-500" : "border-blush-200 hover:border-blush-400",
        )}
      >
        <input
          type="checkbox"
          checked={checked}
          onChange={(event) => onChange(event.target.checked)}
          aria-invalid={invalid}
          className="sr-only"
        />
        <span
          aria-hidden="true"
          className={cn(
            "mt-0.5 grid size-5 shrink-0 place-items-center rounded-md border-2 transition-colors",
            checked ? "border-brand-500 bg-brand-500 text-snow" : "border-brand-200",
          )}
        >
          {checked ? <Check className="size-3.5" /> : null}
        </span>
        <span className="font-medium text-ink-900">{t.confirm}</span>
      </label>
      {invalid ? (
        <p role="alert" className="mt-1.5 text-xs font-medium text-blush-700">
          {t.confirmError}
        </p>
      ) : null}
    </div>
  );
}

/** Reminder on an order that is a pre-order, until the team starts on it. */
export function PreorderNote({ order, className }: { order: Order; className?: string }) {
  const { preorder: t } = useI18n().dict;
  if (!order.isPreorder || (order.status !== "pending" && order.status !== "paid")) return null;
  return (
    <p
      className={cn(
        "flex items-start gap-2 rounded-2xl border border-blush-200 bg-blush-50 px-4 py-3 text-left text-sm text-ink-900",
        className,
      )}
    >
      <CalendarClock className="mt-0.5 size-4 shrink-0 text-blush-700" aria-hidden="true" />
      {t.waiting}
    </p>
  );
}
