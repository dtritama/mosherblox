"use client";

import { Languages } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useTransition } from "react";

import { locales, type Locale } from "@/i18n/config";
import { interpolate } from "@/i18n/format";
import { useI18n } from "@/i18n/i18n-provider";
import { persistLocale } from "@/i18n/persist-locale";
import { cn } from "@/lib/utils";

/**
 * ID / EN toggle. Remembers the choice in a cookie (so "/" redirects to it next time)
 * and swaps the locale segment while keeping the current section (#hash) and scroll position.
 */
export function LanguageSwitcher({ className }: { className?: string }) {
  const { locale, dict } = useI18n();
  const router = useRouter();
  const pathname = usePathname();
  const [isPending, startTransition] = useTransition();

  const switchTo = (next: Locale) => {
    if (next === locale) return;
    persistLocale(next);
    const rest = pathname.replace(/^\/[^/]+/, "");
    startTransition(() => {
      router.replace(`/${next}${rest}${window.location.hash}`, { scroll: false });
    });
  };

  return (
    <div
      role="group"
      aria-label={dict.language.label}
      className={cn(
        "relative flex items-center rounded-full border border-brand-100 bg-white/70 p-1 backdrop-blur transition-opacity",
        isPending && "opacity-60",
        className,
      )}
    >
      <Languages className="mx-1.5 size-4 text-brand-600" aria-hidden="true" />
      {locales.map((item) => {
        const active = item === locale;
        return (
          <button
            key={item}
            type="button"
            lang={item}
            aria-pressed={active}
            aria-label={interpolate(dict.language.switchTo, { language: dict.language.names[item] })}
            onClick={() => switchTo(item)}
            className={cn(
              "rounded-full px-2.5 py-1 text-xs font-bold uppercase transition-[background-color,color] duration-200",
              active ? "bg-brand-100 text-brand-800" : "text-ink-500 hover:text-ink-900",
            )}
          >
            {item}
          </button>
        );
      })}
    </div>
  );
}
