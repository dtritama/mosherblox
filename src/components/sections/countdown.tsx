"use client";

import { useSyncExternalStore } from "react";

import { useI18n } from "@/i18n/i18n-provider";

/** One shared 1-second ticker for every subscriber. */
function subscribe(callback: () => void) {
  const id = window.setInterval(callback, 1000);
  return () => window.clearInterval(id);
}
const getSnapshot = () => Math.floor(Date.now() / 1000);
// On the server (and during hydration) we render placeholders to avoid a mismatch.
const getServerSnapshot = () => null;

function secondsUntilMidnight(nowSeconds: number) {
  const now = new Date(nowSeconds * 1000);
  const midnight = new Date(now);
  midnight.setHours(24, 0, 0, 0);
  return Math.max(0, Math.floor((midnight.getTime() - now.getTime()) / 1000));
}

const pad = (value: number) => value.toString().padStart(2, "0");

export function Countdown() {
  const { dict } = useI18n();
  const { units: labels, timerLabel } = dict.deals;
  const now = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const remaining = now === null ? null : secondsUntilMidnight(now);

  const units = [
    { label: labels.hours, value: remaining === null ? "--" : pad(Math.floor(remaining / 3600)) },
    { label: labels.minutes, value: remaining === null ? "--" : pad(Math.floor((remaining % 3600) / 60)) },
    { label: labels.seconds, value: remaining === null ? "--" : pad(remaining % 60) },
  ];

  return (
    <div role="timer" aria-label={timerLabel} className="flex items-center gap-2">
      {units.map((unit, index) => (
        <div key={unit.label} className="flex items-center gap-2">
          <div className="grid w-16 place-items-center rounded-2xl border border-brand-100 bg-white py-2.5 shadow-sm sm:w-20">
            <span className="text-2xl font-extrabold text-ink-900 tabular-nums sm:text-3xl">{unit.value}</span>
            <span className="text-[10px] font-medium tracking-wider text-brand-600 uppercase">{unit.label}</span>
          </div>
          {index < units.length - 1 ? <span className="text-2xl font-bold text-blush-400">:</span> : null}
        </div>
      ))}
    </div>
  );
}
