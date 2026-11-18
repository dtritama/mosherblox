"use client";

import { AnimatePresence, m } from "motion/react";
import {
  BadgeCheck,
  Check,
  CircleAlert,
  Clock,
  Hourglass,
  Loader2,
  MessageCircle,
  PackageCheck,
  Search,
  X,
} from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useRef, useState, type FormEvent } from "react";

import { Field, inputClass, SummaryRow } from "@/components/checkout/form-parts";
import { SubmitError } from "@/components/checkout/submit-error";
import { Button } from "@/components/ui/button";
import { siteConfig } from "@/config/site";
import { intlLocales } from "@/i18n/config";
import { formatIDR, interpolate } from "@/i18n/format";
import { useI18n } from "@/i18n/i18n-provider";
import { DEMO_WHATSAPP, demoOrders, SHOW_DEMO_ORDERS } from "@/lib/orders/demo-orders";
import { normalizeOrderId } from "@/lib/orders/order-id";
import { orderService } from "@/lib/orders/service";
import type { Order, OrderStatus } from "@/lib/orders/types";
import { cn } from "@/lib/utils";
import { LIMITS, normalizeWhatsapp, sanitizeWhatsapp } from "@/lib/validation";

export const statusStyles: Record<OrderStatus, { badge: string; icon: typeof Clock }> = {
  pending: { badge: "bg-amber-100 text-amber-800", icon: Clock },
  paid: { badge: "bg-brand-100 text-brand-800", icon: BadgeCheck },
  processing: { badge: "bg-sky-100 text-sky-800", icon: Loader2 },
  completed: { badge: "bg-brand-100 text-brand-800", icon: PackageCheck },
  failed: { badge: "bg-blush-100 text-blush-800", icon: CircleAlert },
  expired: { badge: "bg-ink-300/25 text-ink-700", icon: Hourglass },
};

/** Index of the timeline step the order is currently on (0 created · 1 payment · 2 processing · 3 done). */
const currentStep: Record<OrderStatus, number> = {
  pending: 1,
  paid: 2,
  processing: 2,
  completed: 4,
  failed: 1,
  expired: 1,
};

type FormErrors = { orderId?: string; whatsapp?: string };

