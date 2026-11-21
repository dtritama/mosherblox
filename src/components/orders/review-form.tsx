"use client";

import { Check, Loader2, Star } from "lucide-react";
import { useId, useState, type FormEvent } from "react";

import { SubmitError } from "@/components/checkout/submit-error";
import { Button } from "@/components/ui/button";
import { interpolate } from "@/i18n/format";
import { useI18n } from "@/i18n/i18n-provider";
import { cn } from "@/lib/utils";
import { submitReviewAction, type SubmitReviewResult } from "@/server/review-actions";

const MAX = 500;

/** Check Order, completed orders only: 1–5 stars + a short text. Shown publicly after admin approval. */
export function ReviewForm({
  orderId,
  whatsapp,
  alreadyReviewed,
}: {
  orderId: string;
  whatsapp: string;
  alreadyReviewed: boolean;
}) {
  const { dict } = useI18n();
  const t = dict.reviews.form;
  const bodyId = useId();
  const [rating, setRating] = useState(0);
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const [done, setDone] = useState(alreadyReviewed);
  const [error, setError] = useState<Extract<SubmitReviewResult, { ok: false }>["error"] | null>(null);

  if (done) {
    return (
      <p
        role="status"
        className="flex items-center gap-2 rounded-2xl bg-brand-50 px-4 py-3 text-sm font-medium text-brand-900"
      >
        <Check className="size-4 shrink-0 text-brand-600" aria-hidden="true" />
        {alreadyReviewed ? t.already : t.thanks}
      </p>
    );
  }

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    if (rating < 1 || body.trim().length < 3) {
      setError("invalid");
      return;
    }
    setSending(true);
    try {
      const result = await submitReviewAction({ orderId, whatsapp, rating, body });
      if (result.ok) setDone(true);
      else setError(result.error);
    } catch {
      setError("unavailable");
    } finally {
      setSending(false);
    }
  };

  return (
    <form onSubmit={submit} noValidate className="rounded-[1.75rem] border border-brand-100 bg-white p-5 sm:p-6">
      <h3 className="font-bold text-ink-900">{t.title}</h3>
      <p className="mt-1 text-sm text-ink-500">{t.description}</p>

      <fieldset className="mt-4">
        <legend className="mb-1.5 text-sm font-medium text-ink-700">{t.rating}</legend>
        <div className="flex gap-1">
          {[1, 2, 3, 4, 5].map((value) => (
            <label
              key={value}
              className="cursor-pointer rounded-xl p-1.5 has-focus-visible:ring-2 has-focus-visible:ring-brand-400"
            >
              <input
                type="radio"
                name="rating"
                value={value}
                checked={rating === value}
                onChange={() => setRating(value)}
                aria-label={interpolate(t.star, { count: value })}
                className="sr-only"
              />
              <Star
                className={cn(
                  "size-8 transition-[color,fill,transform] duration-150 hover:scale-110",
                  value <= rating ? "fill-amber-400 text-amber-400" : "text-ink-300",
                )}
                aria-hidden="true"
              />
            </label>
          ))}
        </div>
      </fieldset>

      <label htmlFor={bodyId} className="mt-4 mb-1.5 block text-sm font-medium text-ink-700">
        {t.body}
      </label>
      <textarea
        id={bodyId}
        rows={3}
        maxLength={MAX}
        value={body}
        onChange={(event) => setBody(event.target.value)}
        placeholder={t.placeholder}
        className="w-full rounded-xl border-2 border-brand-100 bg-white px-4 py-3 text-sm text-ink-900 outline-none placeholder:text-ink-300 hover:border-brand-300 focus:border-brand-500"
      />
      <p className="mt-1 text-right text-xs text-ink-500 tabular-nums">
        {interpolate(t.counter, { count: body.length, max: MAX })}
      </p>

      <SubmitError message={error ? t.errors[error] : null} className="mt-2" />
      <Button type="submit" className="mt-3 w-full sm:w-auto" disabled={sending}>
        {sending ? (
          <Loader2 className="size-4 animate-spin" aria-hidden="true" />
        ) : (
          <Star className="size-4" aria-hidden="true" />
        )}
        {sending ? t.sending : t.submit}
      </Button>
    </form>
  );
}
