import type { Metadata } from "next";

import { defaultLocale, localeHref, locales, type Locale } from "@/i18n/config";

/** canonical + hreflang alternates for a path relative to the locale root ("" = home, "/gamepass", …). */
export function localeAlternates(locale: Locale, path = ""): Metadata["alternates"] {
  return {
    canonical: localeHref(locale, path),
    languages: {
      ...Object.fromEntries(locales.map((item) => [item, localeHref(item, path)])),
      "x-default": localeHref(defaultLocale, path),
    },
  };
}
