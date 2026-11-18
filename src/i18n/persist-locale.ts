import { LOCALE_COOKIE, type Locale } from "@/i18n/config";

const ONE_YEAR_IN_SECONDS = 60 * 60 * 24 * 365;

/** Remember the visitor's language so `src/proxy.ts` redirects "/" to it next time. */
export function persistLocale(locale: Locale) {
  document.cookie = `${LOCALE_COOKIE}=${locale}; path=/; max-age=${ONE_YEAR_IN_SECONDS}; samesite=lax`;
}
