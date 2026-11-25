import { LeaderboardTabs } from "@/components/sections/leaderboard-tabs";
import { RobuxSold } from "@/components/sections/robux-sold";
import { Container } from "@/components/ui/container";
import { SectionHeading } from "@/components/ui/section-heading";
import { getI18n } from "@/i18n/get-dictionary";
import { LEADERBOARD_CATEGORIES } from "@/lib/leaderboard";
import { getLeaderboard } from "@/server/leaderboard";
import { getPublicStats } from "@/server/stats";

/** All-time top buyers per category (completed orders). Hidden until there is at least one. */
export async function LeaderboardSection() {
  const { dict } = await getI18n();
  const t = dict.leaderboard;
  const [data, { robuxSold }] = await Promise.all([getLeaderboard(), getPublicStats()]);
  if (LEADERBOARD_CATEGORIES.every((category) => data[category].length === 0)) return null;

  return (
    <section id="leaderboard" aria-labelledby="leaderboard-title" className="py-14 lg:py-20">
      <Container className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
        <div className="flex min-w-0 flex-col gap-8">
          <SectionHeading
            id="leaderboard-title"
            eyebrow={t.eyebrow}
            title={
              <>
                {t.titleStart} <span className="text-highlight">{t.titleHighlight}</span>
              </>
            }
            description={t.description}
          />
          {robuxSold && robuxSold.total > 0 ? <RobuxSold total={robuxSold.total} orders={robuxSold.orders} /> : null}
        </div>
        <LeaderboardTabs data={data} />
      </Container>
    </section>
  );
}
