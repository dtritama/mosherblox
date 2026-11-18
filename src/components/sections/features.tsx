import { BadgePercent, Headphones, ShieldCheck, Zap, type LucideIcon } from "lucide-react";

import { Container } from "@/components/ui/container";
import { Stagger, StaggerItem } from "@/components/ui/reveal";
import { SectionHeading } from "@/components/ui/section-heading";
import { SpotlightCard } from "@/components/ui/spotlight-card";
import { paymentMethods } from "@/data/payments";
import { getI18n } from "@/i18n/get-dictionary";
import { cn } from "@/lib/utils";

/** Icons in the same order as `dict.features.items`. */
const ICONS: readonly LucideIcon[] = [ShieldCheck, BadgePercent, Zap, Headphones];

export async function Features() {
  const { dict } = await getI18n();
  const t = dict.features;

  return (
    <section id="why" aria-labelledby="why-title" className="py-14 lg:py-20">
      <Container>
        <SectionHeading
          id="why-title"
          align="center"
          eyebrow={t.eyebrow}
          title={
            <>
              {t.titleStart} <span className="text-highlight">{t.titleHighlight}</span>
            </>
          }
          description={t.description}
        />

        <Stagger className="mt-10 grid gap-4 md:grid-cols-2 lg:grid-cols-4 lg:grid-rows-2">
          {t.items.map((feature, index) => {
            const Icon = ICONS[index] ?? ShieldCheck;
            const highlight = index === 0;
            return (
              <StaggerItem key={feature.title} className={cn(highlight && "md:col-span-2 lg:row-span-2")}>
                <SpotlightCard
                  className={cn(
                    "flex h-full flex-col rounded-3xl border p-6 transition-transform duration-300 hover:-translate-y-1",
                    highlight
                      ? "border-transparent bg-linear-to-br from-brand-200 via-brand-100 to-brand-50 sm:p-8"
                      : "border-brand-100 bg-white",
                  )}
                >
                  <span
                    className={cn(
                      "relative grid size-12 place-items-center rounded-2xl",
                      highlight ? "bg-white text-brand-700 shadow-sm" : "bg-brand-50 text-brand-600",
                    )}
                  >
                    <Icon className="size-6" aria-hidden="true" />
                  </span>
                  <h3
                    className={cn(
                      "relative mt-5 font-bold text-ink-900",
                      highlight ? "text-2xl sm:text-3xl" : "text-lg",
                    )}
                  >
                    {feature.title}
                  </h3>
                  <p
                    className={cn(
                      "relative mt-2 text-sm sm:text-base",
                      highlight ? "max-w-sm text-ink-700" : "text-ink-500",
                    )}
                  >
                    {feature.description}
                  </p>
                  {highlight ? <SafetyChecklist items={t.checklist} /> : null}
                </SpotlightCard>
              </StaggerItem>
            );
          })}
          <StaggerItem className="md:col-span-2 lg:col-span-1">
            <div className="flex h-full flex-col justify-between rounded-3xl bg-brand-100 p-6">
              <p className="text-sm font-medium text-brand-800">{t.waysToPay}</p>
              <p className="mt-4 text-5xl font-extrabold text-brand-600">{paymentMethods.length}</p>
              <p className="mt-2 text-sm text-brand-900/70">{t.waysToPayDescription}</p>
            </div>
          </StaggerItem>
        </Stagger>
      </Container>
    </section>
  );
}

function SafetyChecklist({ items }: { items: readonly string[] }) {
  return (
    <ul className="relative mt-auto grid gap-2 pt-8">
      {items.map((item) => (
        <li
          key={item}
          className="flex items-center justify-between rounded-xl bg-white/70 px-4 py-3 text-sm font-medium text-ink-900"
        >
          {item}
          <span
            className="grid size-6 place-items-center rounded-full bg-brand-400 text-xs text-ink-900"
            aria-hidden="true"
          >
            ✓
          </span>
        </li>
      ))}
    </ul>
  );
}
