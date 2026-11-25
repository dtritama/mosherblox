import { Star } from "lucide-react";

import { ReviewPages } from "@/components/sections/review-pages";
import { Container } from "@/components/ui/container";
import { Reveal } from "@/components/ui/reveal";
import { SectionHeading } from "@/components/ui/section-heading";
import { intlLocales } from "@/i18n/config";
import { interpolate } from "@/i18n/format";
import { getI18n } from "@/i18n/get-dictionary";
import { getPublicReviews } from "@/server/reviews";

/**
 * Approved buyer reviews (each tied to a completed order). Hidden until there is at least one:
 * no placeholder or invented reviews, ever.
 */
export async function ReviewsSection() {
  const { locale, dict } = await getI18n();
  const t = dict.reviews;
  const { items, total, pages, average } = await getPublicReviews();
  if (items.length === 0) return null;

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

        <Reveal>
          {/* key: after a moderation the section starts again with the new first page. */}
          <ReviewPages key={`${items[0].id}-${total}`} first={items} pages={pages} />
        </Reveal>
      </Container>
    </section>
  );
}
