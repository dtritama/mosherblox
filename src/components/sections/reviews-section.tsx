import { BadgeCheck, Star } from "lucide-react";

import { Container } from "@/components/ui/container";
import { Reveal } from "@/components/ui/reveal";
import { SectionHeading } from "@/components/ui/section-heading";
import { intlLocales } from "@/i18n/config";
import { interpolate } from "@/i18n/format";
import { getI18n } from "@/i18n/get-dictionary";
import { cn } from "@/lib/utils";
import { getPublicReviews } from "@/server/reviews";

function Stars({ rating, label }: { rating: number; label: string }) {
  return (
    <span role="img" aria-label={label} className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((value) => (
        <Star
          key={value}
          className={cn("size-4", value <= rating ? "fill-amber-400 text-amber-400" : "text-ink-300")}
          aria-hidden="true"
        />
      ))}
    </span>
  );
}

/**
 * Approved buyer reviews (each tied to a completed order). Hidden until there is at least one:
 * no placeholder or invented reviews, ever.
 */
export async function ReviewsSection() {
  const { locale, dict } = await getI18n();
  const t = dict.reviews;
  const { items, total, average } = await getPublicReviews();
  if (items.length === 0) return null;
  const date = new Intl.DateTimeFormat(intlLocales[locale], { dateStyle: "medium", timeZone: "Asia/Jakarta" });

  return (
    <section id="reviews" aria-labelledby="reviews-title" className="py-14 lg:py-20">
      <Container>
        <div className="flex flex-wrap items-end justify-between gap-4">
          <SectionHeading
            id="reviews-title"
            eyebrow={t.eyebrow}
            title={
              <>
                {t.titleStart} <span className="text-highlight">{t.titleHighlight}</span>
              </>
            }
            description={t.description}
          />
          {average !== null ? (
            <p className="flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-semibold text-ink-900 ring-1 ring-brand-100">
              <Star className="size-4 fill-amber-400 text-amber-400" aria-hidden="true" />
              {interpolate(t.average, {
                average: average.toLocaleString(intlLocales[locale], { minimumFractionDigits: 1 }),
                count: total,
              })}
            </p>
          ) : null}
        </div>

        <ul className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((review, index) => (
            <li key={review.id}>
              <Reveal
                delay={Math.min(index, 5) * 0.05}
                className="flex h-full flex-col rounded-[1.75rem] border border-brand-100 bg-white p-5 shadow-sm"
              >
                <div className="flex items-center gap-3">
                  {review.avatarUrl ? (
                    // Roblox CDN headshot (allowed in the CSP).
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={review.avatarUrl}
                      alt=""
                      width={44}
                      height={44}
                      loading="lazy"
                      className="size-11 shrink-0 rounded-xl bg-brand-100"
                    />
                  ) : (
                    <span
                      aria-hidden="true"
                      className="grid size-11 shrink-0 place-items-center rounded-xl bg-brand-100 font-bold text-brand-700"
                    >
                      {review.name.charAt(0).toUpperCase()}
                    </span>
                  )}
                  <div className="min-w-0">
                    <p className="truncate font-bold text-ink-900">{review.name}</p>
                    <p className="flex items-center gap-1 text-xs font-medium text-brand-700">
                      <BadgeCheck className="size-3.5" aria-hidden="true" />
                      {t.verified}
                    </p>
                  </div>
                </div>
                <div className="mt-3">
                  <Stars rating={review.rating} label={interpolate(t.stars, { count: review.rating })} />
                </div>
                <p className="mt-2 text-sm leading-relaxed whitespace-pre-line text-ink-700">{review.body}</p>
                <p className="mt-auto pt-4 text-xs text-ink-500">
                  {review.item[locale]} · {date.format(new Date(review.createdAt))}
                </p>
              </Reveal>
            </li>
          ))}
        </ul>
      </Container>
    </section>
  );
}
