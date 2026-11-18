"use client";

import { createContext, use, useMemo, type ReactNode } from "react";

import type { Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/dictionaries/id";

interface I18nContextValue {
  locale: Locale;
  dict: Dictionary;
}

const I18nContext = createContext<I18nContextValue | null>(null);

/** Makes the current locale + dictionary available to Client Components. */
export function I18nProvider({ locale, dict, children }: I18nContextValue & { children: ReactNode }) {
  const value = useMemo(() => ({ locale, dict }), [locale, dict]);
  return <I18nContext value={value}>{children}</I18nContext>;
}

export function useI18n() {
  const context = use(I18nContext);
  if (!context) throw new Error("useI18n must be used inside <I18nProvider>");
  return context;
}
