"use client";

import { m } from "motion/react";
import { ArrowRight, BadgeCheck, Info, ShieldCheck, Zap } from "lucide-react";
import Link from "next/link";
import { useId, useState } from "react";

import { buttonVariants } from "@/components/ui/button";
import { Container } from "@/components/ui/container";
import { Reveal } from "@/components/ui/reveal";
import { RobuxIcon } from "@/components/ui/robux-icon";
import { StoreClosedNotice } from "@/components/ui/store-closed-notice";
import { SectionHeading } from "@/components/ui/section-heading";
import { useStoreSettings } from "@/components/providers/settings-provider";
import { robuxConfig } from "@/data/robux";
import { localeHref } from "@/i18n/config";
import { formatIDR, formatNumber, interpolate } from "@/i18n/format";
import { useI18n } from "@/i18n/i18n-provider";
import { calculateRobuxPrice, getRobuxMaxAmount, getRobuxMethod, getRobuxTier } from "@/lib/robux-pricing";
import { cn } from "@/lib/utils";

/** The home-page section promotes Robux via Send Username (USN); the full panel lives on /robux. */
const METHOD = "send-username";
const LIMITS = getRobuxMethod(METHOD).limits;
/** Only amounts one Send Username order can have (its daily limit). */
const presets = robuxConfig.presets.filter((amount) => amount <= getRobuxMaxAmount(METHOD));
const DEFAULT_INDEX = Math.max(0, presets.indexOf(robuxConfig.defaultAmount));
/** Largest single Send Username order (its daily limit). */
const MAX_AMOUNT = getRobuxMaxAmount(METHOD);

/** Link into the Robux page with the amount (and method) already picked. */
function robuxPageHref(locale: Parameters<typeof localeHref>[0], amount?: number, soldOut = false) {
  // Sold out: open the Robux page without a method, so it starts on one that is available.
  const query = amount ? (soldOut ? `?amount=${amount}` : `?method=${METHOD}&amount=${amount}`) : "";
  return `${localeHref(locale, "/robux")}${query}`;
}

