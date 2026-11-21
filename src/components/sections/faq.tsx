"use client";

import { AnimatePresence, m } from "motion/react";
import { ArrowUpRight, Plus } from "lucide-react";
import { useId, useMemo, useState } from "react";

import { Container } from "@/components/ui/container";
import { ContactIcon } from "@/components/ui/contact-icon";
import { Reveal } from "@/components/ui/reveal";
import { SectionHeading } from "@/components/ui/section-heading";
import { useI18n } from "@/i18n/i18n-provider";
import { getContactChannels, type ContactChannelId } from "@/lib/contact";
import { cn } from "@/lib/utils";

const CHANNEL_STYLES: Record<ContactChannelId, string> = {
  whatsapp: "bg-brand-400 text-coal",
  discord: "bg-[#5865F2] text-snow",
  whatsappGroup: "bg-blush-100 text-blush-700",
};

export function Faq() {
  const { dict } = useI18n();
  const t = dict.faq;
  const channels = useMemo(() => getContactChannels(dict), [dict]);
  const [openIndex, setOpenIndex] = useState<number | null>(0);
  const baseId = useId();

  return (
    <section id="faq" aria-labelledby="faq-title" className="py-14 lg:py-20">
      <Container className="grid gap-10 lg:grid-cols-[1fr_1.4fr]">
        <div>
          <SectionHeading
            id="faq-title"
            eyebrow={t.eyebrow}
            title={
              <>
                {t.titleStart} <span className="text-highlight">{t.titleHighlight}</span>
              </>
            }
            description={t.description}
          />
          <Reveal delay={0.1} className="mt-6 grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
            {channels.map((channel) => (
              <a
                key={channel.id}
                href={channel.href}
                target="_blank"
                rel="noopener noreferrer"
                className="group flex items-center gap-3 rounded-2xl border border-brand-100 bg-white p-4 transition-[border-color,background-color,transform] duration-200 hover:-translate-y-0.5 hover:border-brand-300 hover:bg-brand-50"
              >
                <span className={cn("grid size-11 shrink-0 place-items-center rounded-xl", CHANNEL_STYLES[channel.id])}>
                  <ContactIcon id={channel.id} className="size-5" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-semibold text-ink-900">{channel.title}</span>
                  <span className="block truncate text-xs text-ink-500">{channel.detail ?? channel.description}</span>
                </span>
                <ArrowUpRight
                  className="size-4 shrink-0 text-ink-300 transition-[color,transform] group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-brand-700"
                  aria-hidden="true"
                />
                <span className="sr-only">{dict.contact.newTab}</span>
              </a>
            ))}
          </Reveal>
        </div>

        <Reveal delay={0.05} className="grid content-start gap-3">
          {t.items.map((faq, index) => {
            const open = openIndex === index;
            const buttonId = `${baseId}-q${index}`;
            const panelId = `${baseId}-a${index}`;
            return (
              <div
                key={faq.question}
                className={cn(
                  "rounded-2xl border transition-colors duration-300",
                  open ? "border-brand-200 bg-brand-50/70" : "border-brand-100 bg-white hover:border-brand-200",
                )}
              >
                <h3>
                  <button
                    id={buttonId}
                    type="button"
                    aria-expanded={open}
                    aria-controls={panelId}
                    onClick={() => setOpenIndex(open ? null : index)}
                    className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left font-semibold text-ink-900"
                  >
                    {faq.question}
                    <span
                      className={cn(
                        "grid size-8 shrink-0 place-items-center rounded-lg transition-[transform,background-color,color] duration-300",
                        open ? "rotate-45 bg-brand-400 text-coal" : "bg-brand-50 text-brand-700",
                      )}
                    >
                      <Plus className="size-4" aria-hidden="true" />
                    </span>
                  </button>
                </h3>
                <AnimatePresence initial={false}>
                  {open ? (
                    <m.div
                      id={panelId}
                      role="region"
                      aria-labelledby={buttonId}
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.3 }}
                      className="overflow-hidden"
                    >
                      <p className="px-5 pb-5 text-sm leading-relaxed text-ink-500">{faq.answer}</p>
                    </m.div>
                  ) : null}
                </AnimatePresence>
              </div>
            );
          })}
        </Reveal>
      </Container>
    </section>
  );
}
