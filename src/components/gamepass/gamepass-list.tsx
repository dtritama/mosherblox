"use client";

import { ArrowUp, Flame, ShieldCheck, Sparkles, Zap } from "lucide-react";

import { useStoreSettings } from "@/components/providers/settings-provider";
import { useTopUp } from "@/components/topup/topup-provider";
import { Button } from "@/components/ui/button";
import { ProductArt } from "@/components/ui/product-art";
import { Stagger, StaggerItem } from "@/components/ui/reveal";
import { formatIDR, formatNumber, interpolate } from "@/i18n/format";
import { useI18n } from "@/i18n/i18n-provider";
import { GAMEPASS_SLUG_PREFIX, getGamepassGame } from "@/lib/catalog";
import { discountPercent } from "@/lib/utils";
import { RobuxIcon } from "@/components/ui/robux-icon";

/** Anchor id of a game's gamepass list (the game grid links to it). */
export function passesSectionId(slug: string) {
  return `passes-${slug}`;
}

export function GamepassList({ slug }: { slug: string }) {
  const { locale, dict } = useI18n();
  const { openTopUp } = useTopUp();
  const t = dict.gamepass;
  const { soldOut } = useStoreSettings();
  const game = getGamepassGame(slug);
  if (!game) return null;
  const isSoldOut = soldOut.products.includes(`${GAMEPASS_SLUG_PREFIX}${game.slug}`);

  // Unique per game: with Cache Components, recently visited routes stay mounted (hidden),
  // so a shared id like "passes" would exist several times in the DOM.
  const sectionId = passesSectionId(game.slug);
  const titleId = `${sectionId}-title`;

  return (
    <section id={sectionId} aria-labelledby={titleId}>
      <div className="flex flex-col gap-4 rounded-[2rem] border border-brand-100 bg-linear-to-br from-brand-50 via-white to-white p-5 sm:flex-row sm:items-center sm:p-6">
        <ProductArt
          icon={game.icon}
          accent={game.accent}
          className="grid size-16 shrink-0 place-items-center rounded-2xl sm:size-20"
          iconClassName="relative size-8 text-snow drop-shadow-md sm:size-10"
        />
        <div className="min-w-0 flex-1">
          <h2 id={titleId} className="text-2xl font-bold tracking-tight text-ink-900 sm:text-3xl">
            {interpolate(t.passesTitle, { game: game.name })}
          </h2>
          <p className="mt-1 text-sm text-ink-500 sm:text-base">{game.description[locale]}</p>
          <p className="mt-2 flex items-center gap-1.5 text-xs font-medium text-brand-700">
            <ShieldCheck className="size-4" aria-hidden="true" />
            {t.passesDescription}
          </p>
        </div>
        <a
          href="#games"
          className="inline-flex shrink-0 items-center gap-1.5 self-start rounded-xl border border-brand-200 bg-white px-3 py-2 text-sm font-semibold text-ink-700 transition-colors hover:border-brand-400 hover:text-ink-900 sm:self-center"
        >
          <ArrowUp className="size-4" aria-hidden="true" />
          {t.changeGame}
        </a>
      </div>

      {/* key={slug}: re-run the entrance animation when switching games */}
      <Stagger key={slug} className="mt-5 grid gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3">
        {game.passes.map((pass) => (
          <StaggerItem key={pass.id}>
            <article className="group relative flex h-full flex-col rounded-3xl border border-brand-100 bg-white p-5 shadow-sm transition-[border-color,box-shadow,transform] duration-300 hover:-translate-y-1 hover:border-brand-300 hover:shadow-xl hover:shadow-brand-300/25">
              <div className="flex items-start justify-between gap-3">
                <h3 className="text-lg font-bold text-ink-900">{pass.name}</h3>
                <div className="flex shrink-0 gap-1.5">
                  {pass.originalPrice ? (
                    <span className="inline-flex items-center gap-0.5 rounded-full bg-blush-500 px-2 py-0.5 text-[11px] font-bold text-snow">
                      <Flame className="size-3" aria-hidden="true" />-{discountPercent(pass.price, pass.originalPrice)}%
                    </span>
                  ) : null}
                  {pass.popular ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-brand-100 px-2 py-0.5 text-[11px] font-bold text-brand-800">
                      <Sparkles className="size-3" aria-hidden="true" />
                      {t.popular}
                    </span>
                  ) : null}
                </div>
              </div>
              <p className="mt-1 flex items-center gap-1.5 text-xs text-ink-500">
                <RobuxIcon className="size-3.5 text-brand-600" aria-hidden="true" />
                {t.inGamePrice}: {formatNumber(pass.robux, locale)} Robux
              </p>

              <div className="mt-auto flex items-end justify-between gap-3 pt-5">
                <div>
                  <p className="text-xl font-extrabold text-ink-900">{formatIDR(pass.price)}</p>
                  {pass.originalPrice ? (
                    <p className="text-xs text-ink-300 line-through">{formatIDR(pass.originalPrice)}</p>
                  ) : null}
                </div>
                {isSoldOut ? (
                  <span className="inline-flex h-9 items-center rounded-2xl bg-coal px-4 text-sm font-semibold text-snow">
                    {dict.common.soldOut}
                  </span>
                ) : (
                  <Button size="sm" onClick={() => openTopUp(`${GAMEPASS_SLUG_PREFIX}${game.slug}`, pass.id)}>
                    <Zap className="size-4" aria-hidden="true" />
                    {t.buy}
                  </Button>
                )}
              </div>
            </article>
          </StaggerItem>
        ))}
      </Stagger>
    </section>
  );
}
