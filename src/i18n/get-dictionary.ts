import { notFound } from "next/navigation";
import { lang } from "next/root-params";

import { hasLocale, type Locale } from "@/i18n/config";
import { en } from "@/i18n/dictionaries/en";
import { id, type Dictionary } from "@/i18n/dictionaries/id";
import { applyContent } from "@/lib/site-content";
import { getSiteContent } from "@/server/site-content";

const dictionaries: Record<Locale, Dictionary> = { id, en };

/** Built-in copy only (metadata). Pages use the edited copy below. */
export function getDictionaryFor(locale: Locale): Dictionary {
  return dictionaries[locale];
}

/** Built-in copy with the owner's /admin/content edits laid over it. */
export async function getContentDictionary(locale: Locale): Promise<Dictionary> {
  return applyContent(dictionaries[locale], await getSiteContent(), locale);
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
  return { locale, dict: await getContentDictionary(locale) };
}
