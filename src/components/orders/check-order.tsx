"use client";

import { AnimatePresence, m } from "motion/react";
import { Check, ChevronRight, ExternalLink, History, Loader2, MessageCircle, PackageCheck, Search, X } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useEffect, useRef, useState, type FormEvent } from "react";

import { Field, inputClass, SummaryRow } from "@/components/checkout/form-parts";
import { QrisPayment } from "@/components/checkout/qris-payment";
import { ReviewForm } from "@/components/orders/review-form";
import { SubmitError } from "@/components/checkout/submit-error";
import { statusStyles } from "@/components/orders/status-styles";
import { Button } from "@/components/ui/button";
import { siteConfig } from "@/config/site";
import { intlLocales, localize } from "@/i18n/config";
import { formatIDR, interpolate } from "@/i18n/format";
import { useI18n } from "@/i18n/i18n-provider";
import { DEMO_WHATSAPP, demoOrders, SHOW_DEMO_ORDERS } from "@/lib/orders/demo-orders";
import { normalizeOrderId } from "@/lib/orders/order-id";
import { findRecentOrder, forgetOrder, rememberOrder, useRecentOrders } from "@/lib/orders/recent-orders";
import { orderService } from "@/lib/orders/service";
import type { Order, OrderStatus } from "@/lib/orders/types";
import { cn } from "@/lib/utils";
import { LIMITS, normalizeWhatsapp, sanitizeWhatsapp } from "@/lib/validation";

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
      if (result.order) rememberOrder(result.order);
    } finally {
      setSearching(false);
    }
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    void search(orderId, whatsapp);
  };

  // ?id= of an order this device remembers (refresh after checkout, "Cek status" link): open it.
  useEffect(() => {
    const saved = findRecentOrder(normalizeOrderId(searchParams.get("id") ?? ""));
    if (!saved) return;
    // The saved list lives in localStorage (outside React), so it's read after mounting.
    let active = true;
    void Promise.resolve().then(() => {
      if (!active) return;
      setWhatsapp(saved.whatsapp);
      return search(saved.id, saved.whatsapp);
    });
    return () => {
      active = false;
    };
    // Only on arrival.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const openRecent = (id: string, phone: string) => {
    setOrderId(id);
    setWhatsapp(phone);
    void search(id, phone);
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
    // minmax(0,1fr): long one-line text inside (recent orders) must not widen the page on phones.
    <div className="grid min-w-0 grid-cols-[minmax(0,1fr)] gap-4">
      <div className="overflow-hidden rounded-[2rem] border border-brand-100 bg-white shadow-xl shadow-brand-900/5">
        <AnimatePresence mode="wait" initial={false}>
          {order ? (
            <OrderResult key={order.id} order={order} onChange={setOrder} onSearchAgain={searchAgain} />
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

      {!order ? <RecentOrders disabled={searching} onOpen={openRecent} /> : null}

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

function OrderResult({
  order: result,
  onChange,
  onSearchAgain,
}: {
  order: Order;
  onChange: (order: Order) => void;
  onSearchAgain: () => void;
}) {
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
          {result.status === "pending" && result.paymentStatus === "submitted"
            ? dict.payment.submittedTitle
            : t.statusDescription[result.status]}
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
                    done && "border-brand-400 bg-brand-400 text-coal",
                    current && "border-brand-400 bg-white text-brand-700",
                    failedHere && "border-blush-500 bg-blush-500 text-snow",
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

      {result.status === "pending" ? (
        <div className="border-b border-brand-100 bg-brand-50/40 p-4 sm:p-6">
          <QrisPayment order={result} onChange={onChange} />
        </div>
      ) : null}

      {result.deliveryProofUrl ? (
        <div className="border-b border-brand-100 p-5 sm:p-8">
          <div className="flex items-start gap-3">
            <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-brand-50 text-brand-700">
              <PackageCheck className="size-4" aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <h2 className="font-semibold text-ink-900">{t.deliveryProof.title}</h2>
              <p className="text-sm text-ink-500">{t.deliveryProof.description}</p>
            </div>
          </div>
          <a
            href={result.deliveryProofUrl}
            target="_blank"
            rel="noopener"
            className="group mt-4 block w-full max-w-xs overflow-hidden rounded-2xl border border-brand-100"
          >
            {/* Our own route with a random file name; a plain <img> keeps the screenshot exact. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={result.deliveryProofUrl}
              alt={interpolate(t.deliveryProof.alt, { id: result.id })}
              loading="lazy"
              className="max-h-96 w-full bg-brand-50/40 object-contain transition-transform duration-300 group-hover:scale-[1.02]"
            />
            <span className="flex items-center justify-center gap-1.5 border-t border-brand-100 bg-brand-50 py-2 text-xs font-semibold text-ink-700">
              {t.deliveryProof.open}
              <ExternalLink className="size-3.5" aria-hidden="true" />
              <span className="sr-only">{dict.contact.newTab}</span>
            </span>
          </a>
        </div>
      ) : null}

      {result.status === "completed" ? (
        <div className="border-b border-brand-100 bg-brand-50/40 p-4 sm:p-6">
          <ReviewForm orderId={result.id} whatsapp={result.whatsapp} alreadyReviewed={result.hasReview} />
        </div>
      ) : null}

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

/** Orders remembered on this device (lib/orders/recent-orders.ts); hidden while empty. */
function RecentOrders({ disabled, onOpen }: { disabled: boolean; onOpen: (id: string, whatsapp: string) => void }) {
  const { locale, dict } = useI18n();
  const t = dict.checkOrder.recent;
  const recent = useRecentOrders();
  if (recent.length === 0) return null;
  const formatDate = new Intl.DateTimeFormat(intlLocales[locale], { dateStyle: "medium", timeStyle: "short" });

  return (
    <section
      aria-labelledby="recent-orders-title"
      className="rounded-[1.75rem] border border-brand-100 bg-white p-4 shadow-lg shadow-brand-900/5 sm:p-6"
    >
      <div className="flex items-start gap-3">
        <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-brand-50 text-brand-700">
          <History className="size-4" aria-hidden="true" />
        </span>
        <div className="min-w-0">
          <h2 id="recent-orders-title" className="font-semibold text-ink-900">
            {t.title}
          </h2>
          <p className="text-sm text-ink-500">{t.description}</p>
        </div>
      </div>
      <ul className="mt-4 grid grid-cols-[minmax(0,1fr)] gap-2">
        {recent.map((saved) => (
          <li key={saved.id} className="flex items-stretch gap-2">
            <button
              type="button"
              disabled={disabled}
              onClick={() => onOpen(saved.id, saved.whatsapp)}
              aria-label={interpolate(t.open, { id: saved.id })}
              className="group flex min-w-0 flex-1 items-center gap-3 rounded-2xl border border-brand-100 px-4 py-3 text-left transition-colors hover:border-brand-300 hover:bg-brand-50/60 disabled:opacity-60"
            >
              <span className="min-w-0 flex-1">
                <span className="block font-mono text-sm font-bold tracking-wider text-ink-900">{saved.id}</span>
                <span className="block truncate text-sm text-ink-700">{localize(saved.item, locale)}</span>
                <span className="block text-xs text-ink-500">
                  {formatDate.format(new Date(saved.createdAt))} · {formatIDR(saved.total)}
                </span>
              </span>
              <ChevronRight
                className="size-4 shrink-0 text-ink-300 transition-transform group-hover:translate-x-0.5 group-hover:text-ink-700"
                aria-hidden="true"
              />
            </button>
            <button
              type="button"
              onClick={() => forgetOrder(saved.id)}
              aria-label={interpolate(t.remove, { id: saved.id })}
              className="grid w-11 shrink-0 place-items-center rounded-2xl border border-transparent text-ink-300 transition-colors hover:border-blush-200 hover:bg-blush-50 hover:text-blush-700"
            >
              <X className="size-4" aria-hidden="true" />
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
