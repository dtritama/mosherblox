import type { Metadata } from "next";
import { Suspense } from "react";

import { CheckOrder } from "@/components/orders/check-order";
import { Container } from "@/components/ui/container";
import { SectionHeading } from "@/components/ui/section-heading";
import { getI18n } from "@/i18n/get-dictionary";
import { localeAlternates } from "@/i18n/metadata";

export async function generateMetadata(): Promise<Metadata> {
  const { locale, dict } = await getI18n();
  return {
    title: dict.checkOrder.metaTitle,
    description: dict.checkOrder.metaDescription,
    alternates: localeAlternates(locale, "/check-order"),
  };
}

export default async function CheckOrderPage() {
  const { dict } = await getI18n();
  const t = dict.checkOrder;

  return (
    <div className="relative isolate overflow-hidden pt-24 pb-14 lg:pt-32 lg:pb-20">
      <div aria-hidden="true" className="absolute inset-x-0 top-0 -z-10 h-[38rem]">
        <div className="absolute inset-0 bg-grid mask-[radial-gradient(ellipse_at_top,black_30%,transparent_75%)]" />
        <div className="absolute -top-32 -right-24 size-[30rem] rounded-full bg-brand-200/40 blur-3xl dark:bg-brand-200/70 dark:opacity-30" />
        <div className="absolute top-10 -left-40 size-[24rem] rounded-full bg-blush-100/40 blur-3xl dark:bg-blush-100/70 dark:opacity-30" />
      </div>

      <Container className="grid items-start gap-10 lg:grid-cols-[1fr_1.15fr] lg:gap-14">
        <SectionHeading
          as="h1"
          eyebrow={t.eyebrow}
          title={
            <>
              {t.titleStart} <span className="text-highlight">{t.titleHighlight}</span>
            </>
          }
          description={t.description}
          className="lg:sticky lg:top-32"
        />
        {/* useSearchParams (?id= prefill) needs a Suspense boundary for static rendering. */}
        <Suspense fallback={<div className="h-80 animate-pulse rounded-[2rem] bg-brand-50" />}>
          <CheckOrder />
        </Suspense>
      </Container>
    </div>
  );
}
