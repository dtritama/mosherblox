"use client";

import { AnimatePresence, m } from "motion/react";
import { BadgeCheck, ChevronLeft, ChevronRight, Loader2, Star } from "lucide-react";
import { useRef, useState, type TouchEvent } from "react";

import { intlLocales } from "@/i18n/config";
import { interpolate } from "@/i18n/format";
import { useI18n } from "@/i18n/i18n-provider";
import { cn } from "@/lib/utils";
import type { PublicReview } from "@/server/reviews";

/** Page numbers visible at once (fits a 320px phone together with the arrows). */
const WINDOW = 5;
/** Width of one page number in the pager (size-11). */
const SLOT = 44;
/** Shorter swipes are taps or scrolling. */
const SWIPE = 60;

/**
 * The reviews, one page at a time: page 1 comes with the page, the others load when asked for (or on
 * hover) and stay in memory. Cards slide in from the side you are heading to; phones can swipe too.
 */
export function ReviewPages({ first, pages: initialPages }: { first: PublicReview[]; pages: number }) {
  const { dict } = useI18n();
  const t = dict.reviews;
  const [loaded, setLoaded] = useState<Record<number, PublicReview[]>>({ 1: first });
  const [pages, setPages] = useState(initialPages);
  const [view, setView] = useState({ page: 1, direction: 1 });
  const [loading, setLoading] = useState<number | null>(null);
  const [failed, setFailed] = useState(false);
  const topRef = useRef<HTMLDivElement>(null);
  const requests = useRef(new Map<number, Promise<PublicReview[]>>());
  /** The page asked for last: a slow, older answer never wins. */
  const wanted = useRef(1);
  const touch = useRef<{ x: number; y: number } | null>(null);

  const load = (page: number) => {
    if (loaded[page]) return Promise.resolve(loaded[page]);
    const running = requests.current.get(page);
    if (running) return running;
    const request = fetch(`/api/reviews?page=${page}`)
      .then(async (response) => {
        if (!response.ok) throw new Error(String(response.status));
        const data = (await response.json()) as { items: PublicReview[]; pages: number };
        setLoaded((prev) => ({ ...prev, [page]: data.items }));
        setPages(data.pages);
        return data.items;
      })
      .finally(() => requests.current.delete(page));
    requests.current.set(page, request);
    return request;
  };

  const go = async (page: number) => {
    if (page < 1 || page > pages || (page === view.page && loading === null)) return;
    wanted.current = page;
    setFailed(false);
    try {
      if (!loaded[page]) setLoading(page);
      await load(page);
      if (wanted.current !== page) return;
      setView((prev) => ({ page, direction: page >= prev.page ? 1 : -1 }));
      // Phones: the cards are taller than the screen, so start the new page at its first card.
      const top = topRef.current;
      if (top && top.getBoundingClientRect().top < 0) {
        const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
        top.scrollIntoView({ block: "start", behavior: still ? "auto" : "smooth" });
      }
    } catch {
      if (wanted.current === page) setFailed(true);
    } finally {
      if (wanted.current === page) setLoading(null);
    }
  };
  const preload = (page: number) => {
    if (page >= 1 && page <= pages) load(page).catch(() => undefined);
  };

  const onTouchEnd = (event: TouchEvent) => {
    const start = touch.current;
    touch.current = null;
    if (!start) return;
    const dx = event.changedTouches[0].clientX - start.x;
    const dy = event.changedTouches[0].clientY - start.y;
    if (Math.abs(dx) < SWIPE || Math.abs(dx) < Math.abs(dy) * 2) return;
    void go(view.page + (dx < 0 ? 1 : -1));
  };

  return (
    <div ref={topRef} className="mt-8 scroll-mt-24">
      <div
        // The cards that slide out sideways must not widen the page; room for their shadow.
        className="-m-2 overflow-x-clip p-2"
        onTouchStart={(event) => {
          const point = event.touches[0];
          touch.current = event.touches.length === 1 ? { x: point.clientX, y: point.clientY } : null;
        }}
        onTouchEnd={onTouchEnd}
        onTouchCancel={() => (touch.current = null)}
      >
        <AnimatePresence mode="wait" initial={false} custom={view.direction}>
          <m.ul
            key={view.page}
            custom={view.direction}
            variants={list}
            initial="enter"
            animate="show"
            exit="exit"
            aria-busy={loading !== null}
            className={cn(
              "grid grid-cols-[minmax(0,1fr)] gap-4 transition-[filter] duration-300 sm:grid-cols-2 lg:grid-cols-3",
              loading !== null && "blur-[2px]",
            )}
          >
            {(loaded[view.page] ?? []).map((review) => (
              <m.li key={review.id} variants={card} custom={view.direction}>
                <ReviewCard review={review} />
              </m.li>
            ))}
          </m.ul>
        </AnimatePresence>
      </div>

      {pages > 1 ? (
        <Pager page={view.page} pages={pages} loading={loading} onGo={(page) => void go(page)} onPreload={preload} />
      ) : null}
      {failed ? (
        <p role="alert" className="mt-3 text-center text-sm text-blush-700">
          {t.pager.failed}
        </p>
      ) : null}
    </div>
  );
}

