"use client";

import { AnimatePresence, m } from "motion/react";
import { Lock, ShieldCheck, X, Zap } from "lucide-react";
import { useId, useMemo, useRef, useState, type FormEvent } from "react";

import { Field, inputClass, Step, SummaryRow } from "@/components/checkout/form-parts";
import { OrderSuccess } from "@/components/checkout/order-success";
import { PaymentPicker } from "@/components/checkout/payment-picker";
import { Button } from "@/components/ui/button";
import { ProductArt } from "@/components/ui/product-art";
import { getPaymentMethod } from "@/data/payments";
import { useDialogA11y } from "@/hooks/use-dialog-a11y";
import { formatIDR } from "@/i18n/format";
import { useI18n } from "@/i18n/i18n-provider";
import { orderService } from "@/lib/orders/service";
import type { Order } from "@/lib/orders/types";
import { cn, discountPercent } from "@/lib/utils";
import {
  LIMITS,
  getAccountFieldType,
  normalizeWhatsapp,
  sanitizeEmail,
  sanitizeUsername,
  sanitizeWhatsapp,
  validateOrder,
  type OrderDraft,
  type OrderErrorCode,
  type OrderErrors,
} from "@/lib/validation";
import type { Product } from "@/types";

interface TopUpDialogProps {
  product: Product;
  initialOptionId?: string;
  onClose: () => void;
}

