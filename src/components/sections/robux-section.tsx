"use client";

import { m, useSpring, useTransform } from "motion/react";
import { ArrowRight, Info, ShieldCheck, Zap } from "lucide-react";
import Link from "next/link";
import { useId, useState } from "react";

import { buttonVariants } from "@/components/ui/button";
import { Container } from "@/components/ui/container";
import { Reveal } from "@/components/ui/reveal";
import { RobuxIcon } from "@/components/ui/robux-icon";
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

/** Link into the Robux page with the amount (and method) already picked. */
function robuxPageHref(locale: Parameters<typeof localeHref>[0], amount?: number) {
  const query = amount ? `?method=${METHOD}&amount=${amount}` : "";
  return `${localeHref(locale, "/robux")}${query}`;
}

export function RobuxSection() {
  const { locale, dict } = useI18n();
  const t = dict.robuxTeaser;
  const sliderId = useId();
  const [index, setIndex] = useState(DEFAULT_INDEX);
  const amountValue = presets[index];
  const { robuxRates: rates } = useStoreSettings();
  const price = calculateRobuxPrice(METHOD, amountValue, rates);
  const { rate } = getRobuxTier(METHOD, amountValue, rates);

  // Animated number: the spring is updated from the event handler, so no effect or re-render loop.
  const amount = useSpring(amountValue, { stiffness: 140, damping: 22 });
  const display = useTransform(amount, (value) => formatNumber(Math.round(value), locale));

  const select = (next: number) => {
    setIndex(next);
    amount.set(presets[next]);
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

        <div className="mt-10 grid gap-4 lg:grid-cols-[1.35fr_1fr]">
          <Reveal className="rounded-[2rem] border border-brand-100 bg-white p-5 shadow-xl shadow-brand-900/5 sm:p-8">
            <label htmlFor={sliderId} className="text-sm font-semibold text-ink-500">
              {t.youGet}
            </label>
            <p className="mt-1 flex items-center gap-3 text-5xl font-extrabold tracking-tight text-ink-900 tabular-nums sm:text-6xl">
              <span className="grid size-12 place-items-center rounded-2xl bg-brand-100 text-brand-700 sm:size-14">
                <RobuxIcon className="size-7 sm:size-8" aria-hidden="true" />
              </span>
              <m.span>{display}</m.span>
              <span className="text-xl font-bold text-ink-300 sm:text-2xl">Robux</span>
            </p>

            <input
              id={sliderId}
              type="range"
              min={0}
              max={presets.length - 1}
              step={1}
              value={index}
              onChange={(event) => select(Number(event.target.value))}
              aria-valuetext={`${formatNumber(amountValue, locale)} Robux`}
              className="mt-6 h-2 w-full cursor-pointer appearance-auto accent-brand-500"
            />

            <div
              role="group"
              aria-label={t.amountsLabel}
              className="mt-5 grid grid-cols-4 gap-1.5 sm:grid-cols-6 sm:gap-2"
            >
              {presets.map((preset, presetIndex) => {
                const active = presetIndex === index;
                return (
                  <button
                    key={preset}
                    type="button"
                    aria-pressed={active}
                    onClick={() => select(presetIndex)}
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
                  key={price}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-3xl font-extrabold text-ink-900"
                >
                  {formatIDR(price)}
                </m.p>
                <p className="mt-1 text-xs text-ink-500">
                  {formatIDR(rate)} {dict.common.perRobux} · <strong className="text-brand-700">{t.method}</strong>
                </p>
              </div>
              <Link
                href={robuxPageHref(locale, amountValue)}
                className={buttonVariants({ size: "lg", className: "w-full sm:w-auto" })}
              >
                <Zap className="size-4" aria-hidden="true" />
                {interpolate(t.buy, { amount: formatNumber(amountValue, locale) })}
              </Link>
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
            <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-brand-400 text-ink-900 shadow-lg shadow-brand-500/30">
              <RobuxIcon className="size-6" aria-hidden="true" />
            </span>
            <div>
              <p className="font-bold text-ink-900">{t.cta.title}</p>
              <p className="text-sm text-ink-500">{t.cta.description}</p>
            </div>
          </div>
          <Link
            href={robuxPageHref(locale)}
            className={buttonVariants({ variant: "pink", className: "w-full sm:w-auto" })}
          >
            {t.cta.button}
            <ArrowRight className="size-4 transition-transform group-hover/btn:translate-x-1" aria-hidden="true" />
          </Link>
        </Reveal>
      </Container>
    </section>
  );
}
