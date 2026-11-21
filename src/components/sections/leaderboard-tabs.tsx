"use client";

import { Crown } from "lucide-react";
import { useId, useState, type KeyboardEvent } from "react";

import { RobuxIcon } from "@/components/ui/robux-icon";
import { formatNumber, interpolate } from "@/i18n/format";
import { useI18n } from "@/i18n/i18n-provider";
import { cn } from "@/lib/utils";
import { LEADERBOARD_CATEGORIES, type Leaderboard, type LeaderboardCategory } from "@/lib/leaderboard";

/** Category tabs (a real ARIA tablist, arrow keys move between tabs) + the ranked list. */
export function LeaderboardTabs({ data }: { data: Leaderboard }) {
  const { locale, dict } = useI18n();
  const t = dict.leaderboard;
  const baseId = useId();
  const firstWithData = LEADERBOARD_CATEGORIES.find((category) => data[category].length > 0) ?? "robux";
  const [active, setActive] = useState<LeaderboardCategory>(firstWithData);

  const onKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    const index = LEADERBOARD_CATEGORIES.indexOf(active);
    const step = event.key === "ArrowRight" ? 1 : event.key === "ArrowLeft" ? -1 : 0;
    if (!step) return;
    event.preventDefault();
    const next = LEADERBOARD_CATEGORIES[(index + step + LEADERBOARD_CATEGORIES.length) % LEADERBOARD_CATEGORIES.length];
    setActive(next);
    document.getElementById(`${baseId}-tab-${next}`)?.focus();
  };

  const entries = data[active];
  return (
    <div className="rounded-[2rem] border border-brand-100 bg-white p-4 shadow-xl shadow-brand-900/5 sm:p-6">
      <div role="tablist" aria-label={t.tabsLabel} className="grid grid-cols-3 gap-1 rounded-2xl bg-brand-50 p-1">
        {LEADERBOARD_CATEGORIES.map((category) => (
          <button
            key={category}
            id={`${baseId}-tab-${category}`}
            type="button"
            role="tab"
            aria-selected={active === category}
            aria-controls={`${baseId}-panel`}
            tabIndex={active === category ? 0 : -1}
            onClick={() => setActive(category)}
            onKeyDown={onKeyDown}
            className={cn(
              "min-h-11 rounded-xl px-2 text-sm font-semibold transition-colors",
              active === category ? "bg-white text-ink-900 shadow-sm" : "text-ink-500 hover:text-ink-900",
            )}
          >
            {t.tabs[category]}
          </button>
        ))}
      </div>

      <div id={`${baseId}-panel`} role="tabpanel" aria-labelledby={`${baseId}-tab-${active}`} className="mt-4">
        {entries.length === 0 ? (
          <p className="px-2 py-10 text-center text-sm text-ink-500">{t.empty}</p>
        ) : (
          <ol className="grid gap-2">
            {entries.map((entry) => (
              <li
                key={`${active}-${entry.rank}`}
                className={cn(
                  "flex min-w-0 items-center gap-3 rounded-2xl px-3 py-2.5",
                  entry.rank === 1 ? "bg-brand-100" : entry.rank <= 3 ? "bg-brand-50" : "",
                )}
              >
                <span
                  aria-label={interpolate(t.rank, { rank: entry.rank })}
                  className={cn(
                    "grid size-8 shrink-0 place-items-center rounded-full text-sm font-extrabold tabular-nums",
                    entry.rank === 1
                      ? "bg-brand-400 text-coal"
                      : entry.rank <= 3
                        ? "bg-white text-brand-800 ring-1 ring-brand-200"
                        : "text-ink-500",
                  )}
                >
                  {entry.rank === 1 ? <Crown className="size-4" aria-hidden="true" /> : entry.rank}
                </span>
                {entry.avatarUrl ? (
                  // Roblox CDN headshot (allowed in the CSP).
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={entry.avatarUrl}
                    alt=""
                    width={40}
                    height={40}
                    loading="lazy"
                    className="size-10 shrink-0 rounded-xl bg-white"
                  />
                ) : (
                  <span
                    aria-hidden="true"
                    className="grid size-10 shrink-0 place-items-center rounded-xl bg-white font-bold text-brand-700 ring-1 ring-brand-100"
                  >
                    {entry.name.charAt(0).toUpperCase()}
                  </span>
                )}
                <span className="min-w-0 flex-1 truncate font-semibold text-ink-900">{entry.name}</span>
                <span className="flex shrink-0 items-center gap-1 text-sm font-bold text-ink-900 tabular-nums">
                  {active === "robux" ? <RobuxIcon className="size-4 text-brand-600" aria-hidden="true" /> : null}
                  {interpolate(t.units[active], { count: formatNumber(entry.value, locale) })}
                </span>
              </li>
            ))}
          </ol>
        )}
      </div>
    </div>
  );
}
