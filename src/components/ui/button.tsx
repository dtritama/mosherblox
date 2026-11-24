import type { ComponentProps } from "react";

import { cn } from "@/lib/utils";

const base =
  "group/btn relative inline-flex items-center justify-center gap-2 overflow-hidden rounded-2xl font-semibold whitespace-nowrap transition-[transform,background-color,box-shadow,color,border-color] duration-200 active:scale-[0.97] disabled:pointer-events-none disabled:opacity-50";

const variants = {
  primary: "bg-brand-400 text-coal shadow-lg shadow-brand-500/30 hover:bg-brand-300 hover:shadow-brand-400/40",
  // Dark mode: solid pink with fixed dark text (blush-200/900 flip there, blush-300/400 don't).
  pink: "bg-blush-200 text-blush-900 shadow-lg shadow-blush-300/40 hover:bg-blush-300 dark:bg-blush-400 dark:text-coal dark:shadow-blush-500/20 dark:hover:bg-blush-300",
  soft: "bg-brand-100 text-brand-800 hover:bg-brand-200",
  outline: "border border-brand-200 bg-white/80 text-ink-900 backdrop-blur hover:border-blush-300 hover:bg-white",
  ghost: "text-ink-700 hover:bg-brand-50 hover:text-brand-700",
  light: "bg-white text-brand-800 shadow-lg shadow-brand-900/10 hover:bg-brand-50",
} as const;

const sizes = {
  sm: "h-9 px-4 text-sm",
  md: "h-11 px-5 text-sm",
  lg: "h-13 px-7 text-base",
} as const;

export type ButtonVariant = keyof typeof variants;
export type ButtonSize = keyof typeof sizes;

export function buttonVariants({
  variant = "primary",
  size = "md",
  className,
}: { variant?: ButtonVariant; size?: ButtonSize; className?: string } = {}) {
  return cn(base, variants[variant], sizes[size], className);
}

type ButtonProps = ComponentProps<"button"> & { variant?: ButtonVariant; size?: ButtonSize };

export function Button({ variant, size, className, type = "button", ...props }: ButtonProps) {
  return <button type={type} className={buttonVariants({ variant, size, className })} {...props} />;
}

type ButtonLinkProps = ComponentProps<"a"> & { variant?: ButtonVariant; size?: ButtonSize };

/** Anchor styled as a button — for same-page section links. */
export function ButtonLink({ variant, size, className, ...props }: ButtonLinkProps) {
  return <a className={buttonVariants({ variant, size, className })} {...props} />;
}
