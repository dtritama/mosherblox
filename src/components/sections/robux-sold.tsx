"use client";

import { useEffect, useRef, useState } from "react";

import { RobuxIcon } from "@/components/ui/robux-icon";
import { formatNumber, interpolate } from "@/i18n/format";
import { useI18n } from "@/i18n/i18n-provider";

const DURATION_MS = 1600;

/** Counts up to `value` the first time it is on screen; the final number at once under reduced motion. */
function useCountUp(value: number) {
  const ref = useRef<HTMLDivElement>(null);
  const [shown, setShown] = useState(value);
  useEffect(() => {
    const element = ref.current;
    if (!element || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let frame = 0;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        observer.disconnect();
        const start = performance.now();
        const tick = (now: number) => {
          const progress = Math.min(1, Math.max(0, (now - start) / DURATION_MS));
          setShown(Math.round(value * (1 - (1 - progress) ** 4)));
          if (progress < 1) frame = requestAnimationFrame(tick);
        };
        frame = requestAnimationFrame(tick);
      },
      { threshold: 0.4 },
    );
    observer.observe(element);
    return () => {
      observer.disconnect();
      cancelAnimationFrame(frame);
      setShown(value);
    };
  }, [value]);
  return { ref, shown };
}

/** All-time Robux sold (completed orders). Fills the column next to the leaderboard on desktop. */
export function RobuxSold({ total, orders }: { total: number; orders: number }) {
  const { locale, dict } = useI18n();
  const t = dict.leaderboard.sold;
  const { ref, shown } = useCountUp(total);
  return (
    <div
      ref={ref}
      className="@container relative isolate flex min-h-64 flex-1 flex-col justify-end overflow-hidden rounded-[2rem] bg-brand-400 p-6 text-coal shadow-xl shadow-brand-900/5 sm:min-h-72 sm:p-8 lg:min-h-96"
    >
      {/* One big Robux symbol, cut by the panel's top right corner. */}
      <RobuxIcon
        tone="ink"
        aria-hidden="true"
        className="pointer-events-none absolute -top-10 -right-10 -z-10 w-52 animate-float text-brand-300 sm:w-64 lg:-top-12 lg:-right-14 lg:w-[70cqi]"
      />
      <p className="text-base font-semibold sm:text-lg">{t.label}</p>
      {/* Screen readers get the real number, not the counting. */}
      <p className="mt-1">
        <span className="sr-only">{formatNumber(total, locale)} Robux</span>
        <span
          aria-hidden="true"
          className="block text-[clamp(2.75rem,17cqi,6.5rem)] leading-none font-extrabold tracking-tight tabular-nums"
        >
          {formatNumber(shown, locale)}
        </span>
      </p>
      <p className="mt-4 max-w-sm text-sm font-medium sm:text-base">
        {interpolate(t.orders, { count: formatNumber(orders, locale) })}
      </p>
    </div>
  );
}
