"use client";

import { Check, Loader2, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useActionState, useEffect } from "react";

import { adminCopy } from "@/app/admin/copy";
import { moderateReviewAction, type ReviewModerationState } from "@/server/admin/actions";

const t = adminCopy.reviews;

/** Show / reject buttons for one review; reloads the list after a decision. */
export function ReviewModeration({
  reviewId,
  status,
}: {
  reviewId: string;
  status: "pending" | "approved" | "rejected";
}) {
  const router = useRouter();
  const [state, action, pending] = useActionState<ReviewModerationState, FormData>(moderateReviewAction, {});
  useEffect(() => {
    if (state.ok) router.refresh();
  }, [state, router]);

  return (
    <form action={action} className="flex flex-wrap items-center gap-2">
      <input type="hidden" name="reviewId" value={reviewId} />
      {status !== "approved" ? (
        <button
          type="submit"
          name="decision"
          value="approved"
          disabled={pending}
          className="inline-flex h-11 items-center gap-1.5 rounded-xl bg-brand-400 px-4 text-sm font-semibold text-coal transition-colors hover:bg-brand-300 active:scale-[0.97] disabled:opacity-50"
        >
          {pending ? (
            <Loader2 className="size-4 animate-spin" aria-hidden="true" />
          ) : (
            <Check className="size-4" aria-hidden="true" />
          )}
          {t.approve}
        </button>
      ) : null}
      {status !== "rejected" ? (
        <button
          type="submit"
          name="decision"
          value="rejected"
          disabled={pending}
          className="inline-flex h-11 items-center gap-1.5 rounded-xl border border-brand-200 bg-white px-4 text-sm font-semibold text-ink-700 transition-colors hover:border-blush-300 hover:text-blush-800 active:scale-[0.97] disabled:opacity-50"
        >
          <X className="size-4" aria-hidden="true" />
          {t.reject}
        </button>
      ) : null}
      {state.error ? (
        <p role="alert" className="text-sm text-blush-800">
          {t.errors[state.error]}
        </p>
      ) : null}
    </form>
  );
}
