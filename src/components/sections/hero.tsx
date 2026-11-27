"use client";

import { AnimatePresence, animate, m, useInView, useMotionValue, useReducedMotion, useTransform } from "motion/react";
import { ArrowRight, BadgeCheck, CheckCircle2, ShoppingBag, UserRound } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

import { ButtonLink } from "@/components/ui/button";
import { Container } from "@/components/ui/container";
import { Logo } from "@/components/ui/logo";
import { ProductArt } from "@/components/ui/product-art";
import { RobuxIcon } from "@/components/ui/robux-icon";
import { siteConfig } from "@/config/site";
import { useTilt } from "@/hooks/use-tilt";
import { formatNumber } from "@/i18n/format";
import { useI18n } from "@/i18n/i18n-provider";
import { SAMPLE_DELIVERIES, type RecentDeliveries, type RecentDelivery } from "@/lib/recent-deliveries";
import { cn } from "@/lib/utils";

const EASE = [0.22, 1, 0.36, 1] as const;
const ROBUX_ACCENT = ["#bdef6d", "#5f9a17"] as const;
/** How long each card stays on top of its deck. */
const DECK_INTERVAL = 2800;

/**
 * Home hero: centred text with two tilted order cards on the sides. Each card is a small deck of
 * the latest real completed orders (left = Send Username, right = Gamepass, 10 each): it swipes
 * by itself, on click, or when dragged sideways.
 */
export function Hero({ deliveries }: { deliveries: RecentDeliveries }) {
  const { dict } = useI18n();
  const hero = dict.hero;
  // A side without completed orders yet shows its sample card.
  const decks = {
    "send-username":
      deliveries["send-username"].length > 0 ? deliveries["send-username"] : SAMPLE_DELIVERIES["send-username"],
    gamepass: deliveries.gamepass.length > 0 ? deliveries.gamepass : SAMPLE_DELIVERIES.gamepass,
  };

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
            <SideCard side="left" cards={decks["send-username"]} />
            <SideCard side="right" cards={decks.gamepass} />
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
            <OrderDeck cards={decks["send-username"]} side="left" />
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
      <div className="absolute -top-32 -right-24 size-[34rem] rounded-full bg-brand-200/40 blur-3xl dark:bg-brand-200/70 dark:opacity-30" />
      <div className="absolute top-1/3 -left-40 size-[28rem] rounded-full bg-blush-100/40 blur-3xl dark:bg-blush-100/70 dark:opacity-30" />
      <div className="absolute right-1/4 bottom-0 size-64 rounded-full bg-brand-100/80 blur-3xl dark:opacity-30" />
      <div className="absolute inset-x-0 bottom-0 h-32 bg-linear-to-b from-transparent to-white" />
    </div>
  );
}

const sides = {
  left: {
    rotate: -9,
    // Anchored to the text block: the card tucks ~5rem under the text's left edge.
    className: "top-[8%] right-[calc(100%-6rem)] 2xl:right-[calc(100%-5rem)]",
  },
  right: {
    rotate: 8,
    className: "top-[20%] left-[calc(100%-6rem)] 2xl:left-[calc(100%-5rem)]",
  },
} as const;

type Side = keyof typeof sides;

/** One tilted, drifting deck of order cards on the left or right side of the hero. */
function SideCard({ side, cards }: { side: Side; cards: RecentDelivery[] }) {
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
        <OrderDeck cards={cards} side={side} />
      </div>
    </m.div>
  );
}

/** Cards behind the top one peek out towards the outside of the page. */
const STACK = [
  { x: 0, y: 0, rotate: 0, scale: 1 },
  { x: 14, y: 12, rotate: 3, scale: 0.96 },
  { x: 28, y: 24, rotate: 6, scale: 0.92 },
] as const;

/**
 * A stack of order cards. The top card flies off every DECK_INTERVAL (the right deck half a beat
 * later), when clicked, or when dragged sideways and let go. Auto-swipe pauses while hovered,
 * off screen, and for visitors who prefer reduced motion. Hidden from screen readers.
 */
