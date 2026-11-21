"use client";

import { Check } from "lucide-react";
import { useState } from "react";

import { Field, inputClass, Step, SummaryRow } from "@/components/checkout/form-parts";
import { OrderSuccess } from "@/components/checkout/order-success";
import { PaymentPicker } from "@/components/checkout/payment-picker";
import { KitNote } from "@/components/design-kit/kit-frame";
import { statusStyles } from "@/components/orders/status-styles";
import { OrderCard } from "@/components/sections/hero";
import { ProductCard } from "@/components/topup/product-card";
import { useTopUp } from "@/components/topup/topup-provider";
import { products } from "@/data/products";
import { useI18n } from "@/i18n/i18n-provider";
import type { Order, OrderStatus } from "@/lib/orders/types";
import { cn } from "@/lib/utils";

/* Interactive specimens for the design kit — real components with demo state. */

export function FieldStates() {
  const { dict } = useI18n();
  const c = dict.checkout;
  const [value, setValue] = useState("Builderman_01");
  return (
    <div className="grid gap-6 sm:grid-cols-3">
      <div>
        <Field label={c.username.label} hint={c.username.hint}>
          {(props) => (
            <input {...props} placeholder={c.username.placeholder} className={inputClass(false)} defaultValue="" />
          )}
        </Field>
        <KitNote>Input / default + hint</KitNote>
      </div>
      <div>
        <Field label={c.username.label}>
          {(props) => (
            <input {...props} value={value} onChange={(e) => setValue(e.target.value)} className={inputClass(false)} />
          )}
        </Field>
        <KitNote>Input / filled (focus: border brand-500)</KitNote>
      </div>
      <div>
        <Field label={c.whatsapp.label} error={c.errors.invalidWhatsapp}>
          {(props) => <input {...props} defaultValue="0812" className={inputClass(true)} />}
        </Field>
        <KitNote>Input / error (border blush-500)</KitNote>
      </div>
    </div>
  );
}

export function StepHeaders() {
  const { dict } = useI18n();
  return (
    <div className="grid gap-6 sm:grid-cols-2">
      <div>
        <Step number={1} title={dict.robux.steps.method}>
          <div className="h-10 rounded-xl border-2 border-dashed border-brand-100" />
        </Step>
        <KitNote>Step / default</KitNote>
      </div>
      <div>
        <Step number={4} title={dict.robux.steps.payment} error={dict.checkout.errors.pickPayment}>
          <div className="h-10 rounded-xl border-2 border-dashed border-blush-200" />
        </Step>
        <KitNote>Step / with error</KitNote>
      </div>
    </div>
  );
}

export function PaymentPickerDemo() {
  const [value, setValue] = useState("qris");
  return (
    <div>
      <PaymentPicker name="kit-payment" value={value} onChange={setValue} columns={3} />
      <KitNote>PaymentPicker / radio cards, selected = border brand-500 + bg brand-50</KitNote>
    </div>
  );
}

export function CheckboxDemo() {
  const { dict } = useI18n();
  const [checked, setChecked] = useState(true);
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {[true, false].map((state) => {
        const on = state ? checked : false;
        return (
          <div key={String(state)}>
            <label
              className={cn(
                "flex cursor-pointer items-start gap-3 rounded-xl border-2 bg-white px-3 py-2.5",
                on ? "border-brand-500" : "border-brand-100",
              )}
            >
              <input
                type="checkbox"
                className="sr-only"
                checked={on}
                onChange={(e) => state && setChecked(e.target.checked)}
              />
              <span
                aria-hidden="true"
                className={cn(
                  "mt-0.5 grid size-5 shrink-0 place-items-center rounded-md border-2",
                  on ? "border-brand-500 bg-brand-500 text-white" : "border-brand-200",
                )}
              >
                {on ? <Check className="size-3.5" /> : null}
              </span>
              <span className="text-sm font-medium text-ink-900">{dict.robux.requirements.confirm}</span>
            </label>
            <KitNote>Checkbox card / {on ? "checked" : "unchecked"}</KitNote>
          </div>
        );
      })}
    </div>
  );
}

export function SummaryDemo() {
  const { dict } = useI18n();
  const c = dict.checkout;
  return (
    <div className="max-w-sm rounded-2xl bg-brand-50/70 p-5">
      <dl className="grid gap-3 text-sm">
        <SummaryRow label={dict.robux.summary.method} value="Via Send Username" />
        <SummaryRow label={dict.robux.summary.amount} value="1.000 Robux" />
        <SummaryRow label={c.summary.fee} value={dict.common.free} />
      </dl>
      <div className="mt-4 flex items-end justify-between border-t border-dashed border-brand-200 pt-4">
        <span className="text-sm font-medium text-ink-700">{c.summary.total}</span>
        <span className="text-2xl font-extrabold text-ink-900">Rp 120.000</span>
      </div>
      <KitNote>Order summary / SummaryRow + total</KitNote>
    </div>
  );
}

export function StatusBadges() {
  const { dict } = useI18n();
  return (
    <div className="flex flex-wrap gap-3">
      {(Object.keys(statusStyles) as OrderStatus[]).map((status) => {
        const { badge, icon: Icon } = statusStyles[status];
        return (
          <div key={status}>
            <span
              className={cn("inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-semibold", badge)}
            >
              <Icon className="size-4" aria-hidden="true" />
              {dict.checkOrder.status[status]}
            </span>
            <KitNote>Status / {status}</KitNote>
          </div>
        );
      })}
    </div>
  );
}

export function ProductCards() {
  const { openTopUp } = useTopUp();
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {products.slice(0, 4).map((product) => (
        <ProductCard key={product.slug} product={product} onSelect={openTopUp} />
      ))}
    </div>
  );
}

export function OrderCards() {
  return (
    <div className="grid gap-8 sm:grid-cols-2">
      <div className="max-w-sm">
        <OrderCard variant="send-username" />
        <KitNote>OrderCard / send-username (hero)</KitNote>
      </div>
      <div className="max-w-sm">
        <OrderCard variant="gamepass" />
        <KitNote>OrderCard / gamepass (hero)</KitNote>
      </div>
    </div>
  );
}

/** Fixed sample for the kit (no database needed). */
const sampleOrder: Order = {
  id: "MB-DONE2026",
  status: "completed",
  createdAt: "2026-11-01T10:15:00+07:00",
  expiresAt: "2026-11-01T10:45:00+07:00",
  claimUntil: "2026-11-01T10:55:00+07:00",
  product: "Blox Fruits",
  item: { id: "Leopard Fruit", en: "Leopard Fruit" },
  account: "Builderman_01",
  whatsapp: "6281234567890",
  payment: "QRIS",
  total: 89047,
  uniqueCode: 47,
  paymentStatus: "confirmed",
  hasProof: false,
  hasReview: false,
};

export function OrderSuccessDemo() {
  return (
    <div className="rounded-[2rem] border border-brand-100">
      <OrderSuccess order={sampleOrder} onDone={() => undefined} />
    </div>
  );
}
