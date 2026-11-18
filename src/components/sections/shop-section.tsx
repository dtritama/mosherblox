"use client";

import { m } from "motion/react";
import { Search, X } from "lucide-react";
import { useDeferredValue, useMemo, useState } from "react";

import { ProductCard } from "@/components/topup/product-card";
import { useTopUp } from "@/components/topup/topup-provider";
import { Container } from "@/components/ui/container";
import { Reveal } from "@/components/ui/reveal";
import { SectionHeading } from "@/components/ui/section-heading";
import { shopCategories, type ShopCategory } from "@/data/products";
import { interpolate } from "@/i18n/format";
import { useI18n } from "@/i18n/i18n-provider";
import { filterProducts, getShopProducts } from "@/lib/catalog";
import { cn } from "@/lib/utils";

const shopProducts = getShopProducts();

export function ShopSection() {
  const { openTopUp } = useTopUp();
  const { locale, dict } = useI18n();
  const t = dict.shop;
  const [category, setCategory] = useState<ShopCategory>("all");
  const [query, setQuery] = useState("");
  const deferredQuery = useDeferredValue(query);

  const visible = useMemo(
    () => filterProducts(shopProducts, category, deferredQuery, locale),
    [category, deferredQuery, locale],
  );

  return (
    <section
      id="shop"
      aria-labelledby="shop-title"
      className="relative bg-linear-to-b from-white via-brand-50/60 to-white py-14 lg:py-20"
    >
      <Container>
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <SectionHeading
            id="shop-title"
            eyebrow={t.eyebrow}
            title={
              <>
                {t.titleStart} <span className="text-highlight">{t.titleHighlight}</span>
              </>
            }
            description={t.description}
          />

          <Reveal delay={0.1} className="flex w-full flex-col gap-3 sm:flex-row lg:w-auto">
            <div
              role="group"
              aria-label={t.filterLabel}
              className="no-scrollbar flex gap-1 overflow-x-auto rounded-2xl border border-brand-100 bg-white p-1"
            >
              {shopCategories.map((item) => {
                const active = item === category;
                return (
                  <button
                    key={item}
                    type="button"
                    aria-pressed={active}
                    onClick={() => setCategory(item)}
                    className={cn(
                      "rounded-xl px-4 py-2 text-sm font-semibold whitespace-nowrap transition-[background-color,color] duration-200",
                      active ? "bg-brand-100 text-brand-800" : "text-ink-500 hover:text-ink-900",
                    )}
                  >
                    {t.categories[item]}
                  </button>
                );
              })}
            </div>
            <label className="relative flex items-center sm:w-60">
              <span className="sr-only">{t.searchLabel}</span>
              <Search className="pointer-events-none absolute left-3.5 size-4 text-ink-300" aria-hidden="true" />
              <input
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value.slice(0, 50))}
                placeholder={t.searchPlaceholder}
                autoComplete="off"
                className="h-11 w-full rounded-2xl border border-brand-100 bg-white pr-9 pl-10 text-sm outline-none placeholder:text-ink-300 focus:border-brand-500 [&::-webkit-search-cancel-button]:hidden"
              />
              {query ? (
                <button
                  type="button"
                  onClick={() => setQuery("")}
                  aria-label={t.clearSearch}
                  className="absolute right-2 grid size-7 place-items-center rounded-lg text-ink-500 hover:bg-brand-50"
                >
                  <X className="size-4" />
                </button>
              ) : null}
            </label>
          </Reveal>
        </div>

        <p className="sr-only" aria-live="polite">
          {interpolate(t.results, { count: visible.length })}
        </p>

        {visible.length > 0 ? (
          <ul className="mt-8 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3">
            {visible.map((product, index) => (
              <m.li
                key={`${category}-${product.slug}`}
                initial={{ opacity: 0, y: 20, scale: 0.96 }}
                whileInView={{ opacity: 1, y: 0, scale: 1 }}
                viewport={{ once: true, margin: "0px 0px -40px 0px" }}
                transition={{ duration: 0.45, delay: Math.min(index, 8) * 0.05 }}
              >
                <ProductCard product={product} onSelect={openTopUp} />
              </m.li>
            ))}
          </ul>
        ) : (
          <div className="mt-8 rounded-3xl border border-dashed border-brand-200 bg-brand-50/60 p-10 text-center">
            <p className="font-semibold text-ink-900">{interpolate(t.emptyTitle, { query: deferredQuery })}</p>
            <p className="mt-1 text-sm text-ink-500">{t.emptyHint}</p>
          </div>
        )}
      </Container>
    </section>
  );
}
