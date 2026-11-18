import { ArrowRight, ArrowUpRight, Clock, Crown, Gamepad2, Gift, Hash, Sparkles, Swords } from "lucide-react";
import Form from "next/form";
import Link from "next/link";
import type { ReactNode } from "react";

import { ContactIcon } from "@/components/ui/contact-icon";
import { Container } from "@/components/ui/container";
import { Logo } from "@/components/ui/logo";
import { RobuxIcon } from "@/components/ui/robux-icon";
import { navItems, siteConfig } from "@/config/site";
import { localeHref } from "@/i18n/config";
import { getI18n } from "@/i18n/get-dictionary";
import { getContactChannels } from "@/lib/contact";
import { cn } from "@/lib/utils";

export async function Footer() {
  const { locale, dict } = await getI18n();
  const t = dict.footer;
  const channels = getContactChannels(dict);

  return (
    <footer className="px-3 pt-6 pb-3 sm:px-4 sm:pb-4">
      <div className="rounded-[2.5rem] border-4 border-white bg-brand-50/70 shadow-[0_20px_60px_-30px_rgb(95_154_23/0.35)] ring-1 ring-brand-100">
        <Container className="pt-6 pb-8 sm:pt-10">
          {/* Call-to-action card */}
          <section
            aria-labelledby="footer-cta-title"
            className="relative grid overflow-hidden rounded-[2rem] bg-white shadow-[0_10px_40px_-20px_rgb(23_32_12/0.25)] md:grid-cols-[1.1fr_1fr]"
          >
            <div className="relative z-10 p-6 sm:p-10">
              <p className="text-sm font-medium text-ink-500">{dict.cta.eyebrow}</p>
              <h2
                id="footer-cta-title"
                className="mt-3 max-w-md text-2xl font-bold tracking-tight text-balance text-ink-900 sm:text-3xl"
              >
                {dict.cta.title}
              </h2>
              <p className="mt-3 max-w-md text-sm text-pretty text-ink-500 sm:text-base">{dict.cta.description}</p>
              <Link
                href={localeHref(locale, "/robux")}
                className="group mt-6 inline-flex h-11 items-center gap-2 rounded-full bg-ink-900 px-5 text-sm font-semibold text-white transition-colors hover:bg-ink-700 focus-visible:ring-2 focus-visible:ring-brand-400 focus-visible:ring-offset-2 focus-visible:outline-none"
              >
                <RobuxIcon className="size-4 text-brand-300" aria-hidden="true" />
                {dict.cta.primary}
                <ArrowUpRight
                  className="size-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
                  aria-hidden="true"
                />
              </Link>
            </div>
            <Orbit />
          </section>

          {/* Link columns */}
          <div className="mt-12 grid grid-cols-2 gap-x-6 gap-y-10 lg:grid-cols-[1.4fr_0.8fr_1fr_1.4fr] lg:gap-8">
            <div className="col-span-2 lg:col-span-1">
              <Logo height={44} />
              <p className="mt-4 max-w-xs text-sm text-ink-500">{t.description}</p>
              <p className="mt-4 inline-flex items-center gap-2 text-xs font-medium text-ink-500">
                <Clock className="size-3.5 text-brand-600" aria-hidden="true" />
                {t.hours}
              </p>
            </div>

            <FooterColumn title={t.explore}>
              {navItems.map((item) => (
                <li key={item.href}>
                  <Link href={localeHref(locale, item.href)} className={linkClass}>
                    {dict.nav.items[item.key]}
                  </Link>
                </li>
              ))}
            </FooterColumn>

            <FooterColumn title={t.contact}>
              {channels.map((channel) => (
                <li key={channel.id}>
                  <a href={channel.href} target="_blank" rel="noopener noreferrer" className={cn(linkClass, "group")}>
                    {channel.title}
                    <ArrowUpRight
                      className="size-3.5 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
                      aria-hidden="true"
                    />
                    <span className="sr-only">{dict.contact.newTab}</span>
                  </a>
                </li>
              ))}
            </FooterColumn>

            {/* Quick order lookup — a plain GET form, so it works even before JavaScript loads. */}
            <div className="col-span-2 lg:col-span-1">
              <h3 className="text-sm font-semibold text-ink-900">{t.checkOrder.title}</h3>
              <p className="mt-3 text-sm text-ink-500">{t.checkOrder.description}</p>
              <Form
                action={localeHref(locale, "/check-order")}
                className="mt-4 flex items-center gap-2 rounded-full bg-white p-1.5 pl-4 shadow-sm ring-1 ring-brand-100 focus-within:ring-2 focus-within:ring-brand-400"
              >
                <Hash className="size-4 shrink-0 text-ink-300" aria-hidden="true" />
                <label htmlFor="footer-order-id" className="sr-only">
                  {t.checkOrder.label}
                </label>
                <input
                  id="footer-order-id"
                  name="id"
                  type="text"
                  required
                  maxLength={16}
                  autoComplete="off"
                  autoCapitalize="characters"
                  spellCheck={false}
                  placeholder={t.checkOrder.placeholder}
                  className="min-w-0 flex-1 bg-transparent font-mono text-sm tracking-wider text-ink-900 uppercase outline-none placeholder:font-sans placeholder:tracking-normal placeholder:text-ink-300 placeholder:normal-case"
                />
                <button
                  type="submit"
                  aria-label={t.checkOrder.submit}
                  className="grid size-9 shrink-0 place-items-center rounded-full bg-ink-900 text-white transition-colors hover:bg-ink-700"
                >
                  <ArrowRight className="size-4" aria-hidden="true" />
                </button>
              </Form>
            </div>
          </div>

          {/* Bottom bar */}
          <div className="mt-12 flex flex-col gap-4 border-t border-brand-100 pt-6 text-xs text-ink-500 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p>
                © {siteConfig.name} · {t.rights}
              </p>
              <p className="mt-1 max-w-xl text-ink-300">{t.disclaimer}</p>
            </div>
            <ul className="flex items-center gap-2">
              {channels.map((channel) => (
                <li key={channel.id}>
                  <a
                    href={channel.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={`${channel.title} (${dict.contact.newTab})`}
                    className="grid size-9 place-items-center rounded-full bg-white text-ink-700 ring-1 ring-brand-100 transition-colors hover:text-brand-700 hover:ring-brand-300"
                  >
                    <ContactIcon id={channel.id} className="size-4" />
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </Container>
      </div>
    </footer>
  );
}

const linkClass = "inline-flex items-center gap-1 text-ink-500 transition-colors hover:text-ink-900";

function FooterColumn({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div>
      <h3 className="text-sm font-semibold text-ink-900">{title}</h3>
      <ul className="mt-3 grid gap-2.5 text-sm">{children}</ul>
    </div>
  );
}

/** Icons orbiting around the logo: two slowly turning rings (decoration only). */
const orbits = [
  {
    size: "size-[15rem]",
    radius: "7.5rem",
    duration: "[animation-duration:40s]",
    items: [
      { Icon: RobuxIcon, angle: 20, tone: "bg-brand-100 text-brand-700" },
      { Icon: Gift, angle: 150, tone: "bg-blush-100 text-blush-600" },
      { Icon: Sparkles, angle: 260, tone: "bg-brand-200 text-brand-800" },
    ],
  },
  {
    size: "size-[24rem]",
    radius: "12rem",
    duration: "[animation-duration:60s] [animation-direction:reverse]",
    items: [
      { Icon: Gamepad2, angle: 60, tone: "bg-brand-100 text-brand-700" },
      { Icon: Crown, angle: 200, tone: "bg-blush-100 text-blush-600" },
      { Icon: Swords, angle: 310, tone: "bg-brand-200 text-brand-800" },
    ],
  },
] as const;

function Orbit() {
  return (
    <div aria-hidden="true" className="relative hidden min-h-64 overflow-hidden md:block">
      <div className="absolute inset-0 grid place-items-center">
        {/* Faint outer rings for depth */}
        <span className="absolute size-[33rem] rounded-full border border-dashed border-brand-100" />
        {orbits.map((orbit) => (
          <div
            key={orbit.size}
            className={cn(
              "absolute animate-spin rounded-full border border-dashed border-brand-200",
              orbit.size,
              orbit.duration,
            )}
          >
            {orbit.items.map(({ Icon, angle, tone }) => (
              // Rotate to the angle, push out to the ring, then rotate back so the icon stays upright.
              <span
                key={angle}
                className="absolute top-1/2 left-1/2"
                style={{ transform: `rotate(${angle}deg) translateX(${orbit.radius}) rotate(-${angle}deg)` }}
              >
                <span
                  className={cn(
                    "-mt-5 -ml-5 grid size-10 animate-spin place-items-center rounded-full shadow-md ring-4 ring-white",
                    tone,
                    // Counter-spin so the icon doesn't turn upside down with its ring.
                    orbit.duration.includes("reverse")
                      ? "[animation-duration:60s]"
                      : "[animation-direction:reverse] [animation-duration:40s]",
                  )}
                >
                  <Icon className="size-5" />
                </span>
              </span>
            ))}
          </div>
        ))}
        <span className="relative grid size-20 place-items-center rounded-full bg-white shadow-lg ring-1 ring-brand-100">
          <Logo height={34} />
        </span>
      </div>
    </div>
  );
}
