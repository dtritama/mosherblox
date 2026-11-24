"use client";

import { useReducedMotion } from "motion/react";
import { ChevronLeft, ChevronRight, Pause, Play } from "lucide-react";
import Image from "next/image";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type FocusEvent,
  type MouseEvent,
  type ReactNode,
} from "react";

import { Container } from "@/components/ui/container";
import { Reveal } from "@/components/ui/reveal";
import type { Banner } from "@/lib/banners";
import { localeHref } from "@/i18n/config";
import { interpolate } from "@/i18n/format";
import { useI18n } from "@/i18n/i18n-provider";
import { cn } from "@/lib/utils";

const INTERVAL_MS = 5000;

/**
 * Promo banner carousel.
 * - Peek layout: each slide is 88% wide, so the next banner is always partly visible — a clear
 *   hint that the banners slide. Tapping a peeking banner brings it into view.
 * - Native CSS scroll-snap: swipe/trackpad scrolling is smooth and needs no drag library.
 * - Autoplay every 5s, looping. It pauses while the user is touching/dragging, while a control has
 *   keyboard focus, when the tab is hidden or the carousel is off-screen, and via the pause button.
 *   For users who prefer reduced motion it starts paused (they can still press play).
 * - With a single banner, arrows/dots/autoplay are not rendered.
 */
export function BannerCarousel({ banners }: { banners: readonly Banner[] }) {
  const { locale, dict } = useI18n();
  const t = dict.banners;
  const reduceMotion = useReducedMotion();

  const sectionRef = useRef<HTMLElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);
  const [touching, setTouching] = useState(false);
  const [keyboardFocus, setKeyboardFocus] = useState(false);
  const [onScreen, setOnScreen] = useState(false);
  const [pageVisible, setPageVisible] = useState(true);
  /** null = follow the OS "reduce motion" preference; true/false = the user's explicit choice. */
  const [userPaused, setUserPaused] = useState<boolean | null>(null);

  const count = banners.length;
  const hasMany = count > 1;
  const paused = userPaused ?? Boolean(reduceMotion);
  const autoplay = hasMany && !paused && !touching && !keyboardFocus && onScreen && pageVisible;

  const goTo = useCallback(
    (index: number) => {
      const track = trackRef.current;
      const next = (index + count) % count;
      const slide = track?.children[next] as HTMLElement | undefined;
      if (!track || !slide) return;
      track.scrollTo({ left: slide.offsetLeft, behavior: reduceMotion ? "auto" : "smooth" });
    },
    [count, reduceMotion],
  );

  // Track which slide is in view (works for arrows, dots, swipe and trackpad alike).
  useEffect(() => {
    const track = trackRef.current;
    if (!track || !hasMany) return;
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) setActive(Number((entry.target as HTMLElement).dataset.index));
        }
      },
      { root: track, threshold: 0.75 },
    );
    for (const slide of Array.from(track.children)) observer.observe(slide);
    return () => observer.disconnect();
  }, [hasMany]);

  // Only autoplay while the carousel is on screen and the tab is visible.
  useEffect(() => {
    const section = sectionRef.current;
    if (!section || !hasMany) return;
    const observer = new IntersectionObserver(([entry]) => setOnScreen(entry.isIntersecting), { threshold: 0.3 });
    observer.observe(section);
    const onVisibility = () => setPageVisible(document.visibilityState === "visible");
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      observer.disconnect();
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [hasMany]);

  // One timer per slide: any manual change (arrow, dot, swipe) restarts the countdown.
  useEffect(() => {
    if (!autoplay) return;
    const id = window.setTimeout(() => goTo(active + 1), INTERVAL_MS);
    return () => window.clearTimeout(id);
  }, [autoplay, active, goTo]);

  // Only keyboard focus pauses autoplay — clicking an arrow or dot with the mouse should not stop it.
  const onFocus = (event: FocusEvent<HTMLElement>) => setKeyboardFocus(event.target.matches(":focus-visible"));
  const onBlur = () => setKeyboardFocus(false);

  // A click on a peeking (inactive) banner brings it into view instead of following its link.
  const onSlideClick = (index: number) => (event: MouseEvent) => {
    if (index === active) return;
    event.preventDefault();
    goTo(index);
  };

  if (count === 0) return null;

  return (
    <section
      ref={sectionRef}
      aria-label={t.label}
      aria-roledescription="carousel"
      className="relative pt-2 pb-8 lg:pb-12"
    >
      <Container>
        <Reveal className="group/carousel relative" onFocus={onFocus} onBlur={onBlur}>
          <div
            ref={trackRef}
            onPointerDown={() => setTouching(true)}
            onPointerUp={() => setTouching(false)}
            onPointerCancel={() => setTouching(false)}
            onPointerLeave={() => setTouching(false)}
            className={cn(
              "relative no-scrollbar flex snap-x snap-mandatory overflow-x-auto overscroll-x-contain",
              hasMany && "gap-3 sm:gap-4",
            )}
          >
            {banners.map((banner, index) => {
              const isActive = index === active;
              return (
                <div
                  key={banner.id}
                  data-index={index}
                  role="group"
                  aria-roledescription="slide"
                  aria-label={interpolate(t.slide, { index: index + 1, total: count })}
                  onClickCapture={hasMany ? onSlideClick(index) : undefined}
                  className={cn(
                    "shrink-0 snap-start snap-always",
                    hasMany ? "w-[88%]" : "w-full",
                    hasMany && !isActive && "cursor-pointer",
                  )}
                >
                  <div
                    className={cn(
                      "transition-[opacity,transform] duration-500 ease-out",
                      hasMany && !isActive && "scale-[0.96] opacity-55 hover:opacity-80",
                    )}
                  >
                    <BannerLink banner={banner} focusable={!hasMany || isActive}>
                      <Image
                        src={banner.image}
                        alt={banner.alt[locale]}
                        placeholder={typeof banner.image === "string" ? "empty" : "blur"}
                        // Uploaded banners: the recommended 71:25 frame (object-cover crops the rest).
                        {...(typeof banner.image === "string" ? { width: 2130, height: 750 } : {})}
                        loading={index === 0 ? "eager" : "lazy"}
                        sizes={
                          hasMany
                            ? "(min-width: 1280px) 1070px, 88vw"
                            : "(min-width: 1280px) 1216px, (min-width: 640px) calc(100vw - 48px), calc(100vw - 32px)"
                        }
                        // Every slide shares one frame so the carousel height never jumps between banners.
                        className="aspect-[71/25] h-auto w-full rounded-[1.5rem] border border-brand-100 bg-brand-50 object-cover object-center shadow-xl shadow-brand-900/10 sm:rounded-[1.75rem]"
                      />
                    </BannerLink>
                  </div>
                </div>
              );
            })}
          </div>

          {hasMany ? (
            <>
              <ArrowButton side="left" label={t.previous} onClick={() => goTo(active - 1)} />
              <ArrowButton side="right" label={t.next} onClick={() => goTo(active + 1)} />

              <div className="mt-4 flex items-center justify-center gap-3">
                <button
                  type="button"
                  onClick={() => setUserPaused(!paused)}
                  aria-label={paused ? t.play : t.pause}
                  aria-pressed={!paused}
                  className="grid size-8 place-items-center rounded-full border border-brand-100 bg-white text-ink-700 transition-colors hover:border-brand-300 hover:text-ink-900"
                >
                  {paused ? (
                    <Play className="size-3.5 fill-current" aria-hidden="true" />
                  ) : (
                    <Pause className="size-3.5 fill-current" aria-hidden="true" />
                  )}
                </button>

                <div className="flex items-center gap-2">
                  {banners.map((banner, index) => {
                    const isActive = index === active;
                    return (
                      <button
                        key={banner.id}
                        type="button"
                        onClick={() => goTo(index)}
                        aria-label={interpolate(t.goTo, { index: index + 1 })}
                        aria-current={isActive ? "true" : undefined}
                        className={cn(
                          "relative h-2.5 overflow-hidden rounded-full transition-[width,background-color] duration-300",
                          isActive ? "w-10 bg-brand-100" : "w-2.5 bg-brand-200 hover:bg-brand-300",
                        )}
                      >
                        {isActive ? (
                          <span
                            key={active}
                            aria-hidden="true"
                            className="absolute inset-0 origin-left animate-banner-progress rounded-full bg-brand-500"
                            style={
                              {
                                "--banner-interval": `${INTERVAL_MS}ms`,
                                animationPlayState: autoplay ? "running" : "paused",
                              } as CSSProperties
                            }
                          />
                        ) : null}
                      </button>
                    );
                  })}
                </div>
              </div>
            </>
          ) : null}
        </Reveal>
      </Container>
    </section>
  );
}

