import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/** Merge Tailwind classes safely (later classes win over conflicting earlier ones). */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function discountPercent(price: number, originalPrice: number) {
  if (originalPrice <= 0) return 0;
  return Math.round((1 - price / originalPrice) * 100);
}

/** Lower-case, accent-free string for forgiving search matching. */
export function normalize(value: string) {
  return value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .trim();
}
