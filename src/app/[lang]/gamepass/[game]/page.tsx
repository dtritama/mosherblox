import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import { GamepassList } from "@/components/gamepass/gamepass-list";
import { GamepassListSkeleton } from "@/components/gamepass/gamepass-list-skeleton";
import { gamepassGames } from "@/data/gamepasses";
import { interpolate } from "@/i18n/format";
import { getI18n } from "@/i18n/get-dictionary";
import { localeAlternates } from "@/i18n/metadata";
import { getGamepassGame } from "@/lib/catalog";

type Params = PageProps<"/[lang]/gamepass/[game]">["params"];

/** Pre-render one static page per game (per locale): /id/gamepass/blox-fruits, /en/gamepass/blox-fruits… */
export function generateStaticParams() {
  return gamepassGames.map((game) => ({ game: game.slug }));
}

export async function generateMetadata({ params }: PageProps<"/[lang]/gamepass/[game]">): Promise<Metadata> {
  const { game: slug } = await params;
  const game = getGamepassGame(slug);
  if (!game) return {};
  const { locale, dict } = await getI18n();
  return {
    title: interpolate(dict.gamepass.metaGameTitle, { game: game.name }),
    description: interpolate(dict.gamepass.metaGameDescription, { game: game.name }),
    alternates: localeAlternates(locale, `/gamepass/${game.slug}`),
  };
}

/**
 * Instant navigation: reading `params` (URL data) happens inside <Suspense>, so switching games
 * can render the skeleton immediately instead of blocking. The game cards also use
 * `prefetch={true}`, so in practice the real list is usually ready before the click.
 */
export default function GamepassGamePage({ params }: PageProps<"/[lang]/gamepass/[game]">) {
  return (
    <Suspense fallback={<GamepassListSkeleton />}>
      <GameGamepasses params={params} />
    </Suspense>
  );
}

async function GameGamepasses({ params }: { params: Params }) {
  const { game: slug } = await params;
  if (!getGamepassGame(slug)) notFound();
  return <GamepassList slug={slug} />;
}
