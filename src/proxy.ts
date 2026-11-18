import { NextResponse, type NextRequest } from "next/server";

import { gamepassGames } from "@/data/gamepasses";
import { LOCALE_COOKIE, defaultLocale, hasLocale } from "@/i18n/config";

const gamepassSlugs = new Set(gamepassGames.map((game) => game.slug));

/**
 * 1. Locale routing: every page lives under /id or /en. A path without a locale (e.g. "/") is
 *    redirected to the visitor's saved language (cookie set by the switcher) or Bahasa Indonesia.
 * 2. Unknown games (/id/gamepass/does-not-exist) are rewritten to the catch-all route so they
 *    return a real 404 status instead of a streamed 200 page.
 */
export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const [, firstSegment = "", section, slug, ...rest] = pathname.split("/");

  if (hasLocale(firstSegment)) {
    if (section === "gamepass" && slug && (rest.length > 0 || !gamepassSlugs.has(slug))) {
      return NextResponse.rewrite(new URL(`/${firstSegment}/not-found`, request.url));
    }
    return NextResponse.next();
  }

  const saved = request.cookies.get(LOCALE_COOKIE)?.value ?? "";
  const locale = hasLocale(saved) ? saved : defaultLocale;
  const url = request.nextUrl.clone();
  url.pathname = `/${locale}${pathname === "/" ? "" : pathname}`;
  url.search = search;
  return NextResponse.redirect(url);
}

export const config = {
  // Skip Next internals, API routes and any file with an extension (icon.png, robots.txt, sitemap.xml, fonts…).
  matcher: ["/((?!_next|api|.*\\..*).*)"],
};