const list = {
  enter: {},
  show: { transition: { staggerChildren: 0.045 } },
  exit: (direction: number) => ({ opacity: 0, x: -32 * direction, transition: { duration: 0.18 } }),
};
const card = {
  enter: (direction: number) => ({ opacity: 0, x: 56 * direction, rotate: 1.5 * direction }),
  show: { opacity: 1, x: 0, rotate: 0, transition: { duration: 0.45 } },
};

function Pager({
  page,
  pages,
  loading,
  onGo,
  onPreload,
}: {
  page: number;
  pages: number;
  loading: number | null;
  onGo: (page: number) => void;
  onPreload: (page: number) => void;
}) {
  const { dict } = useI18n();
  const t = dict.reviews.pager;
  const size = Math.min(WINDOW, pages);
  // The pill moves to the clicked number at once; the cards follow when they are there.
  const current = loading ?? page;
  const start = Math.min(Math.max(1, current - Math.floor(size / 2)), pages - size + 1);
  const numbers = Array.from({ length: size }, (_, index) => start + index);

  const arrow = (target: number, label: string, Icon: typeof ChevronLeft) => {
    const off = target < 1 || target > pages;
    return (
      <button
        type="button"
        aria-label={label}
        aria-disabled={off}
        onClick={() => !off && onGo(target)}
        onPointerEnter={() => onPreload(target)}
        onFocus={() => onPreload(target)}
        className="group grid size-11 shrink-0 place-items-center rounded-full border border-brand-200 bg-white text-ink-900 transition-[border-color,background-color,transform,opacity] hover:border-brand-400 hover:bg-brand-50 active:scale-90 aria-disabled:pointer-events-none aria-disabled:opacity-35"
      >
        <Icon
          aria-hidden="true"
          className={cn(
            "size-5 transition-transform duration-200",
            target < current ? "group-hover:-translate-x-0.5" : "group-hover:translate-x-0.5",
          )}
        />
      </button>
    );
  };

  return (
    <nav aria-label={t.label} className="mt-8 grid justify-items-center gap-3">
      <div className="flex items-center gap-2">
        {arrow(current - 1, t.prev, ChevronLeft)}
        <ol className="relative flex rounded-full border border-brand-100 bg-white p-0.5 shadow-sm max-[359px]:hidden">
          <span
            aria-hidden="true"
            style={{ transform: `translateX(${(current - start) * SLOT}px)` }}
            className="absolute top-0.5 left-0.5 size-11 rounded-full bg-brand-400 shadow-md shadow-brand-500/30 transition-transform duration-500 ease-[cubic-bezier(0.34,1.4,0.64,1)] motion-reduce:transition-none"
          />
          {numbers.map((number) => (
            // By position, so the focused button stays when the numbers shift.
            <li key={number - start}>
              <button
                type="button"
                aria-label={interpolate(t.page, { page: number })}
                aria-current={number === page ? "page" : undefined}
                onClick={() => onGo(number)}
                onPointerEnter={() => onPreload(number)}
                onFocus={() => onPreload(number)}
                className={cn(
                  "relative grid size-11 place-items-center rounded-full text-sm font-bold tabular-nums transition-colors duration-300",
                  number === current ? "text-coal" : "text-ink-500 hover:text-ink-900",
                )}
              >
                {number === loading ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : number}
              </button>
            </li>
          ))}
        </ol>
        {arrow(current + 1, t.next, ChevronRight)}
      </div>
      <p role="status" className="text-xs text-ink-500 tabular-nums">
        {interpolate(t.position, { page, pages })}
      </p>
    </nav>
  );
}

function ReviewCard({ review }: { review: PublicReview }) {
  const { locale, dict } = useI18n();
  const t = dict.reviews;
  const date = new Intl.DateTimeFormat(intlLocales[locale], { dateStyle: "medium", timeZone: "Asia/Jakarta" });
  return (
    <div className="flex h-full flex-col rounded-[1.75rem] border border-brand-100 bg-white p-5 shadow-sm">
      <div className="flex items-center gap-3">
        {review.avatarUrl ? (
          // Roblox CDN headshot (allowed in the CSP).
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={review.avatarUrl}
            alt=""
            width={44}
            height={44}
            loading="lazy"
            className="size-11 shrink-0 rounded-xl bg-brand-100"
          />
        ) : (
          <span
            aria-hidden="true"
            className="grid size-11 shrink-0 place-items-center rounded-xl bg-brand-100 font-bold text-brand-700"
          >
            {review.name.charAt(0).toUpperCase()}
          </span>
        )}
        <div className="min-w-0">
          <p className="truncate font-bold text-ink-900">{review.name}</p>
          <p className="flex items-center gap-1 text-xs font-medium text-brand-700">
            <BadgeCheck className="size-3.5" aria-hidden="true" />
            {t.verified}
          </p>
        </div>
      </div>
      <span role="img" aria-label={interpolate(t.stars, { count: review.rating })} className="mt-3 flex gap-0.5">
        {[1, 2, 3, 4, 5].map((value) => (
          <Star
            key={value}
            className={cn("size-4", value <= review.rating ? "fill-amber-400 text-amber-400" : "text-ink-300")}
            aria-hidden="true"
          />
        ))}
      </span>
      <p className="mt-2 text-sm leading-relaxed break-words whitespace-pre-line text-ink-700">{review.body}</p>
      {/* Server and browser may word the month differently. */}
      <p className="mt-auto pt-4 text-xs text-ink-500" suppressHydrationWarning>
        {review.item[locale]} · {date.format(new Date(review.createdAt))}
      </p>
    </div>
  );
}
