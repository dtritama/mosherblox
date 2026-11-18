/**
 * Locale configuration — the single place to add or remove a language.
 * Bahasa Indonesia is the default; English is the secondary locale.
 */
export const locales = ["id", "en"] as const;
export type Locale = (typeof locales)[number];

export const defaultLocale: Locale = "id";

/** Cookie that remembers the visitor's language choice (read by `src/proxy.ts`). */
export const LOCALE_COOKIE = "NEXT_LOCALE";

/** BCP-47 tags used for `Intl` formatting. */
export const intlLocales: Record<Locale, string> = {
  id: "id-ID",
  en: "en-US",
};

/** Open Graph locale codes. */
export const ogLocales: Record<Locale, string> = {
  id: "id_ID",
  en: "en_US",
};

export function hasLocale(value: string): value is Locale {
  return (locales as readonly string[]).includes(value);
}

/** Text that differs per locale (used by product data). */
export type LocalizedText = Record<Locale, string>;

export function localize(text: LocalizedText, locale: Locale) {
  return text[locale];
}

/**
 * Build a locale-prefixed URL from a path relative to the locale root:
 * localeHref("id", "#robux") → "/id#robux", localeHref("en", "/gamepass") → "/en/gamepass".
 */
export function localeHref(locale: Locale, path = "") {
  return `/${locale}${path}`;
}
