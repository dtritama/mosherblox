import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

/**
 * One "frame" of the design kit. Each frame becomes its own top-level frame
 * when the page is imported into Figma with html.to.design.
 */
export function KitFrame({
  id,
  title,
  description,
  children,
  className,
}: {
  id: string;
  title: string;
  description?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      id={id}
      aria-labelledby={`${id}-title`}
      className="scroll-mt-24 rounded-[2rem] border border-brand-100 bg-white p-6 shadow-[0_10px_40px_-25px_rgb(23_32_12/0.25)] sm:p-10"
    >
      <header className="mb-8 border-b border-dashed border-brand-200 pb-5">
        <h2 id={`${id}-title`} className="text-2xl font-bold tracking-tight text-ink-900">
          {title}
        </h2>
        {description ? <p className="mt-1 max-w-2xl text-sm text-ink-500">{description}</p> : null}
      </header>
      <div className={cn("grid gap-10", className)}>{children}</div>
    </section>
  );
}

/** A labelled group inside a frame (e.g. "Variants", "Sizes"). */
export function KitGroup({ label, children, className }: { label: string; children: ReactNode; className?: string }) {
  return (
    <div>
      <p className="mb-3 text-xs font-semibold tracking-wider text-ink-500 uppercase">{label}</p>
      <div className={className}>{children}</div>
    </div>
  );
}

/** Small caption under a specimen (token name, size, usage). */
export function KitNote({ children }: { children: ReactNode }) {
  return <p className="mt-2 font-mono text-[11px] leading-tight text-ink-500">{children}</p>;
}
