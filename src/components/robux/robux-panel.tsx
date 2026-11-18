"use client";

import { AnimatePresence, m } from "motion/react";
import {
  BadgePercent,
  Check,
  Flame,
  Gamepad2,
  Info,
  KeyRound,
  Lock,
  Minus,
  Plus,
  Send,
  ShieldCheck,
  Zap,
} from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useId, useMemo, useRef, useState, type FormEvent, type ReactNode } from "react";

import { Field, inputClass, Step, SummaryRow } from "@/components/checkout/form-parts";
import { OrderSuccess } from "@/components/checkout/order-success";
import { PaymentPicker } from "@/components/checkout/payment-picker";
import { Button } from "@/components/ui/button";
import { Container } from "@/components/ui/container";
import { Reveal } from "@/components/ui/reveal";
import { SectionHeading } from "@/components/ui/section-heading";
import { getPaymentMethod } from "@/data/payments";
import { robuxConfig, type RobuxMethodId } from "@/data/robux";
import { formatIDR, formatNumber, interpolate } from "@/i18n/format";
import { useI18n } from "@/i18n/i18n-provider";
import { orderService } from "@/lib/orders/service";
import type { Order } from "@/lib/orders/types";
import {
  calculateRobuxPrice,
  getGamepassPrice,
  getLowestRobuxRate,
  getNextRobuxTier,
  getRobuxMaxAmount,
  getRobuxMethod,
  getRobuxTier,
} from "@/lib/robux-pricing";
import { cn } from "@/lib/utils";
import {
  LIMITS,
  normalizeWhatsapp,
  sanitizeUsername,
  sanitizeWhatsapp,
  validateRobuxAmount,
  validateRobuxOrder,
  type OrderErrorCode,
  type RobuxOrderDraft,
} from "@/lib/validation";
import { RobuxIcon } from "@/components/ui/robux-icon";

const { minAmount, maxAmount, step, presets, defaultAmount } = robuxConfig;
const methodIcons = { gamepass: Gamepad2, "send-username": Send } satisfies Record<RobuxMethodId, unknown>;
const MAX_DIGITS = String(maxAmount).length;

const initialDraft: RobuxOrderDraft = {
  method: "send-username",
  amount: defaultAmount,
  account: "",
  whatsapp: "",
  paymentId: "",
  confirmed2sv: false,
};

/** `/robux?method=gamepass&amount=1500` pre-fills the panel (used by the home-page section). */
function draftFromParams(params: URLSearchParams): RobuxOrderDraft {
  const method = robuxConfig.methods.find((item) => item.id === params.get("method"))?.id ?? initialDraft.method;
  const rawAmount = Number(params.get("amount"));
  const amount =
    Number.isInteger(rawAmount) && !validateRobuxAmount(rawAmount, method) ? rawAmount : initialDraft.amount;
  return { ...initialDraft, method, amount };
}

/** Robux amount → price, only when the amount is inside the allowed range. */
function priceFor(method: RobuxMethodId, amount: number | null) {
  return amount !== null && !validateRobuxAmount(amount, method) ? calculateRobuxPrice(method, amount) : null;
}

