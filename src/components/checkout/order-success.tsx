"use client";

import { m } from "motion/react";
import { Check, CheckCircle2, Copy, Search } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

import { QrisPayment } from "@/components/checkout/qris-payment";
import { Button, buttonVariants } from "@/components/ui/button";
import { localeHref } from "@/i18n/config";
import { formatIDR, interpolate } from "@/i18n/format";
import { useI18n } from "@/i18n/i18n-provider";
import { rememberOrder } from "@/lib/orders/recent-orders";
import { PAYMENTS_LIVE } from "@/lib/orders/service";
import type { Order } from "@/lib/orders/types";
import { RESUME_PARAM } from "@/components/orders/resume-order";

/**
 * Shown after checkout: order ID (copyable), summary, the QRIS payment step while the order
 * waits for payment, and a link to Check Order.
 *
 * The order is remembered on this device (Check Order lists it) and its ID is put in the address
 * bar (`?order=MB-…`): a refresh then lands on Check Order with the order open (ResumeOrder).
 */
export function OrderSuccess({
  order: created,
  onDone,
  doneLabel,
  remember = true,
}: {
  order: Order;
  onDone: () => void;
  doneLabel?: string;
  /** false for the design-kit sample. */
  remember?: boolean;
}) {
  const { locale, dict } = useI18n();
  const t = dict.checkout.success;
  const [copied, setCopied] = useState(false);
  // Updated after "Saya sudah bayar".
  const [order, setOrder] = useState(created);

  useEffect(() => {
    if (!remember) return;
    rememberOrder(created);
    const url = new URL(window.location.href);
    url.searchParams.set(RESUME_PARAM, created.id);
    window.history.replaceState(null, "", url);
    return () => {
      // Closed / "Selesai": take the ID out of the address again (only if it is still ours).
      const current = new URL(window.location.href);
      if (current.searchParams.get(RESUME_PARAM) !== created.id) return;
      current.searchParams.delete(RESUME_PARAM);
      window.history.replaceState(null, "", current);
    };
  }, [created, remember]);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(order.id);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard can be blocked; the ID is still visible and selectable.
    }
  };

  return (
    <m.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="grid place-items-center gap-4 p-6 text-center sm:p-10"
    >
      <m.span
        initial={{ scale: 0, rotate: -30 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ type: "spring", stiffness: 260, damping: 16, delay: 0.1 }}
        className="grid size-20 place-items-center rounded-full bg-brand-400 text-ink-900 shadow-xl shadow-brand-500/30"
      >
        <CheckCircle2 className="size-10" aria-hidden="true" />
      </m.span>

      <div>
        <p className="text-sm font-semibold text-blush-600">{t.title}</p>
        <p className="mt-3 text-xs font-medium tracking-wider text-ink-500 uppercase">{t.orderId}</p>
        <div className="mt-1 flex items-center justify-center gap-2">
          <p className="font-mono text-2xl font-bold tracking-wider text-ink-900 select-all">{order.id}</p>
          <button
            type="button"
            onClick={copy}
            aria-label={t.copy}
            className="grid size-9 place-items-center rounded-xl border border-brand-100 text-ink-700 transition-colors hover:border-brand-300 hover:bg-brand-50"
          >
            {copied ? (
              <Check className="size-4 text-brand-700" aria-hidden="true" />
            ) : (
              <Copy className="size-4" aria-hidden="true" />
            )}
          </button>
        </div>
        <p role="status" className="mt-1 h-4 text-xs font-medium text-brand-700">
          {copied ? t.copied : ""}
        </p>
        <p className="text-xs text-ink-500">{t.saveHint}</p>
      </div>

      <p className="max-w-md text-ink-500">
        {interpolate(t.summary, {
          item: order.item[locale],
          account: order.account,
          payment: order.payment,
          total: formatIDR(order.total),
        })}
      </p>

      {PAYMENTS_LIVE && order.status === "pending" ? <QrisPayment order={order} onChange={setOrder} /> : null}

      {!PAYMENTS_LIVE ? (
        <p className="max-w-md rounded-xl bg-brand-50 px-4 py-3 text-sm text-brand-800">{t.demo}</p>
      ) : null}

      <div className="mt-1 flex flex-wrap justify-center gap-3">
        <Link
          href={`${localeHref(locale, "/check-order")}?id=${encodeURIComponent(order.id)}`}
          className={buttonVariants({ variant: "outline" })}
        >
          <Search className="size-4" aria-hidden="true" />
          {t.checkStatus}
        </Link>
        <Button onClick={onDone}>{doneLabel ?? t.done}</Button>
      </div>
    </m.div>
  );
}
