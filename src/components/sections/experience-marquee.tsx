import { Heart, Sparkle } from "lucide-react";

import { experiences } from "@/data/products";
import { getI18n } from "@/i18n/get-dictionary";
import { cn } from "@/lib/utils";

/** Pure CSS marquee (GPU transform) — zero JavaScript. */
function Track({
  items,
  reverse = false,
  icon,
}: {
  items: readonly string[];
  reverse?: boolean;
  icon: "sparkle" | "heart";
}) {
  const Icon = icon === "heart" ? Heart : Sparkle;
  return (
    <div className="flex overflow-hidden mask-[linear-gradient(to_right,transparent,black_8%,black_92%,transparent)]">
      <div
        className={cn(
          "flex w-max shrink-0 animate-marquee items-center hover:[animation-play-state:paused]",
          reverse && "[animation-direction:reverse]",
        )}
      >
        {[0, 1].map((copy) => (
          <ul key={copy} aria-hidden={copy === 1 ? true : undefined} className="flex shrink-0 items-center">
            {items.map((name) => (
              <li key={name} className="flex items-center gap-6 px-3 whitespace-nowrap">
                <span>{name}</span>
                <Icon className={cn("size-4", icon === "heart" ? "text-blush-400" : "opacity-70")} aria-hidden="true" />
              </li>
            ))}
          </ul>
        ))}
      </div>
    </div>
  );
}

export async function ExperienceMarquee() {
  const { dict } = await getI18n();
  return (
    <section aria-label={dict.marquee.label} className="relative -rotate-1 py-4">
      <div className="bg-brand-200 py-3 text-lg font-bold text-brand-900 shadow-lg shadow-brand-300/30 sm:text-xl">
        <Track items={experiences} icon="sparkle" />
      </div>
      <div className="mt-2 rotate-2 border-y border-brand-100 bg-white py-2.5 text-sm font-semibold text-brand-800 sm:text-base">
        <Track items={dict.marquee.perks} reverse icon="heart" />
      </div>
    </section>
  );
}
