"use client";

import { animate, m, useMotionValue, useTransform } from "motion/react";
import { ArrowRight, BadgeCheck, CheckCircle2, ShoppingBag, UserRound } from "lucide-react";
import { useEffect } from "react";

import { ButtonLink } from "@/components/ui/button";
import { Container } from "@/components/ui/container";
import { Logo } from "@/components/ui/logo";
import { ProductArt } from "@/components/ui/product-art";
import { RobuxIcon } from "@/components/ui/robux-icon";
import { siteConfig } from "@/config/site";
import { useTilt } from "@/hooks/use-tilt";
import { formatNumber } from "@/i18n/format";
import { useI18n } from "@/i18n/i18n-provider";
import { cn } from "@/lib/utils";

const EASE = [0.22, 1, 0.36, 1] as const;
const SHOWCASE_ROBUX = 1700;

const ROBUX_ACCENT = ["#bdef6d", "#5f9a17"] as const;

export function Hero() {
  const { dict } = useI18n();
  const hero = dict.hero;

  return (
    <section
      id="home"
      aria-labelledby="hero-title"
      className="relative isolate flex min-h-svh flex-col justify-center overflow-hidden pt-24 pb-12 lg:pt-28 xl:pb-24"
    >
      <HeroBackdrop />

      <Container className="relative">
        <div className="relative z-10 mx-auto max-w-2xl text-center xl:max-w-3xl">
          {/* Order cards tilted behind the edges of the text — decoration only on wide screens. */}
          <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-20 hidden xl:block">
            <SideCard side="left" />
            <SideCard side="right" />
          </div>
          {/* Soft white glow so the text stays readable where it overlaps the cards. */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-[6%] inset-y-[12%] -z-10 rounded-full bg-white/70 blur-3xl"
          />

          <h1
            id="hero-title"
            className="text-[2.6rem] leading-[1.05] font-extrabold tracking-tight text-ink-900 sm:text-6xl xl:text-7xl"
          >
            {hero.headline.map((word, index) => (
              <m.span
                key={`${word}-${index}`}
                initial={{ opacity: 0, y: 28 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.06 * index, ease: EASE }}
                className="mx-[0.12em] inline-block"
              >
                {word}
              </m.span>
            ))}
            {/* Block wrapper animates; the inner inline span keeps the underline per line. */}
            <m.span
              initial={{ opacity: 0, y: 28 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.35, ease: EASE }}
              className="block"
            >
              <span className="animate-underline text-highlight">{hero.highlight}</span>
            </m.span>
          </h1>

          <m.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.45 }}
            className="mx-auto mt-5 max-w-xl text-base text-pretty text-ink-500 sm:text-lg"
          >
            {hero.description}
          </m.p>

          {siteConfig.ui.showHeroButtons ? (
            <m.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.55 }}
              className="mt-7 flex flex-wrap justify-center gap-3"
            >
              <ButtonLink href="#robux" size="lg">
                <RobuxIcon tone="ink" className="size-5" aria-hidden="true" />
                {hero.buyRobux}
                <ArrowRight className="size-4 transition-transform group-hover/btn:translate-x-1" aria-hidden="true" />
              </ButtonLink>
              <ButtonLink href="#shop" variant="outline" size="lg">
                <ShoppingBag className="size-4" aria-hidden="true" />
                {hero.browseItems}
              </ButtonLink>
            </m.div>
          ) : null}
        </div>

        {/* Below 1280px there is no room on the sides, so one card sits under the text. */}
        <div aria-hidden="true" className="mx-auto mt-14 max-w-sm px-4 xl:hidden">
          <m.div
            initial={{ opacity: 0, y: 30, rotate: 0 }}
            animate={{ opacity: 1, y: 0, rotate: -3 }}
            transition={{ duration: 0.8, delay: 0.3, ease: EASE }}
            className="relative"
          >
            <div className="animate-drift">
              <OrderCard variant="send-username" />
            </div>
          </m.div>
        </div>
      </Container>
    </section>
  );
}

function HeroBackdrop() {
  return (
    <div aria-hidden="true" className="absolute inset-0 -z-10">
      <div className="absolute inset-0 bg-grid mask-[radial-gradient(ellipse_at_center,black_30%,transparent_75%)]" />
      <div className="absolute -top-32 -right-24 size-[34rem] rounded-full bg-brand-200/70 blur-3xl" />
      <div className="absolute top-1/3 -left-40 size-[28rem] rounded-full bg-blush-100/70 blur-3xl" />
      <div className="absolute right-1/4 bottom-0 size-64 rounded-full bg-brand-100/80 blur-3xl" />
      <div className="absolute inset-x-0 bottom-0 h-32 bg-linear-to-b from-transparent to-white" />
    </div>
  );
}