function OrderDeck({ cards, side }: { cards: RecentDelivery[]; side: Side }) {
  const reduce = useReducedMotion();
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref);
  const [hovered, setHovered] = useState(false);
  // Grows forever; keys use it so every card shown is a new element (exit = fly off).
  const [step, setStep] = useState(0);
  const outward = side === "left" ? -1 : 1;
  const [direction, setDirection] = useState<number>(outward);
  const canSwipe = cards.length > 1;
  const running = canSwipe && !reduce && !hovered && inView;

  const next = useCallback((to: number) => {
    setDirection(to);
    setStep((value) => value + 1);
  }, []);

  useEffect(() => {
    if (!running) return;
    // Right deck starts half a beat later so the two never swipe together; `step` restarts the
    // countdown after a click or drag.
    const wait = step === 0 && side === "right" ? DECK_INTERVAL * 1.5 : DECK_INTERVAL;
    const id = window.setTimeout(() => next(outward), wait);
    return () => window.clearTimeout(id);
  }, [running, step, side, outward, next]);

  const depth = Math.min(STACK.length, cards.length);
  const visible = Array.from({ length: depth }, (_, position) => ({
    key: step + position,
    position,
    card: cards[(step + position) % cards.length]!,
  }));
  const place = (position: number) => {
    const spot = STACK[position]!;
    return { ...spot, x: spot.x * outward, rotate: spot.rotate * outward, opacity: 1 };
  };

  return (
    <div
      ref={ref}
      aria-hidden="true"
      onPointerEnter={() => setHovered(true)}
      onPointerLeave={() => setHovered(false)}
      className="pointer-events-auto grid grid-cols-[minmax(0,1fr)]"
    >
      <AnimatePresence initial={false} custom={direction}>
        {visible
          .slice()
          .reverse()
          .map(({ key, position, card }) => {
            const top = position === 0;
            return (
              <m.div
                key={key}
                custom={direction}
                variants={{
                  exit: (to: number) => ({
                    x: 190 * to,
                    y: -50,
                    rotate: 18 * to,
                    opacity: 0,
                    transition: { duration: 0.45, ease: EASE },
                  }),
                }}
                initial={{ ...place(depth - 1), opacity: 0 }}
                animate={place(position)}
                exit="exit"
                transition={{ duration: 0.6, ease: EASE }}
                style={{ zIndex: STACK.length - position, transformOrigin: "50% 80%" }}
                drag={top && canSwipe ? "x" : false}
                dragSnapToOrigin
                dragElastic={0.6}
                onTap={top && canSwipe ? () => next(outward) : undefined}
                onDragEnd={(_, info) => {
                  if (Math.abs(info.offset.x) > 70 || Math.abs(info.velocity.x) > 500) {
                    next(info.offset.x < 0 ? -1 : 1);
                  }
                }}
                className={cn("[grid-area:1/1]", top && canSwipe && "cursor-grab touch-pan-y active:cursor-grabbing")}
              >
                <OrderCard card={card} active={top} />
              </m.div>
            );
          })}
      </AnimatePresence>
    </div>
  );
}

/** "26 Nov 2026", in Jakarta time (same on server and browser). */
function formatFinished(iso: string, locale: string) {
  return new Intl.DateTimeFormat(locale === "id" ? "id-ID" : "en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "Asia/Jakarta",
  }).format(new Date(iso));
}

/**
 * One "order completed" card. `active` = top of its deck: the Robux count runs up and the steps
 * tick in each time it gets there; cards behind it are plain shells. Hidden from screen readers.
 */
export function OrderCard({ card, active = true }: { card: RecentDelivery; active?: boolean }) {
  const { locale, dict } = useI18n();
  const { card: copy } = dict.hero;
  const { product, progress } = dict.hero.cards[card.method];
  const tilt = useTilt(8);
  const count = useMotionValue(active ? 0 : card.robux);
  const rounded = useTransform(count, (value) => formatNumber(Math.round(value), locale));

  useEffect(() => {
    if (!active) return;
    count.set(0);
    const controls = animate(count, card.robux, { duration: 1.6, delay: 0.25, ease: EASE });
    return () => controls.stop();
  }, [active, count, card.robux]);

  return (
    <m.div
      style={active ? tilt.style : undefined}
      onPointerMove={active ? tilt.onPointerMove : undefined}
      onPointerLeave={active ? tilt.onPointerLeave : undefined}
      className="relative rounded-[1.75rem] border border-white bg-white/95 p-5 pb-6 shadow-[0_30px_80px_-20px_rgb(95_154_23/0.28)] backdrop-blur-xl will-change-transform"
    >
      <m.div initial={false} animate={{ opacity: active ? 1 : 0 }} transition={{ duration: 0.4 }}>
        <div className="flex items-center justify-between gap-2">
          <div className="flex min-w-0 items-center gap-2.5">
            <Logo height={30} />
            <div className="min-w-0">
              <p className="text-xs text-ink-500">{copy.order}</p>
              {/* Real orders show the date they were finished; the sample card keeps the line empty. */}
              <p className="min-h-5 truncate text-sm font-bold text-ink-900">
                {card.finishedAt ? formatFinished(card.finishedAt, locale) : null}
              </p>
            </div>
          </div>
          <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-brand-100 px-2.5 py-1 text-xs font-semibold text-brand-800">
            <BadgeCheck className="size-3.5" aria-hidden="true" /> {copy.success}
          </span>
        </div>

        <div className="mt-4 flex items-center gap-3 rounded-2xl bg-brand-50 p-3">
          {card.avatarUrl ? (
            // Roblox CDN headshot (allowed in the CSP).
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={card.avatarUrl}
              alt=""
              width={44}
              height={44}
              draggable={false}
              className="size-11 shrink-0 rounded-xl bg-white"
            />
          ) : (
            <ProductArt
              icon="coins"
              accent={ROBUX_ACCENT}
              className="grid size-11 shrink-0 place-items-center rounded-xl"
              iconClassName="relative size-5 text-snow"
            />
          )}
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-ink-900">{product}</p>
            <p className="flex items-center gap-1 truncate text-xs text-ink-500">
              <UserRound className="size-3 shrink-0" aria-hidden="true" /> {card.name}
            </p>
          </div>
        </div>

        <div className="mt-4 rounded-2xl border border-brand-100 bg-linear-to-br from-white to-brand-50 p-4 text-center">
          <p className="text-[11px] font-semibold tracking-wider text-brand-600 uppercase">{copy.youReceived}</p>
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
              initial={active ? { opacity: 0, x: -10 } : false}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.5 + index * 0.3 }}
              className="flex items-center gap-2 text-sm text-ink-700"
            >
              <CheckCircle2 className="size-4.5 text-brand-500" aria-hidden="true" />
              {label}
            </m.li>
          ))}
        </ol>
      </m.div>
    </m.div>
  );
}
