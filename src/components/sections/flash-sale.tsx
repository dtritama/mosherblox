"use client";

import { Flame, Zap } from "lucide-react";

import { Countdown } from "@/components/sections/countdown";
import { useStoreSettings } from "@/components/providers/settings-provider";
import { useTopUp } from "@/components/topup/topup-provider";
import { Container } from "@/components/ui/container";
import { ProductArt } from "@/components/ui/product-art";
import { Reveal, Stagger, StaggerItem } from "@/components/ui/reveal";
import { SectionHeading } from "@/components/ui/section-heading";
import { getFlashDeals } from "@/lib/catalog";
import { formatIDR } from "@/i18n/format";
import { useI18n } from "@/i18n/i18n-provider";
import { discountPercent } from "@/lib/utils";

const deals = getFlashDeals();

export function FlashSale() {
  const { openTopUp } = useTopUp();
  const { locale, dict } = useI18n();
  const t = dict.deals;
  // Sold-out products (admin settings) are left out of the deals.
  const { soldOut } = useStoreSettings();
  const available = deals.filter(({ product }) => !soldOut.products.includes(product.slug));
  if (available.length === 0) return null;

  return (
    <section
      id="deals"
      aria-labelledby="deals-title"
      className="relative isolate overflow-hidden bg-brand-50/70 py-14 lg:py-20"
    >
      <div aria-hidden="true" className="absolute inset-0 -z-10 bg-grid opacity-60" />
      <div
        aria-hidden="true"
        className="absolute -top-40 -left-20 -z-10 size-[30rem] rounded-full bg-blush-100/60 blur-3xl"
      />
      <div
        aria-hidden="true"
        className="absolute -right-20 -bottom-40 -z-10 size-[28rem] rounded-full bg-brand-200/60 blur-3xl"
      />

      <Container>
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <SectionHeading
            id="deals-title"
            eyebrow={t.eyebrow}
            title={
              <>
                {t.titleStart} <span className="text-highlight">{t.titleHighlight}</span>
              </>
            }
            description={t.description}
          />
          <Reveal delay={0.1}>
            <Countdown />
          </Reveal>
        </div>

        <Stagger className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {available.map(({ product, option }) => (
            <StaggerItem key={option.id}>
              <button
                type="button"
                onClick={() => openTopUp(product.slug, option.id)}
                className="group flex w-full items-center gap-4 rounded-3xl border border-white bg-white/80 p-4 text-left shadow-sm backdrop-blur transition-[box-shadow,transform] duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-brand-300/30"
              >
                <ProductArt
                  icon={product.icon}
                  accent={product.accent}
                  className="grid size-16 shrink-0 place-items-center rounded-2xl"
                  iconClassName="relative size-8 text-white transition-transform duration-300 group-hover:scale-110"
                />
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-2">
                    <span className="truncate text-sm font-medium text-ink-500">{product.name}</span>
                    <span className="inline-flex shrink-0 items-center gap-0.5 rounded-full bg-blush-500 px-2 py-0.5 text-[11px] font-bold text-white">
                      <Flame className="size-3" aria-hidden="true" />-
                      {discountPercent(option.price, option.originalPrice)}%
                    </span>
                  </span>
                  <span className="mt-0.5 block truncate font-bold text-ink-900">{option.label[locale]}</span>
                  <span className="mt-1 flex items-baseline gap-2">
                    <span className="text-lg font-extrabold text-brand-700">{formatIDR(option.price)}</span>
                    <span className="text-xs text-ink-300 line-through">{formatIDR(option.originalPrice)}</span>
                  </span>
                </span>
                <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-brand-400 text-ink-900 transition-transform duration-300 group-hover:rotate-12">
                  <Zap className="size-5" aria-hidden="true" />
                </span>
              </button>
            </StaggerItem>
          ))}
        </Stagger>
      </Container>
    </section>
  );
}
