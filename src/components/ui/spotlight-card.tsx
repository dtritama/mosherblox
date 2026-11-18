"use client";

import { useCallback, type ComponentProps, type PointerEvent } from "react";

import { cn } from "@/lib/utils";

/**
 * Card with a cursor-following glow. Updates CSS variables directly on the
 * element, so moving the mouse never triggers a React re-render.
 */
export function SpotlightCard({ className, children, ...props }: ComponentProps<"div">) {
  const handleMove = useCallback((event: PointerEvent<HTMLDivElement>) => {
    if (event.pointerType !== "mouse") return;
    const el = event.currentTarget;
    const rect = el.getBoundingClientRect();
    el.style.setProperty("--spot-x", `${event.clientX - rect.left}px`);
    el.style.setProperty("--spot-y", `${event.clientY - rect.top}px`);
  }, []);

  return (
    <div onPointerMove={handleMove} className={cn("group relative overflow-hidden", className)} {...props}>
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 spotlight opacity-0 transition-opacity duration-300 group-hover:opacity-100"
      />
      {children}
    </div>
  );
}
