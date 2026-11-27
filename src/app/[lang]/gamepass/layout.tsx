import { GameGrid } from "@/components/gamepass/game-grid";
import { Container } from "@/components/ui/container";
import { SectionHeading } from "@/components/ui/section-heading";
import { getI18n } from "@/i18n/get-dictionary";

/**
 * Shared layout for /gamepass and /gamepass/[game]: the game picker stays mounted
 * while only the gamepass list below it changes.
 */
export default async function GamepassLayout({ children }: LayoutProps<"/[lang]/gamepass">) {
  const { dict } = await getI18n();
  const t = dict.gamepass;

  return (
    <div className="relative isolate overflow-hidden pt-24 pb-14 lg:pt-32 lg:pb-20">
      <div aria-hidden="true" className="absolute inset-x-0 top-0 -z-10 h-[38rem]">
        <div className="absolute inset-0 bg-grid mask-[radial-gradient(ellipse_at_top,black_30%,transparent_75%)]" />
        <div className="absolute -top-32 -right-24 size-[30rem] rounded-full bg-brand-200/40 blur-3xl dark:bg-brand-200/70 dark:opacity-30" />
        <div className="absolute top-10 -left-40 size-[24rem] rounded-full bg-blush-100/40 blur-3xl dark:bg-blush-100/70 dark:opacity-30" />
      </div>

      <Container>
        <section id="games" aria-labelledby="games-title">
          <SectionHeading
            as="h1"
            id="games-title"
            eyebrow={t.eyebrow}
            title={
              <>
                {t.titleStart} <span className="text-highlight">{t.titleHighlight}</span>
              </>
            }
            description={t.description}
          />
          <GameGrid />
        </section>

        <div className="mt-10 lg:mt-14">{children}</div>
      </Container>
    </div>
  );
}
