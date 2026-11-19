"use client";

import { AnimatePresence, m } from "motion/react";
import { Check, Clock, Copy, Download, Hourglass, ImageUp, Loader2, ScanLine, ShieldCheck, X } from "lucide-react";
import Image from "next/image";
import { useEffect, useId, useState, type FormEvent } from "react";

import { SubmitError } from "@/components/checkout/submit-error";
import { useStoreSettings } from "@/components/providers/settings-provider";
import { Button } from "@/components/ui/button";
import { orderConfig } from "@/data/orders";
import { intlLocales } from "@/i18n/config";
import { formatIDR, interpolate } from "@/i18n/format";
import { useI18n } from "@/i18n/i18n-provider";
import { orderService } from "@/lib/orders/service";
import type { ClaimPaymentResult, Order } from "@/lib/orders/types";
import { cn } from "@/lib/utils";

type ClaimError = Extract<ClaimPaymentResult, { ok: false }>["error"];

/** Re-renders every second while mounted (for the countdown). */
function useNow() {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);
  return now;
}

function formatCountdown(ms: number) {
  const total = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`;
}

/**
 * Manual QRIS payment: the store's QRIS, the exact amount (with unique code), a countdown, and
 * "Saya sudah bayar" with an optional screenshot. Used right after checkout and on Check Order
 * for orders that are still waiting for payment.
 */
export function QrisPayment({ order, onChange }: { order: Order; onChange: (order: Order) => void }) {
  const { locale, dict } = useI18n();
  const t = dict.payment;
  const titleId = useId();
  const proofId = useId();
  const proofHintId = useId();
  const now = useNow();
  // The store's current QRIS (admin settings; default in src/data/payments.ts).
  const { qris } = useStoreSettings();

  const [copied, setCopied] = useState(false);
  const [proof, setProof] = useState<File | null>(null);
  const [proofKey, setProofKey] = useState(0);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<ClaimError | null>(null);

  const expiresAt = new Date(order.expiresAt).getTime();
  const claimUntil = new Date(order.claimUntil).getTime();
  const timeFormat = new Intl.DateTimeFormat(intlLocales[locale], { hour: "2-digit", minute: "2-digit" });
  const submitted = order.paymentStatus === "submitted";
  const timeUp = now >= expiresAt;
  const closed = now >= claimUntil && !submitted;

  const copyAmount = async () => {
    try {
      await navigator.clipboard.writeText(String(order.total));
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard blocked: the amount is still visible and selectable.
    }
  };

  const pickProof = (file: File | null) => {
    setError(null);
    if (
      file &&
      (file.size > orderConfig.proofMaxBytes || !(orderConfig.proofTypes as readonly string[]).includes(file.type))
    ) {
      setError("badProof");
      setProof(null);
      setProofKey((key) => key + 1);
      return;
    }
    setProof(file);
  };

  const claim = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setSending(true);
    try {
      const result = await orderService.claimPayment({ orderId: order.id, whatsapp: order.whatsapp, proof });
      if (result.ok) onChange(result.order);
      else setError(result.error);
    } finally {
      setSending(false);
    }
  };

  if (submitted) {
    return (
      <section
        aria-labelledby={titleId}
        className="w-full rounded-[1.75rem] border border-brand-200 bg-brand-50 p-5 text-left sm:p-6"
      >
        <div className="flex items-start gap-3">
          <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-brand-400 text-ink-900">
            <ShieldCheck className="size-5" aria-hidden="true" />
          </span>
          <div>
            <h3 id={titleId} className="font-bold text-ink-900">
              {t.submittedTitle}
            </h3>
            <p role="status" className="mt-1 text-sm text-ink-700">
              {t.submittedText}
            </p>
            {order.hasProof ? (
              <p className="mt-2 flex items-center gap-1.5 text-xs font-medium text-brand-800">
                <Check className="size-3.5" aria-hidden="true" />
                {t.submittedProof}
              </p>
            ) : null}
          </div>
        </div>
      </section>
    );
  }

  if (closed) {
    return (
      <p
        role="status"
        className="flex w-full items-start gap-2 rounded-xl bg-ink-300/20 px-4 py-3 text-left text-sm text-ink-700"
      >
        <Hourglass className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
        {t.expired}
      </p>
    );
  }

  return (
    <section
      aria-labelledby={titleId}
      className="w-full overflow-hidden rounded-[1.75rem] border border-brand-100 bg-white text-left shadow-xl shadow-brand-900/5"
    >
      <div className="px-5 pt-5 sm:px-6 sm:pt-6">
        <h3 id={titleId} className="flex items-center gap-2 font-bold text-ink-900">
          <ScanLine className="size-5 text-brand-600" aria-hidden="true" />
          {t.title}
        </h3>
        <p className="mt-1 text-sm text-ink-500">{t.apps}</p>
        <p className="mt-1 text-sm text-ink-700">{interpolate(t.merchant, { name: qris.merchantName })}</p>
      </div>
      <div className="grid gap-6 p-5 pt-4 sm:p-6 sm:pt-5 md:grid-cols-[minmax(0,17rem)_minmax(0,1fr)] md:grid-rows-[auto_1fr] md:items-start">
        <div className="rounded-2xl bg-brand-50 p-4 md:col-start-2 md:row-start-1">
          <p className="text-xs font-semibold tracking-wider text-ink-500 uppercase">{t.amountLabel}</p>
          <div className="mt-1 flex flex-wrap items-center gap-3">
            <p className="text-3xl font-extrabold tracking-tight text-ink-900 tabular-nums select-all">
              {formatIDR(order.total)}
            </p>
            <button
              type="button"
              onClick={copyAmount}
              className="inline-flex h-11 items-center gap-1.5 rounded-xl border border-brand-200 bg-white px-3 text-xs font-semibold text-ink-900 transition-colors hover:border-brand-400 active:scale-[0.97]"
            >
              {copied ? (
                <Check className="size-3.5 text-brand-700" aria-hidden="true" />
              ) : (
                <Copy className="size-3.5" aria-hidden="true" />
              )}
              {copied ? t.amountCopied : t.copyAmount}
            </button>
          </div>
          <p className="mt-2 text-sm text-ink-700">{interpolate(t.exactNote, { code: formatIDR(order.uniqueCode) })}</p>
        </div>

        {/* Phone: amount first, then the QR. Desktop: QR on the left, amount + steps on the right. */}
        <div className="grid justify-items-center gap-3 md:col-start-1 md:row-span-2 md:row-start-1">
          <div className="w-full max-w-[17rem] overflow-hidden rounded-2xl border border-brand-100 bg-white">
            <Image
              src={qris.image}
              width={qris.width}
              height={qris.height}
              alt={interpolate(t.qrAlt, { name: qris.merchantName })}
              // Exact pixels: re-compressing a QR code can make it harder to scan.
              unoptimized
              className="h-auto w-full"
              priority
            />
          </div>
          <a
            href={qris.image}
            download={`qris-${order.id}.${qris.image.split(".").pop() ?? "jpg"}`}
            className="inline-flex h-11 w-full max-w-[17rem] items-center justify-center gap-2 rounded-2xl border border-brand-200 bg-white text-sm font-semibold text-ink-900 transition-colors hover:border-blush-300 active:scale-[0.97]"
          >
            <Download className="size-4 text-brand-600" aria-hidden="true" />
            {t.saveQr}
          </a>
          <p className="max-w-[17rem] text-center text-xs text-ink-500">{t.phoneHint}</p>
        </div>

        <div className="grid gap-5 md:col-start-2 md:row-start-2">
          <div
            className={cn(
              "flex flex-wrap items-center justify-between gap-2 rounded-2xl border px-4 py-3",
              timeUp ? "border-blush-200 bg-blush-50" : "border-brand-100",
            )}
          >
            <span className="flex items-center gap-2 text-sm text-ink-700">
              <Clock className={cn("size-4", timeUp ? "text-blush-500" : "text-brand-600")} aria-hidden="true" />
              {interpolate(t.payBefore, { time: timeFormat.format(expiresAt) })}
            </span>
            <span className="text-sm text-ink-500">
              <span className="sr-only">{t.timeLeft}: </span>
              <span
                className={cn("font-mono text-lg font-bold tabular-nums", timeUp ? "text-blush-700" : "text-ink-900")}
              >
                {formatCountdown(expiresAt - now)}
              </span>
            </span>
          </div>
          <AnimatePresence initial={false}>
            {timeUp ? (
              <m.p
                role="alert"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                className="-mt-2 overflow-hidden text-sm text-blush-900"
              >
                {interpolate(t.timeUp, { time: timeFormat.format(claimUntil) })}
              </m.p>
            ) : null}
          </AnimatePresence>

          <ol className="grid gap-2">
            {t.steps.map((step, index) => (
              <li key={step} className="flex items-center gap-2 text-sm text-ink-700">
                <span className="grid size-6 shrink-0 place-items-center rounded-lg bg-brand-100 text-xs font-bold text-brand-800">
                  {index + 1}
                </span>
                {step}
              </li>
            ))}
          </ol>

          <form onSubmit={claim} noValidate className="grid gap-3 border-t border-dashed border-brand-200 pt-5">
            <div>
              <p id={`${proofId}-label`} className="mb-1.5 block text-sm font-medium text-ink-700">
                {t.proofLabel}
              </p>
              {/* Our own button + file name, so the text follows the page language (the native
                  file input always speaks the browser's language). */}
              <div className="flex min-w-0 items-center gap-2">
                <input
                  key={proofKey}
                  id={proofId}
                  type="file"
                  accept={orderConfig.proofTypes.join(",")}
                  aria-labelledby={`${proofId}-label ${proofId}-button`}
                  aria-describedby={proofHintId}
                  aria-invalid={error === "badProof"}
                  onChange={(event) => pickProof(event.target.files?.[0] ?? null)}
                  className="peer sr-only"
                />
                <label
                  id={`${proofId}-button`}
                  htmlFor={proofId}
                  className="inline-flex h-11 shrink-0 cursor-pointer items-center gap-2 rounded-xl bg-brand-100 px-4 text-sm font-semibold text-brand-800 transition-colors peer-focus-visible:ring-2 peer-focus-visible:ring-brand-400 peer-focus-visible:ring-offset-2 hover:bg-brand-200 active:scale-[0.97]"
                >
                  <ImageUp className="size-4" aria-hidden="true" />
                  {t.proofChoose}
                </label>
                {proof ? (
                  <>
                    <span className="min-w-0 truncate text-sm text-ink-700">{proof.name}</span>
                    <button
                      type="button"
                      onClick={() => {
                        setProof(null);
                        setProofKey((key) => key + 1);
                      }}
                      aria-label={`${t.removeProof}: ${proof.name}`}
                      className="grid size-11 shrink-0 place-items-center rounded-xl text-ink-500 transition-colors hover:bg-brand-50 hover:text-ink-900"
                    >
                      <X className="size-4" aria-hidden="true" />
                    </button>
                  </>
                ) : null}
              </div>
              <p id={proofHintId} className="mt-1.5 text-xs text-ink-500">
                {t.proofHint}
              </p>
            </div>
            <SubmitError message={error ? t.errors[error] : null} />
            <Button type="submit" size="lg" className="w-full" disabled={sending}>
              {sending ? (
                <Loader2 className="size-4 animate-spin" aria-hidden="true" />
              ) : (
                <Check className="size-4" aria-hidden="true" />
              )}
              {sending ? t.claiming : t.claim}
            </Button>
          </form>
        </div>
      </div>
    </section>
  );
}