export function RobuxPanel({ className }: { className?: string }) {
  const { locale, dict } = useI18n();
  const t = dict.robux;
  const c = dict.checkout;
  const formRef = useRef<HTMLFormElement>(null);
  const formId = useId();
  const amountHintId = useId();

  const searchParams = useSearchParams();
  const [draft, setDraft] = useState<RobuxOrderDraft>(() => draftFromParams(searchParams));
  const [touched, setTouched] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [order, setOrder] = useState<Order | null>(null);

  const update = <K extends keyof RobuxOrderDraft>(key: K, value: RobuxOrderDraft[K]) =>
    setDraft((prev) => ({ ...prev, [key]: value }));

  const method = getRobuxMethod(draft.method);
  /** Per-order max: Send Username is capped by its daily limit. */
  const methodMax = getRobuxMaxAmount(draft.method);

  const errors = useMemo(() => (touched ? validateRobuxOrder(draft) : {}), [touched, draft]);
  const errorText = (code?: OrderErrorCode) =>
    code
      ? interpolate(c.errors[code], { min: formatNumber(minAmount, locale), max: formatNumber(methodMax, locale) })
      : undefined;

  const amount = draft.amount;
  const subtotal = priceFor(draft.method, amount);
  const tier = getRobuxTier(draft.method, amount ?? 0);
  const upcomingTier = amount !== null ? getNextRobuxTier(draft.method, amount) : undefined;
  const nextTier = upcomingTier && upcomingTier.minAmount <= methodMax ? upcomingTier : undefined;
  const payment = getPaymentMethod(draft.paymentId);
  const total = subtotal !== null ? subtotal + (payment?.fee ?? 0) : null;
  const methodName = t.methods[draft.method].name;
  const n = (value: number) => formatNumber(value, locale);

  const setAmountFromInput = (raw: string) => {
    const digits = raw.replace(/\D/g, "").replace(/^0+/, "").slice(0, MAX_DIGITS);
    update("amount", digits ? Number(digits) : null);
  };
  const stepAmount = (direction: 1 | -1) => {
    const current = amount ?? 0;
    // Snap to the step grid first, so 1.250 → 1.300 (+) or 1.200 (−).
    const snapped =
      direction === 1 ? Math.floor(current / step) * step + step : Math.ceil(current / step) * step - step;
    update("amount", Math.min(methodMax, Math.max(minAmount, snapped)));
  };

  /** Switching to a method with a lower limit pulls the amount down to that limit. */
  const selectMethod = (id: RobuxMethodId) =>
    setDraft((prev) => {
      const max = getRobuxMaxAmount(id);
      return { ...prev, method: id, amount: prev.amount !== null && prev.amount > max ? max : prev.amount };
    });

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setTouched(true);
    const result = validateRobuxOrder(draft);
    const whatsapp = normalizeWhatsapp(draft.whatsapp);
    if (Object.keys(result).length > 0 || subtotal === null || total === null || !whatsapp || !payment) {
      const firstInvalid = formRef.current?.querySelector<HTMLElement>("[aria-invalid='true']");
      firstInvalid?.focus({ preventScroll: true });
      firstInvalid?.scrollIntoView({ block: "center", behavior: "smooth" });
      return;
    }
    setSubmitting(true);
    try {
      // Phase 2: the API recomputes the price from the method + amount — never trust this total.
      const created = await orderService.createOrder({
        product: "Robux",
        // Method names are the same in both languages; only the number format differs.
        item: {
          id: `${formatNumber(draft.amount ?? 0, "id")} Robux · ${methodName}`,
          en: `${formatNumber(draft.amount ?? 0, "en")} Robux · ${methodName}`,
        },
        account: draft.account.trim(),
        whatsapp,
        payment: payment.name,
        total,
      });
      setOrder(created);
      document.getElementById("robux-panel")?.scrollIntoView({ behavior: "smooth", block: "start" });
    } finally {
      setSubmitting(false);
    }
  };

  const reset = () => {
    setOrder(null);
    setTouched(false);
    setDraft((prev) => ({ ...initialDraft, method: prev.method, whatsapp: prev.whatsapp }));
  };

  const buyLabel = amount ? interpolate(t.buy, { amount: n(amount) }) : c.buyNow;

  return (
    <section id="robux-panel" aria-labelledby="robux-panel-title" className={cn("relative scroll-mt-20", className)}>
      <Container>
        <SectionHeading
          as="h1"
          id="robux-panel-title"
          eyebrow={t.eyebrow}
          title={
            <>
              {t.titleStart} <span className="text-highlight">{t.titleHighlight}</span>
            </>
          }
          description={t.description}
        />

        <Reveal className="mt-10 overflow-clip rounded-[2rem] border border-brand-100 bg-white shadow-xl shadow-brand-900/5">
          <AnimatePresence mode="wait" initial={false}>
            {order ? (
              <OrderSuccess key="success" order={order} onDone={reset} doneLabel={t.newOrder} />
            ) : (
              <m.div key="form" exit={{ opacity: 0, y: -12 }} className="grid lg:grid-cols-[1fr_21rem]">
                <form ref={formRef} id={formId} onSubmit={handleSubmit} noValidate className="grid gap-8 p-5 sm:p-8">
                  {/* 1 — Method */}
                  <Step number={1} title={t.steps.method}>
                    <fieldset className="grid gap-3 sm:grid-cols-2">
                      <legend className="sr-only">{t.steps.method}</legend>
                      {robuxConfig.methods.map((option) => {
                        const Icon = methodIcons[option.id];
                        const selected = draft.method === option.id;
                        const featured = "featured" in option && option.featured;
                        return (
                          <label
                            key={option.id}
                            className={cn(
                              "relative flex cursor-pointer gap-3 rounded-2xl border-2 p-4 transition-[border-color,background-color] duration-150 has-focus-visible:ring-2 has-focus-visible:ring-brand-400",
                              selected ? "border-brand-500 bg-brand-50" : "border-brand-100 hover:border-brand-300",
                            )}
                          >
                            <input
                              type="radio"
                              name="robux-method"
                              value={option.id}
                              checked={selected}
                              onChange={() => selectMethod(option.id)}
                              className="sr-only"
                            />
                            <span
                              className={cn(
                                "grid size-11 shrink-0 place-items-center rounded-xl transition-colors",
                                selected ? "bg-brand-400 text-ink-900" : "bg-brand-100 text-brand-700",
                              )}
                            >
                              <Icon className="size-5" aria-hidden="true" />
                            </span>
                            {featured ? (
                              <span className="absolute -top-2.5 right-3 inline-flex items-center gap-1 rounded-full bg-blush-500 px-2 py-0.5 text-[11px] font-bold text-white shadow-sm">
                                <Flame className="size-3" aria-hidden="true" />
                                {t.methods.popular}
                              </span>
                            ) : null}
                            <span className="min-w-0">
                              <span className="block font-semibold text-ink-900">{t.methods[option.id].name}</span>
                              <span className="mt-0.5 block text-xs text-ink-500">
                                {t.methods[option.id].description}
                              </span>
                              <span className="mt-2 inline-block rounded-full bg-white px-2 py-0.5 text-xs font-semibold text-brand-700 ring-1 ring-brand-100">
                                {interpolate(t.fromRate, { price: formatIDR(getLowestRobuxRate(option.id)) })}
                              </span>
                            </span>
                          </label>
                        );
                      })}
                    </fieldset>

                    <AnimatePresence initial={false}>
                      {method.requires2sv && method.limits ? (
                        <m.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: "auto" }}
                          exit={{ opacity: 0, height: 0 }}
                          className="overflow-hidden"
                        >
                          <div className="mt-3 rounded-2xl border border-blush-200 bg-blush-50/70 p-4 text-sm">
                            <p className="flex items-center gap-2 font-semibold text-ink-900">
                              <KeyRound className="size-4 text-blush-500" aria-hidden="true" />
                              {t.requirements.title}
                            </p>
                            <ul className="mt-2 grid gap-1.5 text-ink-700">
                              <li className="flex gap-2">
                                <ShieldCheck className="mt-0.5 size-4 shrink-0 text-brand-600" aria-hidden="true" />
                                {t.requirements.twoStep}
                              </li>
                              <li className="flex gap-2">
                                <Info className="mt-0.5 size-4 shrink-0 text-brand-600" aria-hidden="true" />
                                {interpolate(t.requirements.limit, {
                                  daily: n(method.limits.daily),
                                  monthly: n(method.limits.monthly),
                                })}
                              </li>
                            </ul>
                            <label
                              className={cn(
                                "mt-3 flex cursor-pointer items-start gap-3 rounded-xl border-2 bg-white px-3 py-2.5 transition-colors has-focus-visible:ring-2 has-focus-visible:ring-brand-400",
                                errors.confirm2sv
                                  ? "border-blush-500"
                                  : draft.confirmed2sv
                                    ? "border-brand-500"
                                    : "border-brand-100 hover:border-brand-300",
                              )}
                            >
                              <input
                                type="checkbox"
                                checked={draft.confirmed2sv}
                                onChange={(e) => update("confirmed2sv", e.target.checked)}
                                aria-invalid={Boolean(errors.confirm2sv)}
                                className="peer sr-only"
                              />
                              <span
                                aria-hidden="true"
                                className={cn(
                                  "mt-0.5 grid size-5 shrink-0 place-items-center rounded-md border-2 transition-colors",
                                  draft.confirmed2sv ? "border-brand-500 bg-brand-500 text-white" : "border-brand-200",
                                )}
                              >
                                {draft.confirmed2sv ? <Check className="size-3.5" /> : null}
                              </span>
                              <span className="font-medium text-ink-900">{t.requirements.confirm}</span>
                            </label>
                            {errors.confirm2sv ? (
                              <p role="alert" className="mt-1.5 text-xs font-medium text-blush-700">
                                {errorText(errors.confirm2sv)}
                              </p>
                            ) : null}
                          </div>
                        </m.div>
                      ) : null}
                    </AnimatePresence>
                  </Step>

                  {/* 2 — Amount */}
                  <Step number={2} title={t.steps.amount} error={errorText(errors.amount)}>
                    <div className="flex items-stretch gap-2">
                      <AmountButton
                        label={interpolate(t.decrease, { step: n(step) })}
                        disabled={amount !== null && amount <= minAmount}
                        onClick={() => stepAmount(-1)}
                      >
                        <Minus className="size-5" aria-hidden="true" />
                      </AmountButton>
                      <div className="relative flex-1">
                        <RobuxIcon
                          className="pointer-events-none absolute top-1/2 left-3.5 size-5 -translate-y-1/2 text-brand-500 sm:left-4 sm:size-6"
                          aria-hidden="true"
                        />
                        <input
                          type="text"
                          inputMode="numeric"
                          autoComplete="off"
                          aria-label={t.amountLabel}
                          aria-invalid={Boolean(errors.amount)}
                          aria-describedby={amountHintId}
                          value={amount === null ? "" : n(amount)}
                          onChange={(e) => setAmountFromInput(e.target.value)}
                          onFocus={(e) => e.target.select()}
                          placeholder={n(defaultAmount)}
                          className={cn(
                            inputClass(Boolean(errors.amount)),
                            "h-16 pr-14 pl-11 text-2xl font-extrabold tabular-nums sm:pr-20 sm:pl-13 sm:text-3xl",
                          )}
                        />
                        <span className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-xs font-bold text-ink-300 sm:right-4 sm:text-sm">
                          Robux
                        </span>
                      </div>
                      <AmountButton
                        label={interpolate(t.increase, { step: n(step) })}
                        disabled={amount !== null && amount >= methodMax}
                        onClick={() => stepAmount(1)}
                      >
                        <Plus className="size-5" aria-hidden="true" />
                      </AmountButton>
                    </div>
                    <p id={amountHintId} className="mt-2 text-xs text-ink-500">
                      {interpolate(t.amountHint, { min: n(minAmount), max: n(methodMax) })}
                    </p>

                    <fieldset className="mt-4">
                      <legend className="sr-only">{t.presetsLabel}</legend>
                      <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 xl:grid-cols-6">
                        {presets.map((preset) => {
                          const selected = amount === preset;
                          // Above this method's limit (e.g. 10.000 with Send Username): shown but not selectable.
                          const overLimit = preset > methodMax;
                          return (
                            <button
                              key={preset}
                              type="button"
                              aria-pressed={selected}
                              disabled={overLimit}
                              onClick={() => update("amount", preset)}
                              className={cn(
                                "rounded-xl border-2 px-2 py-2 text-left transition-[border-color,background-color,transform,opacity] duration-150 active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-40 disabled:active:scale-100",
                                selected
                                  ? "border-brand-500 bg-brand-50"
                                  : "border-brand-100 enabled:hover:border-brand-300",
                              )}
                            >
                              <span className="flex items-center gap-1 text-sm font-bold text-ink-900 tabular-nums">
                                <RobuxIcon className="size-3.5 text-brand-500" aria-hidden="true" />
                                {n(preset)}
                              </span>
                              <span className="block text-xs text-ink-500 tabular-nums">
                                {formatIDR(calculateRobuxPrice(draft.method, preset))}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </fieldset>

                    <div className="mt-4 flex flex-wrap items-center gap-2 text-xs">
                      <span className="rounded-full bg-brand-100 px-2.5 py-1 font-semibold text-brand-800">
                        {interpolate(t.rate, { price: formatIDR(tier.rate) })}
                      </span>
                      {nextTier ? (
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-blush-50 px-2.5 py-1 font-medium text-blush-800">
                          <BadgePercent className="size-3.5 text-blush-500" aria-hidden="true" />
                          {interpolate(t.nextTier, { amount: n(nextTier.minAmount), price: formatIDR(nextTier.rate) })}
                        </span>
                      ) : null}
                    </div>

                    <AnimatePresence initial={false}>
                      {draft.method === "gamepass" && amount !== null && !validateRobuxAmount(amount, draft.method) ? (
                        <m.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: "auto" }}
                          exit={{ opacity: 0, height: 0 }}
                          className="overflow-hidden"
                        >
                          <p className="mt-3 flex items-start gap-2 rounded-xl bg-blush-50 px-3 py-2.5 text-xs text-blush-900">
                            <Info className="mt-px size-4 shrink-0 text-blush-500" aria-hidden="true" />
                            {interpolate(t.gamepassHint, { price: n(getGamepassPrice(amount)), amount: n(amount) })}
                          </p>
                        </m.div>
                      ) : null}
                    </AnimatePresence>
                  </Step>

                  {/* 3 — Account */}
                  <Step number={3} title={t.steps.account}>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <Field
                        label={c.username.label}
                        error={errorText(errors.account)}
                        hint={
                          <>
                            <Lock className="size-3.5 shrink-0 text-brand-600" aria-hidden="true" />
                            {c.username.hint}
                          </>
                        }
                      >
                        {(props) => (
                          <input
                            {...props}
                            type="text"
                            autoComplete="username"
                            autoCapitalize="off"
                            spellCheck={false}
                            maxLength={LIMITS.usernameMax}
                            placeholder={c.username.placeholder}
                            value={draft.account}
                            onChange={(e) => update("account", sanitizeUsername(e.target.value))}
                            className={inputClass(Boolean(errors.account))}
                          />
                        )}
                      </Field>
                      <Field label={c.whatsapp.label} error={errorText(errors.whatsapp)} hint={c.whatsapp.hint}>
                        {(props) => (
                          <input
                            {...props}
                            type="tel"
                            inputMode="tel"
                            autoComplete="tel"
                            maxLength={LIMITS.whatsappMax}
                            placeholder={c.whatsapp.placeholder}
                            value={draft.whatsapp}
                            onChange={(e) => update("whatsapp", sanitizeWhatsapp(e.target.value))}
                            className={inputClass(Boolean(errors.whatsapp))}
                          />
                        )}
                      </Field>
                    </div>
                  </Step>

                  {/* 4 — Payment */}
                  <Step number={4} title={t.steps.payment} error={errorText(errors.payment)}>
                    <PaymentPicker
                      name="robux-payment"
                      value={draft.paymentId}
                      onChange={(id) => update("paymentId", id)}
                      invalid={Boolean(errors.payment)}
                      columns={3}
                    />
                  </Step>
                </form>

                {/* Summary — sticky sidebar on desktop */}
                <aside className="hidden border-l border-brand-100 bg-linear-to-b from-brand-50/70 to-white p-6 lg:block">
                  <div className="sticky top-24">
                    <h3 className="text-sm font-semibold tracking-wider text-ink-500 uppercase">{c.summary.title}</h3>
                    <dl className="mt-4 grid gap-3 text-sm">
                      <SummaryRow label={t.summary.method} value={methodName} />
                      <SummaryRow label={t.summary.amount} value={amount ? `${n(amount)} Robux` : "—"} />
                      <SummaryRow label={t.summary.rate} value={formatIDR(tier.rate)} />
                      <SummaryRow label={c.summary.username} value={draft.account || "—"} />
                      <SummaryRow label={t.summary.subtotal} value={subtotal !== null ? formatIDR(subtotal) : "—"} />
                      <SummaryRow
                        label={c.summary.fee}
                        value={payment ? (payment.fee ? formatIDR(payment.fee) : dict.common.free) : "—"}
                      />
                    </dl>
                    <div className="mt-4 flex items-end justify-between border-t border-dashed border-brand-200 pt-4">
                      <span className="text-sm font-medium text-ink-700">{c.summary.total}</span>
                      <Total value={total} />
                    </div>
                    <Button type="submit" form={formId} size="lg" className="mt-5 w-full" disabled={submitting}>
                      <Zap className="size-4" aria-hidden="true" />
                      {submitting ? c.processing : buyLabel}
                    </Button>
                    <p className="mt-3 flex items-center justify-center gap-1.5 text-xs text-ink-500">
                      <ShieldCheck className="size-4 text-brand-600" aria-hidden="true" />
                      {c.secure}
                    </p>
                  </div>
                </aside>

                {/* Summary — sticky bottom bar on mobile/tablet, only while this panel is on screen */}
                <div className="sticky bottom-0 z-10 flex items-center gap-3 border-t border-brand-100 bg-white/95 p-4 backdrop-blur lg:hidden">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs text-ink-500">
                      {amount ? `${n(amount)} Robux · ${methodName}` : methodName}
                    </p>
                    <Total value={total} />
                  </div>
                  <Button type="submit" form={formId} disabled={submitting}>
                    <Zap className="size-4" aria-hidden="true" />
                    {submitting ? c.processing : c.buyNow}
                  </Button>
                </div>
              </m.div>
            )}
          </AnimatePresence>
        </Reveal>
      </Container>
    </section>
  );
}

function AmountButton({
  label,
  disabled,
  onClick,
  children,
}: {
  label: string;
  disabled: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className="grid w-12 shrink-0 place-items-center rounded-xl border-2 border-brand-100 bg-white text-ink-900 transition-[border-color,background-color,transform] hover:border-brand-300 hover:bg-brand-50 active:scale-95 disabled:opacity-40 sm:w-14"
    >
      {children}
    </button>
  );
}

function Total({ value }: { value: number | null }) {
  return (
    <span aria-live="polite" className="block text-2xl font-extrabold text-ink-900 tabular-nums">
      <m.span key={value ?? "none"} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="block">
        {value !== null ? formatIDR(value) : "—"}
      </m.span>
    </span>
  );
}