export function CheckOrder() {
  const { dict } = useI18n();
  const t = dict.checkOrder;
  const searchParams = useSearchParams();
  const orderIdRef = useRef<HTMLInputElement>(null);

  const [orderId, setOrderId] = useState(() => normalizeOrderId(searchParams.get("id") ?? ""));
  const [whatsapp, setWhatsapp] = useState("");
  const [errors, setErrors] = useState<FormErrors>({});
  const [searching, setSearching] = useState(false);
  const [notFound, setNotFound] = useState(false);
  const [lookupError, setLookupError] = useState<"rateLimited" | "unavailable" | null>(null);
  const [order, setOrder] = useState<Order | null>(null);

  const search = async (id: string, phone: string) => {
    const nextErrors: FormErrors = {};
    const normalizedId = normalizeOrderId(id);
    const normalizedPhone = normalizeWhatsapp(phone);
    if (!normalizedId) nextErrors.orderId = t.errors.orderId;
    if (!normalizedPhone) nextErrors.whatsapp = dict.checkout.errors.invalidWhatsapp;
    setErrors(nextErrors);
    setNotFound(false);
    setLookupError(null);
    if (!normalizedId || !normalizedPhone) return;

    setSearching(true);
    try {
      const result = await orderService.findOrder(normalizedId, normalizedPhone);
      if (!result.ok) {
        setLookupError(result.error);
        return;
      }
      setOrder(result.order);
      setNotFound(!result.order);
    } finally {
      setSearching(false);
    }
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    void search(orderId, whatsapp);
  };

  const tryDemo = (id: string) => {
    setOrderId(id);
    setWhatsapp(DEMO_WHATSAPP);
    void search(id, DEMO_WHATSAPP);
  };

  const searchAgain = () => {
    setOrder(null);
    setOrderId("");
    requestAnimationFrame(() => orderIdRef.current?.focus());
  };

  return (
    <div className="grid gap-4">
      <div className="overflow-hidden rounded-[2rem] border border-brand-100 bg-white shadow-xl shadow-brand-900/5">
        <AnimatePresence mode="wait" initial={false}>
          {order ? (
            <OrderResult key={order.id} order={order} onSearchAgain={searchAgain} />
          ) : (
            <m.form
              key="form"
              onSubmit={handleSubmit}
              noValidate
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              className="grid gap-4 p-5 sm:p-8"
            >
              <Field label={t.orderId.label} error={errors.orderId}>
                {(props) => (
                  <input
                    {...props}
                    ref={orderIdRef}
                    type="text"
                    autoComplete="off"
                    autoCapitalize="characters"
                    spellCheck={false}
                    maxLength={16}
                    placeholder={t.orderId.placeholder}
                    value={orderId}
                    onChange={(e) => setOrderId(normalizeOrderId(e.target.value))}
                    className={cn(inputClass(Boolean(errors.orderId)), "font-mono tracking-wider uppercase")}
                  />
                )}
              </Field>
              <Field label={dict.checkout.whatsapp.label} error={errors.whatsapp}>
                {(props) => (
                  <input
                    {...props}
                    type="tel"
                    inputMode="tel"
                    autoComplete="tel"
                    maxLength={LIMITS.whatsappMax}
                    placeholder={dict.checkout.whatsapp.placeholder}
                    value={whatsapp}
                    onChange={(e) => setWhatsapp(sanitizeWhatsapp(e.target.value))}
                    className={inputClass(Boolean(errors.whatsapp))}
                  />
                )}
              </Field>

              <SubmitError message={lookupError ? t.errors[lookupError] : notFound ? t.errors.notFound : null} />

              <Button type="submit" size="lg" className="mt-1 w-full" disabled={searching}>
                {searching ? (
                  <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                ) : (
                  <Search className="size-4" aria-hidden="true" />
                )}
                {searching ? t.searching : t.submit}
              </Button>
            </m.form>
          )}
        </AnimatePresence>
      </div>

      {SHOW_DEMO_ORDERS ? (
        <aside className="rounded-2xl border border-dashed border-brand-200 bg-brand-50/60 p-4 text-sm">
          <p className="font-semibold text-ink-900">{t.demo.title}</p>
          <p className="mt-1 text-ink-500">{interpolate(t.demo.description, { phone: DEMO_WHATSAPP })}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {demoOrders.map((demo) => (
              <button
                key={demo.id}
                type="button"
                onClick={() => tryDemo(demo.id)}
                className="inline-flex items-center gap-2 rounded-full border border-brand-100 bg-white px-3 py-1.5 font-mono text-xs font-semibold text-ink-900 transition-colors hover:border-brand-300"
              >
                {demo.id}
                <span
                  className={cn("rounded-full px-1.5 py-px font-sans text-[10px]", statusStyles[demo.status].badge)}
                >
                  {t.status[demo.status]}
                </span>
              </button>
            ))}
          </div>
        </aside>
      ) : null}
    </div>
  );
}