export function RobuxSection() {
  const { locale, dict } = useI18n();
  const t = dict.robuxTeaser;
  const amountId = useId();
  const hintId = useId();
  // The amount can be typed freely; the slider and quick buttons set it to a preset.
  const [amount, setAmount] = useState<number | null>(presets[DEFAULT_INDEX]);
  const { robuxRates: rates, soldOut, robuxStock, storeOpen, stats } = useStoreSettings();
  const methodSoldOut = robuxStock === 0 || soldOut.robuxMethods.includes(METHOD);

  const valid = amount !== null && amount >= robuxConfig.minAmount && amount <= MAX_AMOUNT;
  const amountValue = amount ?? 0;
  const price = valid ? calculateRobuxPrice(METHOD, amountValue, rates) : null;
  const { rate } = getRobuxTier(METHOD, amountValue, rates);
  /** Slider position: the largest preset not above the typed amount. */
  const index = Math.max(
    0,
    presets.findLastIndex((preset) => preset <= amountValue),
  );

  const setFromInput = (raw: string) => {
    const digits = raw.replace(/\D/g, "").replace(/^0+/, "").slice(0, 6);
    setAmount(digits ? Number(digits) : null);
  };

  return (
    <section id="robux" aria-labelledby="robux-title" className="relative py-14 lg:py-20">
      <Container>
        <SectionHeading
          id="robux-title"
          eyebrow={t.eyebrow}
          title={
            <>
              {t.titleStart} <span className="text-highlight">{t.titleHighlight}</span>
            </>
          }
          description={t.description}
        />

        <div className="mt-10 grid grid-cols-[minmax(0,1fr)] gap-4 lg:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)]">
          <Reveal className="rounded-[2rem] border border-brand-100 bg-white p-5 shadow-xl shadow-brand-900/5 sm:p-8">
            <StoreClosedNotice className="mb-5" />
            {/* Live numbers: Robux in stock (admin) and delivered Send Username orders (real count). */}
            {robuxStock !== null || stats.sendUsernameCompleted !== null ? (
              <ul className="mb-4 flex flex-wrap gap-2 text-xs font-semibold">
                {robuxStock !== null ? (
                  <li className="inline-flex items-center gap-1.5 rounded-full bg-brand-50 px-3 py-1.5 text-brand-800 ring-1 ring-brand-100">
                    <RobuxIcon className="size-3.5" aria-hidden="true" />
                    {interpolate(dict.robux.stock, { amount: formatNumber(robuxStock, locale) })}
                  </li>
                ) : null}
                {stats.sendUsernameCompleted !== null ? (
                  <li className="inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1.5 text-ink-700 ring-1 ring-brand-100">
                    <BadgeCheck className="size-3.5 text-brand-600" aria-hidden="true" />
                    {interpolate(dict.robux.successCount, { count: formatNumber(stats.sendUsernameCompleted, locale) })}
                  </li>
                ) : null}
              </ul>
            ) : null}
            <label htmlFor={amountId} className="text-sm font-semibold text-ink-500">
              {t.youGet}
            </label>
            <div className="mt-1 flex min-w-0 items-center gap-3">
              <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-brand-100 text-brand-700 sm:size-14">
                <RobuxIcon className="size-7 sm:size-8" aria-hidden="true" />
              </span>
              {/* Typeable amount: a dashed outline says "you can edit this"; it turns solid on focus. */}
              <input
                id={amountId}
                inputMode="numeric"
                autoComplete="off"
                value={amount === null ? "" : formatNumber(amount, locale)}
                onChange={(event) => setFromInput(event.target.value)}
                placeholder={formatNumber(robuxConfig.minAmount, locale)}
                aria-invalid={!valid}
                aria-describedby={hintId}
                // Grows with the number (1ch = one digit; the "." is narrower) + padding and border.
                style={{
                  width: `calc(${Math.max(2, amount === null ? 2 : formatNumber(amount, locale).length)}ch + 1.25rem)`,
                }}
                className={cn(
                  "min-w-0 rounded-2xl border-2 border-dashed bg-transparent px-2 py-0.5 text-[clamp(2.25rem,12vw,3rem)] font-extrabold tracking-tight text-ink-900 tabular-nums transition-colors outline-none placeholder:text-ink-300 focus:border-solid sm:text-6xl",
                  valid
                    ? "border-brand-200 hover:border-brand-400 focus:border-brand-500"
                    : "border-blush-400 focus:border-blush-500",
                )}
              />
              <span className="shrink-0 text-xl font-bold text-ink-300 sm:text-2xl">Robux</span>
            </div>
            <p id={hintId} className={cn("mt-2 text-xs", valid ? "text-ink-500" : "font-medium text-blush-700")}>
              {interpolate(dict.robux.amountHint, {
                min: formatNumber(robuxConfig.minAmount, locale),
                max: formatNumber(MAX_AMOUNT, locale),
              })}
            </p>

            <input
              type="range"
              min={0}
              max={presets.length - 1}
              step={1}
              value={index}
              onChange={(event) => setAmount(presets[Number(event.target.value)])}
              aria-label={t.sliderLabel}
              aria-valuetext={`${formatNumber(presets[index], locale)} Robux`}
              className="mt-5 h-2 w-full cursor-pointer appearance-auto accent-brand-500"
            />

            <div
              role="group"
              aria-label={t.amountsLabel}
              className="mt-5 grid grid-cols-4 gap-1.5 sm:grid-cols-6 sm:gap-2"
            >
              {presets.map((preset) => {
                const active = preset === amount;
                return (
                  <button
                    key={preset}
                    type="button"
                    aria-pressed={active}
                    onClick={() => setAmount(preset)}
                    className={cn(
                      "rounded-xl border-2 px-1 py-2 text-xs font-bold transition-[border-color,background-color,color,transform] duration-150 active:scale-95 sm:px-2 sm:text-sm",
                      active
                        ? "border-brand-500 bg-brand-50 text-brand-800"
                        : "border-brand-100 text-ink-700 hover:border-brand-300",
                    )}
                  >
                    {formatNumber(preset, locale)}
                  </button>
                );
              })}
            </div>

            <div className="mt-6 grid gap-4 rounded-2xl bg-brand-50 p-4 sm:grid-cols-[1fr_auto] sm:items-center sm:p-5">
              <div>
                <m.p
                  key={price ?? "none"}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  aria-live="polite"
                  className="text-3xl font-extrabold text-ink-900"
                >
                  {price === null ? "—" : formatIDR(price)}
                </m.p>
                <p className="mt-1 text-xs text-ink-500">
                  {formatIDR(rate)} {dict.common.perRobux} · <strong className="text-brand-700">{t.method}</strong>
                  {methodSoldOut ? (
                    <span className="ml-2 inline-block rounded-full bg-coal px-2 py-0.5 text-[11px] font-semibold text-snow">
                      {dict.common.soldOut}
                    </span>
                  ) : null}
                </p>
              </div>
              {valid && storeOpen ? (
                <Link
                  href={robuxPageHref(locale, amountValue, methodSoldOut)}
                  className={buttonVariants({ size: "lg", className: "w-full sm:w-auto" })}
                >
                  <Zap className="size-4" aria-hidden="true" />
                  {interpolate(t.buy, { amount: formatNumber(amountValue, locale) })}
                </Link>
              ) : (
                // Not a link while the amount is out of range or the store is closed (said above).
                <span
                  aria-disabled="true"
                  className={buttonVariants({
                    size: "lg",
                    className: "pointer-events-none w-full opacity-50 sm:w-auto",
                  })}
                >
                  <Zap className="size-4" aria-hidden="true" />
                  {dict.checkout.buyNow}
                </span>
              )}
            </div>
          </Reveal>

          <Reveal
            delay={0.1}
            className="relative flex flex-col overflow-hidden rounded-[2rem] bg-linear-to-br from-brand-100 via-brand-50 to-white p-5 sm:p-8"
          >
            <div
              aria-hidden="true"
              className="absolute -top-10 -right-10 size-40 rotate-12 rounded-[2rem] bg-white/40"
            />
            <h3 className="relative text-xl font-bold text-ink-900">{t.howTitle}</h3>
            <ol className="relative mt-5 grid gap-4">
              {t.steps.map((step, stepIndex) => (
                <li key={step.title} className="flex gap-4">
                  <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-white text-sm font-extrabold text-brand-700 shadow-sm">
                    {stepIndex + 1}
                  </span>
                  <span>
                    <span className="block font-semibold text-ink-900">{step.title}</span>
                    <span className="block text-sm text-ink-700">{step.description}</span>
                  </span>
                </li>
              ))}
            </ol>
            <div className="relative mt-6 grid gap-2 text-sm">
              <p className="flex items-center gap-2 rounded-xl bg-white/70 px-3 py-2 text-ink-700">
                <ShieldCheck className="size-4 shrink-0 text-brand-600" aria-hidden="true" />
                {t.notes.official}
              </p>
              {LIMITS ? (
                <p className="flex items-center gap-2 rounded-xl bg-white/70 px-3 py-2 text-ink-700">
                  <Info className="size-4 shrink-0 text-blush-500" aria-hidden="true" />
                  {interpolate(t.notes.limit, {
                    daily: formatNumber(LIMITS.daily, locale),
                    monthly: formatNumber(LIMITS.monthly, locale),
                  })}
                </p>
              ) : null}
            </div>
          </Reveal>
        </div>

        {/* CTA → full Robux page (custom amount, Send Username, checkout) */}
        <Reveal
          delay={0.15}
          className="mt-4 flex flex-col items-start gap-4 rounded-[2rem] border border-blush-200 bg-linear-to-r from-blush-50 via-white to-brand-50 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6"
        >
          <div className="flex items-center gap-4">
            <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-brand-400 text-coal shadow-lg shadow-brand-500/30">
              <RobuxIcon tone="ink" className="size-6" aria-hidden="true" />
            </span>
            <div>
              <p className="font-bold text-ink-900">{t.cta.title}</p>
              <p className="text-sm text-ink-500">{t.cta.description}</p>
            </div>
          </div>
          <Link
            href={robuxPageHref(locale)}
            className={buttonVariants({ variant: "pink", className: "w-full sm:w-auto sm:shrink-0" })}
          >
            {t.cta.button}
            <ArrowRight className="size-4 transition-transform group-hover/btn:translate-x-1" aria-hidden="true" />
          </Link>
        </Reveal>
      </Container>
    </section>
  );
}
