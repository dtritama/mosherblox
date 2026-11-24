"use client";

import { Check, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useActionState, useEffect, useId, useState } from "react";

import { adminCopy } from "@/app/admin/copy";
import { SubmitError } from "@/components/checkout/submit-error";
import { Button } from "@/components/ui/button";
import { formatIDR, interpolate } from "@/i18n/format";
import { ORDER_TRANSITIONS } from "@/lib/orders/status";
import type { OrderStatus } from "@/lib/orders/types";
import { cn } from "@/lib/utils";
import { setOrderStatusAction, type StatusState } from "@/server/admin/actions";

const t = adminCopy.actions;

/**
 * Choose the next status (only moves the status machine allows), confirm, add a note, save.
 * "Paid" needs an explicit tick that the exact amount is in the bank history; "failed" needs a note.
 */
export function StatusActions({ orderId, status, total }: { orderId: string; status: OrderStatus; total: number }) {
  const router = useRouter();
  const [state, formAction, pending] = useActionState<StatusState, FormData>(setOrderStatusAction, {});
  const options = ORDER_TRANSITIONS[status].filter((to) => to !== "expired");
  const [to, setTo] = useState<OrderStatus | "">(options[0] ?? "");
  const [confirmed, setConfirmed] = useState(false);
  const noteId = useId();
  const confirmId = useId();
  const totalText = formatIDR(total);

  // Saved, or someone else changed the order meanwhile: reload the server data.
  useEffect(() => {
    if (state.ok || state.error === "notAllowed") router.refresh();
  }, [state, router]);

  if (options.length === 0) {
    return <p className="text-sm text-ink-500">{t.final}</p>;
  }

  const needsConfirm = to === "paid";
  return (
    <form action={formAction} className="grid gap-4">
      <input type="hidden" name="orderId" value={orderId} />
      <input type="hidden" name="from" value={status} />
      <fieldset>
        <legend className="mb-2 text-sm font-medium text-ink-700">{t.choose}</legend>
        <div className="grid gap-2">
          {options.map((option) => (
            <label
              key={option}
              className={cn(
                "flex min-h-11 cursor-pointer items-center gap-3 rounded-xl border-2 px-3 py-2.5 text-sm transition-colors has-focus-visible:ring-2 has-focus-visible:ring-brand-400",
                to === option
                  ? option === "failed"
                    ? "border-blush-400 bg-blush-50"
                    : "border-brand-500 bg-brand-50"
                  : "border-brand-100 bg-white hover:border-brand-300",
              )}
            >
              <input
                type="radio"
                name="to"
                value={option}
                checked={to === option}
                onChange={() => {
                  setTo(option);
                  setConfirmed(false);
                }}
                className="size-4 accent-ink-900"
              />
              <span className="font-semibold text-ink-900">{t.to[option]}</span>
            </label>
          ))}
        </div>
      </fieldset>

      {to && t.hint[to] ? (
        <p className="rounded-xl bg-brand-50 px-3 py-2.5 text-sm text-ink-700">
          {interpolate(t.hint[to], { total: totalText })}
        </p>
      ) : null}

      {needsConfirm ? (
        <label htmlFor={confirmId} className="flex cursor-pointer items-start gap-3 text-sm text-ink-900">
          <input
            id={confirmId}
            type="checkbox"
            required
            checked={confirmed}
            onChange={(event) => setConfirmed(event.target.checked)}
            className="mt-0.5 size-5 shrink-0 accent-ink-900"
          />
          {interpolate(t.confirmPaid, { total: totalText })}
        </label>
      ) : null}

      <div>
        <label htmlFor={noteId} className="mb-1.5 block text-sm font-medium text-ink-700">
          {t.note}
        </label>
        <textarea
          id={noteId}
          name="note"
          rows={2}
          maxLength={500}
          required={to === "failed"}
          aria-invalid={state.error === "noteRequired"}
          className={cn(
            "w-full rounded-xl border-2 bg-white px-4 py-3 text-sm text-ink-900 outline-none placeholder:text-ink-300 focus:border-brand-500",
            state.error === "noteRequired" ? "border-blush-500" : "border-brand-100 hover:border-brand-300",
          )}
        />
        <p className="mt-1.5 text-xs text-ink-500">{to === "failed" ? t.noteHintFailed : t.noteHint}</p>
      </div>

      <SubmitError message={state.error ? t.errors[state.error] : null} />
      {state.ok && !pending ? (
        <p role="status" className="flex items-center gap-1.5 text-sm font-medium text-brand-800">
          <Check className="size-4" aria-hidden="true" />
          {t.saved}
        </p>
      ) : null}

      <Button
        type="submit"
        size="lg"
        variant={to === "failed" ? "pink" : "primary"}
        className="w-full"
        disabled={pending || !to || (needsConfirm && !confirmed)}
      >
        {pending ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : null}
        {pending ? t.submitting : to ? t.to[to] : t.submit}
      </Button>
    </form>
  );
}