function OrderResult({ order: result, onSearchAgain }: { order: Order; onSearchAgain: () => void }) {
  const { locale, dict } = useI18n();
  const t = dict.checkOrder;
  const style = statusStyles[result.status];
  const StatusIcon = style.icon;
  const step = currentStep[result.status];
  const failed = result.status === "failed" || result.status === "expired";
  const date = new Intl.DateTimeFormat(intlLocales[locale], { dateStyle: "medium", timeStyle: "short" }).format(
    new Date(result.createdAt),
  );
  const helpHref = `https://wa.me/${siteConfig.contact.whatsapp.number}?text=${encodeURIComponent(
    `${dict.contact.whatsappMessage} (${result.id})`,
  )}`;

  return (
    <m.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }}>
      <div className="border-b border-brand-100 bg-linear-to-r from-brand-50 to-white p-5 sm:p-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="font-mono text-xl font-bold tracking-wider text-ink-900">{result.id}</p>
          <span
            className={cn("inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-semibold", style.badge)}
          >
            <StatusIcon
              className={cn("size-4", result.status === "processing" && "animate-spin [animation-duration:2.5s]")}
              aria-hidden="true"
            />
            {t.status[result.status]}
          </span>
        </div>
        <p role="status" className="mt-2 text-sm text-ink-500">
          {t.statusDescription[result.status]}
        </p>

        <ol className="mt-6 grid grid-cols-4 gap-2">
          {t.timeline.map((label, index) => {
            const done = index < step;
            const current = index === step && !failed;
            const failedHere = failed && index === step;
            return (
              <li key={label} className="relative grid justify-items-center gap-2 text-center">
                {index > 0 ? (
                  <span
                    aria-hidden="true"
                    className={cn(
                      "absolute top-4 right-1/2 h-0.5 w-full -translate-y-1/2",
                      done || current || failedHere ? "bg-brand-400" : "bg-brand-100",
                    )}
                  />
                ) : null}
                <span
                  className={cn(
                    "relative grid size-8 place-items-center rounded-full border-2 text-xs font-bold",
                    done && "border-brand-400 bg-brand-400 text-ink-900",
                    current && "border-brand-400 bg-white text-brand-700",
                    failedHere && "border-blush-500 bg-blush-500 text-white",
                    !done && !current && !failedHere && "border-brand-100 bg-white text-ink-300",
                  )}
                >
                  {done ? (
                    <Check className="size-4" aria-hidden="true" />
                  ) : failedHere ? (
                    <X className="size-4" aria-hidden="true" />
                  ) : (
                    index + 1
                  )}
                  {current ? (
                    <span className="absolute inset-0 animate-ping rounded-full border-2 border-brand-400 opacity-40" />
                  ) : null}
                </span>
                <span
                  className={cn(
                    "text-[11px] leading-tight font-medium sm:text-xs",
                    done || current ? "text-ink-900" : failedHere ? "text-blush-700" : "text-ink-300",
                  )}
                >
                  {label}
                </span>
              </li>
            );
          })}
        </ol>
      </div>

      <div className="p-5 sm:p-8">
        <h2 className="text-sm font-semibold tracking-wider text-ink-500 uppercase">{t.details.title}</h2>
        <dl className="mt-4 grid gap-3 text-sm">
          <SummaryRow label={t.details.date} value={date} />
          <SummaryRow label={t.details.product} value={result.product} />
          <SummaryRow label={t.details.item} value={result.item[locale]} />
          <SummaryRow label={t.details.account} value={result.account} />
          <SummaryRow label={t.details.payment} value={result.payment} />
        </dl>
        <div className="mt-4 flex items-end justify-between border-t border-dashed border-brand-200 pt-4">
          <span className="text-sm font-medium text-ink-700">{t.details.total}</span>
          <span className="text-2xl font-extrabold text-ink-900">{formatIDR(result.total)}</span>
        </div>
        <div className="mt-6 flex flex-wrap gap-3">
          <a
            href={helpHref}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex h-11 items-center gap-2 rounded-2xl border border-brand-200 bg-white px-5 text-sm font-semibold text-ink-900 transition-colors hover:border-blush-300"
          >
            <MessageCircle className="size-4 text-brand-600" aria-hidden="true" />
            {t.help}
            <span className="sr-only">{dict.contact.newTab}</span>
          </a>
          <Button onClick={onSearchAgain}>
            <Search className="size-4" aria-hidden="true" />
            {t.searchAgain}
          </Button>
        </div>
      </div>
    </m.div>
  );
}
