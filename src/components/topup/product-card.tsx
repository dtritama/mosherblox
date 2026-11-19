"use client";

import { m } from "motion/react";
import { ArrowUpRight } from "lucide-react";
import { memo } from "react";

import { useStoreSettings } from "@/components/providers/settings-provider";
import { ProductArt } from "@/components/ui/product-art";
import { useTilt } from "@/hooks/use-tilt";
import { getStartingPrice } from "@/lib/catalog";
import { formatIDR, interpolate } from "@/i18n/format";
import { useI18n } from "@/i18n/i18n-provider";
import { cn } from "@/lib/utils";
import type { Product } from "@/types";

const tagStyles: Record<NonNullable<Product["tag"]>, string> = {
  Hot: "bg-blush-500 text-white",
  New: "bg-white text-brand-700",
  Promo: "bg-blush-200 text-blush-900",
  "Best value": "bg-brand-400 text-ink-900",
};

export const ProductCard = memo(function ProductCard({
  product,
  onSelect,
}: {
  product: Product;
  onSelect: (slug: string) => void;
}) {
  const { locale, dict } = useI18n();
  const tilt = useTilt(8);
  const from = formatIDR(getStartingPrice(product));
  const isSoldOut = useStoreSettings().soldOut.products.includes(product.slug);

  return (
    <m.button
      type="button"
      onClick={() => onSelect(product.slug)}
      style={tilt.style}
      onPointerMove={tilt.onPointerMove}
      onPointerLeave={tilt.onPointerLeave}
      whileTap={{ scale: 0.97 }}
      aria-label={`${product.name}, ${isSoldOut ? dict.common.soldOut : `${dict.common.from} ${from}`}`}
      className="group relative flex w-full flex-col overflow-hidden rounded-3xl border border-brand-100 bg-white text-left shadow-sm transition-[box-shadow,border-color] duration-300 will-change-transform hover:border-brand-200 hover:shadow-2xl hover:shadow-brand-300/30"
    >
      <ProductArt
        icon={product.icon}
        accent={product.accent}
        className={cn("grid aspect-[16/10] w-full place-items-center lg:aspect-[2/1]", isSoldOut && "grayscale")}
        iconClassName="relative size-12 text-white drop-shadow-md transition-transform duration-500 group-hover:scale-110 group-hover:-rotate-6 sm:size-14"
      />
      {/* Shine sweep on hover */}
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-y-0 -left-full w-1/2 -skew-x-12 bg-linear-to-r from-transparent via-white/40 to-transparent transition-[left] duration-700 group-hover:left-[150%]"
      />
      {isSoldOut ? (
        <span className="absolute top-3 left-3 rounded-full bg-ink-900 px-2.5 py-1 text-[11px] font-bold text-white shadow-sm">
          {dict.common.soldOut}
        </span>
      ) : product.tag ? (
        <span
          className={cn(
            "absolute top-3 left-3 rounded-full px-2.5 py-1 text-[11px] font-bold shadow-sm",
            tagStyles[product.tag],
          )}
        >
          {dict.shop.tags[product.tag]}
        </span>
      ) : null}
      <span className="absolute top-3 right-3 grid size-8 translate-y-1 place-items-center rounded-full bg-white/90 text-ink-900 opacity-0 transition-[opacity,transform] duration-300 group-hover:translate-y-0 group-hover:opacity-100">
        <ArrowUpRight className="size-4" aria-hidden="true" />
      </span>

      <span className="flex flex-1 flex-col p-4">
        <span className="truncate font-bold text-ink-900">{product.name}</span>
        <span className="truncate text-xs text-ink-500">{product.subtitle[locale]}</span>
        <span className="mt-3 flex h-5 flex-wrap gap-1 overflow-hidden">
          {product.options.slice(0, 2).map((option) => (
            <span
              key={option.id}
              className="rounded-md bg-brand-50 px-1.5 py-0.5 text-[11px] font-medium text-brand-800"
            >
              {option.label[locale]}
            </span>
          ))}
          {product.options.length > 2 ? (
            <span className="rounded-md bg-brand-50 px-1.5 py-0.5 text-[11px] font-medium text-ink-500">
              {interpolate(dict.shop.more, { count: product.options.length - 2 })}
            </span>
          ) : null}
        </span>
        <span className="mt-auto pt-3 text-xs text-ink-500">
          {dict.common.from} <span className="text-sm font-bold text-brand-700">{from}</span>
        </span>
      </span>
    </m.button>
  );
});
