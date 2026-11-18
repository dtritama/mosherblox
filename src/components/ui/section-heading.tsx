import type { ReactNode } from "react";

import { Reveal } from "@/components/ui/reveal";
import { siteConfig } from "@/config/site";
import { cn } from "@/lib/utils";

interface SectionHeadingProps {
  eyebrow: string;
  title: ReactNode;
  description?: ReactNode;
  align?: "left" | "center";
  /** Eyebrow pill colour. */
  accent?: "green" | "pink";
  className?: string;
  id?: string;
  /** Use "h1" when the heading is the page title (e.g. on sub-pages). */
  as?: "h1" | "h2";
}

export function SectionHeading({
  eyebrow,
  title,
  description,
  align = "left",
  accent = "green",
  className,
  id,
  as: Heading = "h2",
}: SectionHeadingProps) {
  return (
    <Reveal className={cn("max-w-2xl", align === "center" && "mx-auto text-center", className)}>
      {siteConfig.ui.showEyebrows ? (
        <span
          className={cn(
            "inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold tracking-wider uppercase",
            accent === "pink" ? "bg-blush-100 text-blush-700" : "bg-brand-100 text-brand-700",
          )}
        >
          <span className="size-1.5 rounded-full bg-current" />
          {eyebrow}
        </span>
      ) : null}
      <Heading
        id={id}
        className={cn(
          "text-3xl font-bold tracking-tight text-balance text-ink-900 sm:text-4xl lg:text-[2.75rem] lg:leading-[1.1]",
          siteConfig.ui.showEyebrows && "mt-3",
        )}
      >
        {title}
      </Heading>
      {description ? <p className="mt-3 text-base text-pretty text-ink-500 sm:text-lg">{description}</p> : null}
    </Reveal>
  );
}
