import { notFound } from "next/navigation";
import { lang } from "next/root-params";

import { hasLocale, type Locale } from "@/i18n/config";
import { en } from "@/i18n/dictionaries/en";
import { id, type Dictionary } from "@/i18n/dictionaries/id";

const dictionaries: Record<Locale, Dictionary> = { id, en };

export function getDictionaryFor(locale: Locale): Dictionary {
  return dictionaries[locale];
}

/**
 * Server-only: resolves the current locale from the `[lang]` root param.
 * Server Components can call this without prop drilling. (next/root-params fails the build
 * if imported into a Client Component — those use `useI18n()` instead.)
 */
export async function getI18n() {
  // undefined outside the [lang] tree (e.g. the /admin root layout).
  const locale = (await lang()) ?? "";
  if (!hasLocale(locale)) notFound();
  return { locale, dict: dictionaries[locale] };
}
