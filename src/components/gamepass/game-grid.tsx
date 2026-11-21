"use client";

import { m } from "motion/react";
import { Check, Search, X } from "lucide-react";
import Link from "next/link";
import { useSelectedLayoutSegment } from "next/navigation";
import { useDeferredValue, useMemo, useState } from "react";

import { passesSectionId } from "@/components/gamepass/gamepass-list";
import { useStoreSettings } from "@/components/providers/settings-provider";
import { ProductArt } from "@/components/ui/product-art";
import { Reveal } from "@/components/ui/reveal";
import { localeHref } from "@/i18n/config";
import { formatIDR, interpolate } from "@/i18n/format";
import { useI18n } from "@/i18n/i18n-provider";
import { filterGamepassGames, gamepassProductSlug, getGamepassStartingPrice } from "@/lib/catalog";
import { cn } from "@/lib/utils";

/**
 * Game picker. Each card links to /[lang]/gamepass/[game] (a static page), so the selection
 * lives in the URL: shareable, works with back/forward, and the grid (in the layout) never re-mounts.
 */
export function GameGrid() {
  const { locale, dict } = useI18n();
  const t = dict.gamepass;
  const selected = useSelectedLayoutSegment();
  const { soldOut } = useStoreSettings();
  const [query, setQuery] = useState("");
  const deferredQuery = useDeferredValue(query);
  const games = useMemo(() => filterGamepassGames(deferredQuery), [deferredQuery]);

  return (
    <div className="mt-8">
      <Reveal delay={0.1} className="flex justify-end">
        <label className="relative flex w-full items-center sm:w-72">
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

      {games.length > 0 ? (
        <ul aria-label={t.gamesLabel} className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-6">
          {games.map((game, index) => {
            const active = game.slug === selected;
            const isSoldOut = soldOut.products.includes(gamepassProductSlug(game.slug));
            return (
              <m.li
                key={game.slug}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.45, delay: Math.min(index, 8) * 0.05 }}
              >
                <Link
                  href={localeHref(locale, `/gamepass/${game.slug}#${passesSectionId(game.slug)}`)}
                  // Per-link prefetch: also resolves this game's URL params ahead of the click → instant switch.
                  prefetch
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "group relative flex h-full flex-col overflow-hidden rounded-3xl border-2 bg-white transition-[border-color,box-shadow,transform] duration-300 hover:-translate-y-1",
                    active
                      ? "border-brand-500 shadow-xl shadow-brand-500/25"
                      : "border-brand-100 shadow-sm hover:border-brand-300 hover:shadow-lg hover:shadow-brand-300/25",
                  )}
                >
                  <ProductArt
                    icon={game.icon}
                    accent={game.accent}
                    className={cn("grid aspect-[4/3] w-full place-items-center", isSoldOut && "grayscale dark:brightness-50")}
                    iconClassName="relative size-10 text-snow drop-shadow-md transition-transform duration-500 group-hover:scale-110 group-hover:-rotate-6 sm:size-12"
                  />
                  {active ? (
                    <span className="absolute top-2.5 right-2.5 inline-flex items-center gap-1 rounded-full bg-brand-400 px-2 py-1 text-[11px] font-bold text-coal shadow">
                      <Check className="size-3.5" aria-hidden="true" />
                      {t.selected}
                    </span>
                  ) : null}
                  {isSoldOut ? (
                    <span className="absolute top-2.5 left-2.5 rounded-full bg-coal px-2 py-0.5 text-[11px] font-bold text-snow shadow-sm">
                      {dict.common.soldOut}
                    </span>
                  ) : game.tag && !active ? (
                    <span className="absolute top-2.5 left-2.5 rounded-full bg-white/90 px-2 py-0.5 text-[11px] font-bold text-ink-900 shadow-sm">
                      {dict.shop.tags[game.tag]}
                    </span>
                  ) : null}
                  <span className="flex flex-1 flex-col p-3 sm:p-4">
                    <span className="truncate text-sm font-bold text-ink-900 sm:text-base">{game.name}</span>
                    <span className="text-xs text-ink-500">
                      {interpolate(t.passCount, { count: game.passes.length })}
                    </span>
                    <span className="mt-2 text-xs text-ink-500">
                      {dict.common.from}{" "}
                      <span className="font-bold text-brand-700">{formatIDR(getGamepassStartingPrice(game))}</span>
                    </span>
                  </span>
                </Link>
              </m.li>
            );
          })}
        </ul>
      ) : (
        <div className="mt-5 rounded-3xl border border-dashed border-brand-200 bg-brand-50/60 p-10 text-center">
          <p className="font-semibold text-ink-900">{interpolate(t.emptyTitle, { query: deferredQuery })}</p>
          <p className="mt-1 text-sm text-ink-500">{t.emptyHint}</p>
        </div>
      )}
    </div>
  );
}
