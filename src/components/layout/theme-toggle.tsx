"use client";

import { Moon, Sun } from "lucide-react";
import { useRef, useSyncExternalStore } from "react";
import { flushSync } from "react-dom";

import { useI18n } from "@/i18n/i18n-provider";
import { cn } from "@/lib/utils";

/**
 * Light / dark switch. The theme lives on <html data-theme> (set before paint by THEME_SCRIPT,
 * see app/[lang]/layout.tsx) and in localStorage; this button only flips it.
 *
 * The switch is drawn as a circle that grows from the button over the whole page (View
 * Transitions API). Browsers without it, and visitors who prefer reduced motion, get an instant switch.
 */

export type Theme = "light" | "dark";
export const THEME_KEY = "mb.theme";

/**
 * Runs in <head> before anything paints, so a dark-mode visitor never sees a white flash.
 * Light is the default (the client-approved look); only a saved choice switches to dark.
 */
export const THEME_SCRIPT = `(function(){try{if(localStorage.getItem(${JSON.stringify(THEME_KEY)})==="dark")document.documentElement.dataset.theme="dark"}catch(e){}})();`;

const readTheme = (): Theme => (document.documentElement.dataset.theme === "dark" ? "dark" : "light");

function subscribe(onChange: () => void) {
  const observer = new MutationObserver(onChange);
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
  return () => observer.disconnect();
}

function applyTheme(theme: Theme) {
  const root = document.documentElement;
  if (theme === "dark") root.dataset.theme = "dark";
  else delete root.dataset.theme;
  try {
    localStorage.setItem(THEME_KEY, theme);
  } catch {
    // Storage blocked: the switch still works for this visit.
  }
}

/** The store's switch (texts from the dictionary). */
export function ThemeToggle({ className }: { className?: string }) {
  const { dict } = useI18n();
  return <ThemeButton labels={dict.theme} className={className} />;
}

/** The switch itself; the admin panel (no dictionary) passes its own texts. */
export function ThemeButton({
  labels: t,
  className,
}: {
  labels: { toDark: string; toLight: string };
  className?: string;
}) {
  // "light" on the server and during hydration, then the real value.
  const theme = useSyncExternalStore(subscribe, readTheme, () => "light" as Theme);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const next: Theme = theme === "dark" ? "light" : "dark";

  const toggle = () => {
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!document.startViewTransition || reduceMotion) return applyTheme(next);

    // The circle starts at the button and ends past the farthest corner of the screen.
    const rect = buttonRef.current?.getBoundingClientRect();
    const x = rect ? rect.left + rect.width / 2 : window.innerWidth / 2;
    const y = rect ? rect.top + rect.height / 2 : 0;
    const radius = Math.hypot(Math.max(x, window.innerWidth - x), Math.max(y, window.innerHeight - y));

    // Pause the page's own colour transitions so everything inside the circle is already final.
    const root = document.documentElement;
    root.dataset.themeSwitching = "";
    const transition = document.startViewTransition(() => flushSync(() => applyTheme(next)));
    void transition.finished.finally(() => delete root.dataset.themeSwitching);
    transition.ready
      .then(() => {
        document.documentElement.animate(
          { clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${radius}px at ${x}px ${y}px)`] },
          { duration: 750, easing: "cubic-bezier(0.65, 0, 0.35, 1)", pseudoElement: "::view-transition-new(root)" },
        );
      })
      .catch(() => undefined);
  };

  return (
    <button
      ref={buttonRef}
      type="button"
      onClick={toggle}
      aria-label={next === "dark" ? t.toDark : t.toLight}
      title={next === "dark" ? t.toDark : t.toLight}
      className={cn(
        "relative grid size-10 shrink-0 place-items-center overflow-hidden rounded-xl border border-brand-100 bg-white/70 text-ink-900 backdrop-blur transition-[background-color,border-color,transform] duration-200 hover:border-brand-300 active:scale-[0.94]",
        className,
      )}
    >
      {/* Both icons stay mounted and swap with a small turn, so the button never jumps. */}
      <Sun
        aria-hidden="true"
        className={cn(
          "absolute size-[18px] text-brand-600 transition-[transform,opacity] duration-500",
          theme === "dark" ? "scale-50 -rotate-90 opacity-0" : "scale-100 rotate-0 opacity-100",
        )}
      />
      <Moon
        aria-hidden="true"
        className={cn(
          "absolute size-[18px] text-brand-700 transition-[transform,opacity] duration-500",
          theme === "dark" ? "scale-100 rotate-0 opacity-100" : "scale-50 rotate-90 opacity-0",
        )}
      />
    </button>
  );
}
