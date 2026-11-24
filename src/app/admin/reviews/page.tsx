import { Star } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";

import { adminCopy } from "@/app/admin/copy";
import { AdminShell } from "@/components/admin/admin-shell";
import { ReviewModeration } from "@/components/admin/review-moderation";
import { formatAdminDate } from "@/components/admin/status-badge";
import { interpolate } from "@/i18n/format";
import { cn } from "@/lib/utils";
import { requireAdmin } from "@/server/auth/admin";
import { listReviewsForAdmin, type ReviewStatus } from "@/server/reviews";

export const metadata: Metadata = { title: adminCopy.reviews.title };

const t = adminCopy.reviews;
const TABS: ReviewStatus[] = ["pending", "approved", "rejected"];

export default function AdminReviewsPage({ searchParams }: PageProps<"/admin/reviews">) {
  return (
    <Suspense fallback={<div className="mx-auto h-96 max-w-6xl animate-pulse px-4 py-24" aria-busy="true" />}>
      <Reviews searchParams={searchParams} />
    </Suspense>
  );
}

async function Reviews({ searchParams }: { searchParams: PageProps<"/admin/reviews">["searchParams"] }) {
  const admin = await requireAdmin();
  const params = await searchParams;
  const raw = Array.isArray(params.status) ? params.status[0] : params.status;
  const status: ReviewStatus = TABS.includes(raw as ReviewStatus) ? (raw as ReviewStatus) : "pending";
  const { items, counts } = await listReviewsForAdmin(status);

  return (
    <AdminShell admin={admin} current="reviews">
      <h1 className="text-2xl font-bold text-ink-900">{t.title}</h1>
      <p className="mt-1 max-w-2xl text-sm text-ink-500">{t.description}</p>

      <nav aria-label="Filter ulasan" className="mt-6 flex flex-wrap gap-2">
        {TABS.map((tab) => (
          <Link
            key={tab}
            href={tab === "pending" ? "/admin/reviews" : `/admin/reviews?status=${tab}`}
            aria-current={tab === status ? "page" : undefined}
            className={cn(
              "inline-flex h-11 items-center gap-2 rounded-xl border px-3.5 text-sm font-semibold",
              tab === status
                ? "border-ink-900 bg-ink-900 text-white"
                : "border-brand-100 bg-white text-ink-700 hover:border-brand-300",
            )}
          >
            {t.tabs[tab]}
            <span
              className={cn(
                "rounded-full px-1.5 py-px text-xs tabular-nums",
                tab === status
                  ? "bg-white/15"
                  : tab === "pending" && counts.pending > 0
                    ? "bg-blush-500 text-snow dark:bg-blush-400 dark:text-coal"
                    : "bg-brand-50 text-ink-500",
              )}
            >
              {counts[tab]}
            </span>
          </Link>
        ))}
      </nav>

      {items.length === 0 ? (
        <p className="mt-4 rounded-[1.75rem] border border-dashed border-brand-200 bg-white px-6 py-12 text-center text-sm text-ink-500">
          {status === "pending" ? t.emptyPending : t.empty}
        </p>
      ) : (
        <ul className="mt-4 grid gap-3 md:grid-cols-2">
          {items.map((review) => (
            <li key={review.id} className="flex flex-col gap-3 rounded-[1.75rem] border border-brand-100 bg-white p-5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span role="img" aria-label={interpolate(t.stars, { count: review.rating })} className="flex gap-0.5">
                  {[1, 2, 3, 4, 5].map((value) => (
                    <Star
                      key={value}
                      className={cn(
                        "size-4",
                        value <= review.rating ? "fill-amber-400 text-amber-400" : "text-ink-300",
                      )}
                      aria-hidden="true"
                    />
                  ))}
                </span>
                <span className="text-xs text-ink-500">{formatAdminDate(review.createdAt)}</span>
              </div>
              <p className="text-sm leading-relaxed whitespace-pre-line text-ink-900">{review.body}</p>
              <p className="text-xs text-ink-500">
                {review.account} · {review.item} · {t.order}{" "}
                <Link
                  href={`/admin/orders/${review.orderId}`}
                  className="font-mono font-semibold text-ink-900 underline decoration-brand-300 underline-offset-2"
                >
                  {review.orderId}
                </Link>
                {review.moderatedBy ? ` · ${interpolate(t.by, { name: review.moderatedBy })}` : null}
              </p>
              <ReviewModeration reviewId={review.id} status={review.status} />
            </li>
          ))}
        </ul>
      )}
    </AdminShell>
  );
}
