import { intlLocales, type Locale } from "@/i18n/config";

/**
 * Tiny template helper: interpolate("Buy {amount} Robux", { amount: "1,000" }).
 * Dictionaries stay plain JSON-like data (serialisable to client components).
 */
export function interpolate(template: string, values: Record<string, string | number>) {
  return template.replace(/\{(\w+)\}/g, (match, key: string) => (key in values ? String(values[key]) : match));
}

const numberFormatters = new Map<Locale, Intl.NumberFormat>();

/** Locale-aware number formatting: 1.000 (id) / 1,000 (en). Formatters are cached. */
export function formatNumber(value: number, locale: Locale) {
  let formatter = numberFormatters.get(locale);
  if (!formatter) {
    formatter = new Intl.NumberFormat(intlLocales[locale]);
    numberFormatters.set(locale, formatter);
  }
  return formatter.format(value);
}

const idrFormatter = new Intl.NumberFormat("id-ID", {
  style: "currency",
  currency: "IDR",
  maximumFractionDigits: 0,
});

/** Prices are always Rupiah, so they always use Indonesian formatting (Rp 118.000). */
export function formatIDR(value: number) {
  return idrFormatter.format(value);
}