function BannerLink({ banner, focusable, children }: { banner: Banner; focusable: boolean; children: ReactNode }) {
  const { locale } = useI18n();
  if (!banner.href) return <div>{children}</div>;
  const external = /^https?:\/\//.test(banner.href);
  return (
    <a
      href={banner.href.startsWith("/") ? localeHref(locale, banner.href) : banner.href}
      // Off-screen/peeking slides are skipped by Tab so keyboard users land on the visible banner.
      tabIndex={focusable ? undefined : -1}
      className="block rounded-[1.75rem]"
      {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
    >
      {children}
    </a>
  );
}

function ArrowButton({ side, label, onClick }: { side: "left" | "right"; label: string; onClick: () => void }) {
  const Icon = side === "left" ? ChevronLeft : ChevronRight;
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className={cn(
        "absolute top-[calc(50%-1.25rem)] hidden size-11 -translate-y-1/2 place-items-center rounded-full border border-brand-100 bg-white/90 text-ink-900 shadow-lg backdrop-blur transition-[opacity,transform] duration-200 hover:scale-105 focus-visible:opacity-100 sm:grid sm:opacity-70 sm:group-hover/carousel:opacity-100",
        side === "left" ? "left-3" : "right-3",
      )}
    >
      <Icon className="size-5" aria-hidden="true" />
    </button>
  );
}
