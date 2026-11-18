import type { Metadata } from "next";

import { SelectGamePrompt } from "@/components/gamepass/select-game-prompt";
import { getI18n } from "@/i18n/get-dictionary";
import { localeAlternates } from "@/i18n/metadata";

export async function generateMetadata(): Promise<Metadata> {
  const { locale, dict } = await getI18n();
  return {
    title: dict.gamepass.metaTitle,
    description: dict.gamepass.metaDescription,
    alternates: localeAlternates(locale, "/gamepass"),
  };
}

export default function GamepassIndexPage() {
  return <SelectGamePrompt />;
}