const sides = {
  left: {
    variant: "send-username",
    rotate: -9,
    // Anchored to the text block: the card tucks ~5rem under the text's left edge.
    className: "top-[8%] right-[calc(100%-6rem)] 2xl:right-[calc(100%-5rem)]",
  },
  right: {
    variant: "gamepass",
    rotate: 8,
    className: "top-[20%] left-[calc(100%-6rem)] 2xl:left-[calc(100%-5rem)]",
  },
} as const;

/** One tilted, drifting order card on the left or right side of the hero. */
function SideCard({ side }: { side: keyof typeof sides }) {
  const config = sides[side];
  const isLeft = side === "left";

  return (
    <m.div
      initial={{ opacity: 0, x: isLeft ? -60 : 60, rotate: 0 }}
      animate={{ opacity: 1, x: 0, rotate: config.rotate }}
      transition={{ duration: 0.9, delay: isLeft ? 0.25 : 0.4, ease: EASE }}
      className={cn("absolute w-[18.5rem] 2xl:w-[22rem]", config.className)}
    >
      {/* Continuous drift on an inner element, so it doesn't fight the entrance rotation. */}
      <div className={cn("animate-drift", !isLeft && "[animation-delay:-3.5s] [animation-direction:reverse]")}>
        <OrderCard variant={config.variant} />
      </div>
    </m.div>
  );
}

const cardData = {
  "send-username": { id: "#MB-2F81C9", user: "Builderman_01", robux: SHOWCASE_ROBUX },
  gamepass: { id: "#MB-7KQ4ZP", user: "BloxyKid_22", robux: 800 },
} as const;

/** Sample "order completed" card (illustration only — the hero hides it from screen readers). */
export function OrderCard({ variant }: { variant: keyof typeof cardData }) {
  const { locale, dict } = useI18n();
  const { card } = dict.hero;
  const { product, progress } = dict.hero.cards[variant];
  const data = cardData[variant];
  const tilt = useTilt(8);
  const count = useMotionValue(0);
  const rounded = useTransform(count, (value) => formatNumber(Math.round(value), locale));

  useEffect(() => {
    const controls = animate(count, data.robux, { duration: 2.2, delay: 0.6, ease: EASE });
    return () => controls.stop();
  }, [count, data.robux]);

  return (
    <m.div
      style={tilt.style}
      onPointerMove={tilt.onPointerMove}
      onPointerLeave={tilt.onPointerLeave}
      className="pointer-events-auto relative rounded-[1.75rem] border border-white bg-white/95 p-5 pb-6 shadow-[0_30px_80px_-20px_rgb(95_154_23/0.28)] backdrop-blur-xl will-change-transform"
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <Logo eager={variant === "send-username"} height={30} />
          <div>
            <p className="text-xs text-ink-500">{card.order}</p>
            <p className="text-sm font-bold text-ink-900">{data.id}</p>
          </div>
        </div>
        <span className="inline-flex items-center gap-1 rounded-full bg-brand-100 px-2.5 py-1 text-xs font-semibold text-brand-800">
          <BadgeCheck className="size-3.5" aria-hidden="true" /> {card.success}
        </span>
      </div>

      <div className="mt-4 flex items-center gap-3 rounded-2xl bg-brand-50 p-3">
        <ProductArt
          icon="coins"
          accent={ROBUX_ACCENT}
          className="grid size-11 shrink-0 place-items-center rounded-xl"
          iconClassName="relative size-5 text-white"
        />
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-ink-900">{product}</p>
          <p className="flex items-center gap-1 text-xs text-ink-500">
            <UserRound className="size-3" aria-hidden="true" /> {data.user}
          </p>
        </div>
      </div>

      <div className="mt-4 rounded-2xl border border-brand-100 bg-linear-to-br from-white to-brand-50 p-4 text-center">
        <p className="text-[11px] font-semibold tracking-wider text-brand-600 uppercase">{card.youReceived}</p>
        <p className="mt-1 flex items-center justify-center gap-2 text-4xl font-extrabold text-ink-900 tabular-nums">
          <RobuxIcon className="size-7 text-brand-500" aria-hidden="true" />
          <m.span>{rounded}</m.span>
        </p>
        <p className="mt-0.5 text-xs text-ink-500">Robux</p>
      </div>

      <ol className="mt-4 grid gap-2">
        {progress.map((label, index) => (
          <m.li
            key={label}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.9 + index * 0.35 }}
            className="flex items-center gap-2 text-sm text-ink-700"
          >
            <CheckCircle2 className="size-4.5 text-brand-500" aria-hidden="true" />
            {label}
          </m.li>
        ))}
      </ol>
    </m.div>
  );
}
