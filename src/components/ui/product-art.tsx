import { Apple, Crown, Egg, Gem, Gift, House, Sparkles, Sprout, Sword, Target, type LucideProps } from "lucide-react";

import { RobuxIcon } from "@/components/ui/robux-icon";
import type { ComponentType } from "react";

import { cn } from "@/lib/utils";
import type { ProductIcon as ProductIconName } from "@/types";

const ICONS: Record<ProductIconName, ComponentType<LucideProps>> = {
  coins: RobuxIcon,
  crown: Crown,
  gift: Gift,
  apple: Apple,
  sprout: Sprout,
  egg: Egg,
  gem: Gem,
  sparkles: Sparkles,
  sword: Sword,
  house: House,
  target: Target,
};

export function ProductIcon({ name, ...props }: { name: ProductIconName } & LucideProps) {
  const Icon = ICONS[name];
  return <Icon aria-hidden="true" {...props} />;
}

/** Soft gradient cover art generated from the product's accent colours — no external images needed. */
export function ProductArt({
  icon,
  accent,
  className,
  iconClassName,
}: {
  icon: ProductIconName;
  accent: readonly [string, string];
  className?: string;
  iconClassName?: string;
}) {
  return (
    <div
      className={cn("relative isolate overflow-hidden", className)}
      style={{ backgroundImage: `linear-gradient(135deg, ${accent[0]}, ${accent[1]})` }}
    >
      {/* Soft "blox" pattern */}
      <div
        aria-hidden="true"
        className="absolute inset-0 [background-image:radial-gradient(rgb(255_255_255/0.9)_1.5px,transparent_1.5px)] [background-size:18px_18px] opacity-30"
      />
      <div aria-hidden="true" className="absolute -right-6 -bottom-6 size-24 rotate-12 rounded-3xl bg-white/20" />
      <div aria-hidden="true" className="absolute -top-4 -left-4 size-14 -rotate-12 rounded-2xl bg-white/20" />
      <ProductIcon
        name={icon}
        className={iconClassName ?? "relative size-10 text-white drop-shadow-md"}
        strokeWidth={1.75}
      />
    </div>
  );
}
