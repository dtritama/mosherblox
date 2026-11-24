"use client";

import { m } from "motion/react";

import { Container } from "@/components/ui/container";
import { SectionHeading } from "@/components/ui/section-heading";
import { paymentMethods } from "@/data/payments";
import { interpolate } from "@/i18n/format";
import { useI18n } from "@/i18n/i18n-provider";
import { cn } from "@/lib/utils";

export function HowItWorks() {
  const { dict } = useI18n();
  const t = dict.how;
  const steps = t.steps;

  return (
    <section id="how" aria-labelledby="how-title" className="relative overflow-hidden bg-brand-50/70 py-14 lg:py-20">
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-grid mask-[linear-gradient(to_bottom,black,transparent)]"
      />
      <Container className="relative">
        <SectionHeading
          id="how-title"
          eyebrow={t.eyebrow}
          title={
            <>
              {t.titleStart} <span className="text-highlight">{t.titleHighlight}</span>
            </>
          }
        />

        <ol className="relative mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {/* Connector line that draws itself on scroll */}
          <m.span
            aria-hidden="true"
            initial={{ scaleX: 0 }}
            whileInView={{ scaleX: 1 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 1.2, ease: [0.22, 1, 0.36, 1] }}
            className="absolute top-10 right-[12%] left-[12%] hidden h-0.5 origin-left bg-linear-to-r from-brand-200 via-brand-300 to-blush-200 lg:block"
          />
          {steps.map((step, index) => (
            <m.li
              key={index}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{ duration: 0.5, delay: index * 0.12 }}
              className="relative rounded-3xl border border-brand-100 bg-white p-5 shadow-sm"
            >
              <span
                className={cn(
                  "relative grid size-12 place-items-center rounded-2xl text-lg font-extrabold",
                  index === steps.length - 1 ? "bg-blush-100 text-blush-700" : "bg-brand-100 text-brand-800",
                )}
              >
                {String(index + 1).padStart(2, "0")}
              </span>
              <h3 className="mt-4 text-lg font-bold text-ink-900">{step.title}</h3>
              <p className="mt-1 text-sm text-ink-500">{step.description}</p>
            </m.li>
          ))}
        </ol>

        <div className="mt-10 flex flex-col gap-4 rounded-3xl border border-brand-100 bg-white p-5 sm:p-6 lg:flex-row lg:items-center">
          <p className="shrink-0 text-sm font-semibold text-ink-900">
            {t.payYourWay}{" "}
            <span className="font-normal text-ink-500">
              · {interpolate(t.methods, { count: paymentMethods.length })}
            </span>
          </p>
          <ul className="flex flex-wrap gap-2">
            {paymentMethods.map((method) => (
              <li
                key={method.id}
                className="rounded-xl border border-brand-100 bg-brand-50/60 px-3 py-1.5 text-xs font-semibold text-ink-700 transition-colors hover:border-brand-300 hover:bg-brand-100 hover:text-brand-800"
              >
                {method.name.replace(" Virtual Account", " VA")}
              </li>
            ))}
          </ul>
        </div>
      </Container>
    </section>
  );
}
