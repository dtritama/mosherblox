"use client";

import { AnimatePresence, m, useMotionValueEvent, useScroll } from "motion/react";
import { ArrowUp } from "lucide-react";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

import { useI18n } from "@/i18n/i18n-provider";
import { cn } from "@/lib/utils";

/**
 * True while the Robux panel is on screen. Below `lg` the panel has its own sticky buy bar
 * at the bottom, so the floating button steps aside instead of covering it.
 */
function useRobuxPanelInView() {
  const pathname = usePathname();
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const panel = document.getElementById("robux-panel");
    if (!panel) return;
    const observer = new IntersectionObserver(([entry]) => setInView(entry.isIntersecting));
    observer.observe(panel);
    return () => {
      observer.disconnect();
      setInView(false);
    };
  }, [pathname]);
  return inView;
}

export function BackToTop() {
  const { dict } = useI18n();
  const { scrollY } = useScroll();
  const [visible, setVisible] = useState(false);
  const robuxInView = useRobuxPanelInView();

  useMotionValueEvent(scrollY, "change", (y) => {
    const next = y > 700;
    setVisible((prev) => (prev === next ? prev : next));
  });

  return (
    <AnimatePresence>
      {visible ? (
        <m.button
          type="button"
          // Respects the CSS `scroll-behavior` (smooth, or instant for reduced motion).
          onClick={() => window.scrollTo({ top: 0 })}
          aria-label={dict.common.backToTop}
          initial={{ opacity: 0, scale: 0.6, y: 16 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.6, y: 16 }}
          whileHover={{ y: -3 }}
          className={cn(
            "fixed right-4 bottom-4 z-40 grid size-12 place-items-center rounded-2xl bg-brand-400 text-coal shadow-xl shadow-brand-500/30 sm:right-6 sm:bottom-6",
            robuxInView && "max-lg:hidden",
          )}
        >
          <ArrowUp className="size-5" aria-hidden="true" />
        </m.button>
      ) : null}
    </AnimatePresence>
  );
}