export function TopUpDialog({ product, initialOptionId, onClose }: TopUpDialogProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const formId = useId();
  useDialogA11y(panelRef, onClose);

  const { locale, dict } = useI18n();
  const t = dict.checkout;
  const field = t.accountFields[product.delivery];
  const isEmail = getAccountFieldType(product.delivery) === "email";
  const errorText = (code?: OrderErrorCode) => (code ? t.errors[code] : undefined);
  const optionIds = useMemo(() => product.options.map((option) => option.id), [product]);

  const [draft, setDraft] = useState<OrderDraft>({
    account: "",
    whatsapp: "",
    optionId: initialOptionId ?? "",
    paymentId: "",
  });
  const [touched, setTouched] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [order, setOrder] = useState<Order | null>(null);

  const errors: OrderErrors = useMemo(
    () => (touched ? validateOrder(product.delivery, optionIds, draft) : {}),
    [touched, product.delivery, optionIds, draft],
  );
  const option = product.options.find((item) => item.id === draft.optionId);
  const payment = getPaymentMethod(draft.paymentId);
  const total = option ? option.price + (payment?.fee ?? 0) : 0;

  const update = <K extends keyof OrderDraft>(key: K, value: OrderDraft[K]) =>
    setDraft((prev) => ({ ...prev, [key]: value }));

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setTouched(true);
    const result = validateOrder(product.delivery, optionIds, draft);
    const whatsapp = normalizeWhatsapp(draft.whatsapp);
    if (Object.keys(result).length > 0 || !option || !payment || !whatsapp) {
      const firstInvalid = panelRef.current?.querySelector<HTMLElement>("[aria-invalid='true']");
      firstInvalid?.focus({ preventScroll: true });
      firstInvalid?.scrollIntoView({ block: "center", behavior: "smooth" });
      return;
    }
    setSubmitting(true);
    try {
      // Phase 2: the API creates the order (recomputing the price) and returns the payment URL.
      setOrder(
        await orderService.createOrder({
          product: product.name,
          item: option.label,
          account: draft.account.trim(),
          whatsapp,
          payment: payment.name,
          total,
        }),
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-70 flex items-end justify-center sm:items-center sm:p-6">
      <m.div
        aria-hidden="true"
        onClick={onClose}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.25 }}
        className="absolute inset-0 bg-ink-950/40 backdrop-blur-sm"
      />

      <m.div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        initial={{ opacity: 0, y: 60, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 40, scale: 0.97 }}
        transition={{ type: "spring", stiffness: 320, damping: 32 }}
        className="relative flex max-h-[92dvh] w-full flex-col overflow-hidden rounded-t-3xl bg-white shadow-2xl outline-none sm:max-w-4xl sm:rounded-3xl"
      >
        {/* Header */}
        <div className="relative flex items-center gap-4 border-b border-brand-100 bg-linear-to-r from-brand-50 to-white p-4 sm:p-5">
          <ProductArt
            icon={product.icon}
            accent={product.accent}
            className="grid size-14 shrink-0 place-items-center rounded-2xl"
            iconClassName="relative size-7 text-white"
          />
          <div className="min-w-0 flex-1">
            <h2 id={titleId} className="truncate text-lg font-bold text-ink-900 sm:text-xl">
              {product.name}
            </h2>
            <p className="truncate text-sm text-ink-500">{product.subtitle[locale]}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={dict.common.close}
            className="grid size-10 place-items-center rounded-xl text-ink-500 transition-colors hover:bg-brand-50 hover:text-ink-900"
          >
            <X className="size-5" />
          </button>
        </div>

        <AnimatePresence mode="wait" initial={false}>
          {order ? (
            <div key="success" className="overflow-y-auto">
              <OrderSuccess order={order} onDone={onClose} />
            </div>
          ) : (
            <m.div
              key="form"
              exit={{ opacity: 0, y: -12 }}
              className="grid min-h-0 flex-1 overflow-y-auto lg:grid-cols-[1fr_20rem]"
            >
              <form id={formId} onSubmit={handleSubmit} noValidate className="grid gap-6 p-4 sm:p-6">
                <Step number={1} title={t.steps.account}>
                  <Field label={field.label} error={errorText(errors.account)}>
                    {(props) => (
                      <input
                        {...props}
                        data-autofocus
                        type={isEmail ? "email" : "text"}
                        inputMode={isEmail ? "email" : "text"}
                        autoComplete={isEmail ? "email" : "username"}
                        autoCapitalize="off"
                        spellCheck={false}
                        maxLength={isEmail ? LIMITS.emailMax : LIMITS.usernameMax}
                        placeholder={field.placeholder}
                        value={draft.account}
                        onChange={(e) =>
                          update("account", isEmail ? sanitizeEmail(e.target.value) : sanitizeUsername(e.target.value))
                        }
                        className={inputClass(Boolean(errors.account))}
                      />
                    )}
                  </Field>
                  <p className="mt-2 flex items-center gap-1.5 text-xs text-ink-500">
                    <Lock className="size-3.5 shrink-0 text-brand-600" aria-hidden="true" />
                    {field.hint}
                  </p>
                  <div className="mt-4">
                    <Field label={t.whatsapp.label} error={errorText(errors.whatsapp)} hint={t.whatsapp.hint}>
                      {(props) => (
                        <input
                          {...props}
                          type="tel"
                          inputMode="tel"
                          autoComplete="tel"
                          maxLength={LIMITS.whatsappMax}
                          placeholder={t.whatsapp.placeholder}
                          value={draft.whatsapp}
                          onChange={(e) => update("whatsapp", sanitizeWhatsapp(e.target.value))}
                          className={inputClass(Boolean(errors.whatsapp))}
                        />
                      )}
                    </Field>
                  </div>
                </Step>

                <Step
                  number={2}
                  title={product.category === "gamepass" ? t.steps.gamepass : t.steps.amount}
                  error={errorText(errors.option)}
                >
                  <fieldset aria-invalid={Boolean(errors.option)} className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
                    <legend className="sr-only">{t.amountLegend}</legend>
                    {product.options.map((item) => {
                      const selected = item.id === draft.optionId;
                      return (
                        <label
                          key={item.id}
                          className={cn(
                            "relative cursor-pointer rounded-2xl border-2 p-3 transition-[border-color,background-color,transform] duration-150 active:scale-[0.98] has-focus-visible:ring-2 has-focus-visible:ring-brand-400",
                            selected
                              ? "border-brand-500 bg-brand-50"
                              : "border-brand-100 bg-white hover:border-brand-300",
                          )}
                        >
                          <input
                            type="radio"
                            name="option"
                            value={item.id}
                            checked={selected}
                            onChange={() => update("optionId", item.id)}
                            className="sr-only"
                          />
                          {item.originalPrice ? (
                            <span className="absolute -top-2 right-2 rounded-full bg-blush-500 px-2 py-0.5 text-[10px] font-bold text-white">
                              -{discountPercent(item.price, item.originalPrice)}%
                            </span>
                          ) : null}
                          <span className="block text-sm leading-tight font-semibold text-ink-900">
                            {item.label[locale]}
                          </span>
                          <span className="mt-1 block text-sm font-bold text-brand-700">{formatIDR(item.price)}</span>
                          {item.originalPrice ? (
                            <span className="block text-xs text-ink-300 line-through">
                              {formatIDR(item.originalPrice)}
                            </span>
                          ) : null}
                        </label>
                      );
                    })}
                  </fieldset>
                </Step>

                <Step number={3} title={t.steps.payment} error={errorText(errors.payment)}>
                  <PaymentPicker
                    name="payment"
                    value={draft.paymentId}
                    onChange={(id) => update("paymentId", id)}
                    invalid={Boolean(errors.payment)}
                  />
                </Step>
              </form>

              {/* Summary */}
              <aside className="border-t border-brand-100 bg-linear-to-b from-brand-50/70 to-white p-4 sm:p-6 lg:border-t-0 lg:border-l">
                <div className="lg:sticky lg:top-0">
                  <h3 className="text-sm font-semibold tracking-wider text-ink-500 uppercase">{t.summary.title}</h3>
                  <dl className="mt-4 grid gap-3 text-sm">
                    <SummaryRow label={t.summary.product} value={product.name} />
                    <SummaryRow label={isEmail ? t.summary.email : t.summary.username} value={draft.account || "—"} />
                    <SummaryRow label={t.summary.whatsapp} value={draft.whatsapp || "—"} />
                    <SummaryRow label={t.summary.item} value={option?.label[locale] ?? "—"} />
                    <SummaryRow label={t.summary.price} value={option ? formatIDR(option.price) : "—"} />
                    <SummaryRow
                      label={t.summary.fee}
                      value={payment ? (payment.fee ? formatIDR(payment.fee) : dict.common.free) : "—"}
                    />
                  </dl>
                  <div className="mt-4 flex items-end justify-between border-t border-dashed border-brand-200 pt-4">
                    <span className="text-sm font-medium text-ink-700">{t.summary.total}</span>
                    <span aria-live="polite" className="text-2xl font-extrabold text-ink-900">
                      <m.span
                        key={total}
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="block"
                      >
                        {formatIDR(total)}
                      </m.span>
                    </span>
                  </div>
                  <Button type="submit" form={formId} size="lg" className="mt-5 w-full" disabled={submitting}>
                    <Zap className="size-4" aria-hidden="true" />
                    {submitting ? t.processing : t.buyNow}
                  </Button>
                  <p className="mt-3 flex items-center justify-center gap-1.5 text-xs text-ink-500">
                    <ShieldCheck className="size-4 text-brand-600" aria-hidden="true" />
                    {t.secure}
                  </p>
                </div>
              </aside>
            </m.div>
          )}
        </AnimatePresence>
      </m.div>
    </div>
  );
}
