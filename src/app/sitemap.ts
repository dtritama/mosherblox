import type { MetadataRoute } from "next";

import { siteConfig } from "@/config/site";
import { gamepassGames } from "@/data/gamepasses";
import { localeHref, locales } from "@/i18n/config";

const paths = ["", "/robux", "/check-order", "/gamepass", ...gamepassGames.map((game) => `/gamepass/${game.slug}`)];

export default function sitemap(): MetadataRoute.Sitemap {
  return paths.flatMap((path) => {
    const languages = Object.fromEntries(
      locales.map((locale) => [locale, `${siteConfig.url}${localeHref(locale, path)}`]),
    );
    return locales.map((locale) => ({
      url: `${siteConfig.url}${localeHref(locale, path)}`,
      changeFrequency: "weekly" as const,
      priority: path === "" ? 1 : 0.8,
      alternates: { languages },
    }));
  });
}
