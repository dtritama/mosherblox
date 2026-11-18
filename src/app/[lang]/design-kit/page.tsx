import { readFileSync } from "node:fs";
import path from "node:path";

import { ArrowRight, ArrowUpRight, Search, Zap } from "lucide-react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import {
  CheckboxDemo,
  FieldStates,
  OrderCards,
  OrderSuccessDemo,
  PaymentPickerDemo,
  ProductCards,
  StatusBadges,
  StepHeaders,
  SummaryDemo,
} from "@/components/design-kit/kit-demos";
import { KitFrame, KitGroup, KitNote } from "@/components/design-kit/kit-frame";
import { CheckOrder } from "@/components/orders/check-order";
import { RobuxPanel } from "@/components/robux/robux-panel";
import { Button } from "@/components/ui/button";
import { ContactIcon } from "@/components/ui/contact-icon";
import { Container } from "@/components/ui/container";
import { Logo } from "@/components/ui/logo";
import { ProductArt } from "@/components/ui/product-art";
import { RobuxIcon } from "@/components/ui/robux-icon";
import { SectionHeading } from "@/components/ui/section-heading";
import { siteConfig } from "@/config/site";
import { localeHref } from "@/i18n/config";
import { getI18n } from "@/i18n/get-dictionary";
import { cn } from "@/lib/utils";
import type { ProductIcon } from "@/types";

/**
 * Design kit: every foundation, component and pattern of the site on one page,
 * rendered from the real components so it never drifts from the code.
 * Import it into Figma with the html.to.design plugin (see design/README.md).
 * Development only — it 404s in production builds unless DESIGN_KIT=1.
 */
const enabled = process.env.NODE_ENV !== "production" || process.env.DESIGN_KIT === "1";

export const metadata: Metadata = {
  title: "Design kit",
  robots: { index: false, follow: false },
};

/** Color scales straight from the @theme block in globals.css (the source of truth). */
function readColorScales() {
  const css = readFileSync(path.join(process.cwd(), "src/app/globals.css"), "utf8");
  const scales = new Map<string, { step: string; hex: string }[]>();
  for (const [, group, step, hex] of css.matchAll(/--color-([a-z]+)-(\d+):\s*(#[0-9a-f]{3,8});/gi)) {
    if (!scales.has(group)) scales.set(group, []);
    scales.get(group)?.push({ step, hex: hex.toLowerCase() });
  }
  return [...scales.entries()];
}

const scaleNotes: Record<string, string> = {
  brand: "Lime from the logo. 300–500 carry ink text; 700+ are dark enough for white text.",
  blush: "Soft pink accent: highlight underline, pink buttons, Hot/Popular badges, errors (700).",
  ink: "Text. 900 headings & body, 700 secondary, 500 muted, 300 placeholders.",
};

const typeScale = [
  {
    name: "Display / Hero H1",
    className: "text-7xl font-extrabold tracking-tight leading-[1.05]",
    spec: "Poppins 800 · 72/76 · -2.5% · mobile 41.6",
  },
  {
    name: "Section title / H2",
    className: "text-[2.75rem] font-bold tracking-tight leading-[1.1]",
    spec: "Poppins 700 · 44/48 · -2.5% · mobile 30",
  },
  { name: "Card title / H3", className: "text-2xl font-bold tracking-tight", spec: "Poppins 700 · 24/32" },
  { name: "Title S", className: "text-base font-semibold", spec: "Poppins 600 · 16/24" },
  { name: "Body L", className: "text-lg text-ink-500", spec: "Poppins 400 · 18/28 · ink-500" },
  { name: "Body", className: "text-base text-ink-700", spec: "Poppins 400 · 16/24 · ink-700" },
  { name: "Small", className: "text-sm text-ink-500", spec: "Poppins 400–500 · 14/20" },
  { name: "Caption", className: "text-xs text-ink-500", spec: "Poppins 400–500 · 12/16" },
  {
    name: "Overline",
    className: "text-xs font-semibold tracking-wider text-ink-500 uppercase",
    spec: "Poppins 600 · 12/16 · +5% · uppercase",
  },
  {
    name: "Price",
    className: "text-3xl font-extrabold text-ink-900 tabular-nums",
    spec: "Poppins 800 · 30/36 · tabular numbers",
  },
];

const radii = [
  { name: "lg · 8", className: "rounded-lg" },
  { name: "xl · 12", className: "rounded-xl", use: "inputs, chips" },
  { name: "2xl · 16", className: "rounded-2xl", use: "buttons, small cards" },
  { name: "card · 28", className: "rounded-[1.75rem]", use: "product & order cards" },
  { name: "panel · 32", className: "rounded-[2rem]", use: "panels, sections" },
  { name: "footer · 40", className: "rounded-[2.5rem]", use: "footer frame" },
  { name: "full", className: "rounded-full", use: "pills, avatars" },
];

const shadows = [
  { name: "card", className: "shadow-[0_30px_80px_-20px_rgb(95_154_23/0.28)]" },
  { name: "soft", className: "shadow-[0_10px_40px_-20px_rgb(23_32_12/0.25)]" },
  { name: "button-primary", className: "shadow-lg shadow-brand-500/30" },
  { name: "button-pink", className: "shadow-lg shadow-blush-300/40" },
];

const productIcons: { icon: ProductIcon; accent: readonly [string, string] }[] = [
  { icon: "coins", accent: ["#bdef6d", "#5f9a17"] },
  { icon: "crown", accent: ["#d9f6a6", "#86c92b"] },
  { icon: "gift", accent: ["#ffc8da", "#a5e34a"] },
  { icon: "apple", accent: ["#8fd3f4", "#86c92b"] },
  { icon: "sprout", accent: ["#d9f6a6", "#5f9a17"] },
  { icon: "egg", accent: ["#ffcfdd", "#fb7aa1"] },
  { icon: "gem", accent: ["#c7d2fe", "#86c92b"] },
  { icon: "sword", accent: ["#fde68a", "#86c92b"] },
];

const buttonVariants = ["primary", "pink", "soft", "outline", "ghost", "light"] as const;
const buttonSizes = ["sm", "md", "lg"] as const;

const frames = [
  ["colors", "Colors"],
  ["typography", "Typography"],
  ["radius-shadow", "Radius & shadow"],
  ["icons", "Icons & art"],
  ["buttons", "Buttons"],
  ["badges", "Badges & chips"],
  ["forms", "Forms"],
  ["cards", "Cards"],
  ["patterns", "Patterns"],
  ["pages", "Pages"],
] as const;

export default async function DesignKitPage() {
  if (!enabled) notFound();
  const { locale, dict } = await getI18n();
  const scales = readColorScales();

  return (
    <div className="bg-brand-50/50 pt-24 pb-16 lg:pt-28">
      <Container className="grid gap-8">
        {/* Cover */}
        <header className="grid gap-6 rounded-[2rem] bg-ink-900 p-8 text-white sm:p-12 lg:grid-cols-[1fr_auto] lg:items-end">
          <div>
            <Logo height={56} />
            <h1 className="mt-6 text-4xl font-extrabold tracking-tight sm:text-5xl">
              {siteConfig.name} <span className="text-brand-300">Design Kit</span>
            </h1>
            <p className="mt-3 max-w-2xl text-white/70">
              Foundations, components and patterns rendered from the live code. Each white card below is one frame when
              imported into Figma. Language: {locale.toUpperCase()}.
            </p>
          </div>
          <nav aria-label="Frames" className="flex max-w-md flex-wrap gap-2">
            {frames.map(([id, label]) => (
              <a
                key={id}
                href={`#${id}`}
                className="rounded-full bg-white/10 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-white/20"
              >
                {label}
              </a>
            ))}
          </nav>
        </header>

        <KitFrame
          id="colors"
          title="Colors"
          description="Scales from src/app/globals.css — exported to design/tokens.json."
        >
          {scales.map(([group, steps]) => (
            <KitGroup key={group} label={`${group} — ${scaleNotes[group] ?? ""}`}>
              <div className="grid grid-cols-3 gap-3 sm:grid-cols-6 lg:grid-cols-11">
                {steps.map(({ step, hex }) => (
                  <div key={step}>
                    <div className="h-16 rounded-xl ring-1 ring-black/5" style={{ backgroundColor: hex }} />
                    <p className="mt-2 text-xs font-semibold text-ink-900">
                      {group}-{step}
                    </p>
                    <KitNote>{hex}</KitNote>
                  </div>
                ))}
              </div>
            </KitGroup>
          ))}
          <KitGroup label="Semantic" className="grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
            {[
              ["Primary", "bg-brand-400", "brand-400 + ink text"],
              ["Surface", "bg-brand-50", "brand-50"],
              ["Border", "bg-brand-100", "brand-100"],
              ["Accent", "bg-blush-200", "blush-200"],
              ["Accent strong", "bg-blush-500", "blush-500"],
              ["Text", "bg-ink-900", "ink-900"],
            ].map(([name, bg, token]) => (
              <div key={name}>
                <div className={cn("h-16 rounded-xl ring-1 ring-black/5", bg)} />
                <p className="mt-2 text-xs font-semibold text-ink-900">{name}</p>
                <KitNote>{token}</KitNote>
              </div>
            ))}
          </KitGroup>
        </KitFrame>

        <KitFrame
          id="typography"
          title="Typography"
          description="Poppins (self-hosted) · weights 400, 500, 600, 700, 800."
        >
          <div className="grid gap-6">
            {typeScale.map((item) => (
              <div
                key={item.name}
                className="grid gap-2 border-b border-brand-50 pb-5 lg:grid-cols-[14rem_1fr] lg:items-baseline"
              >
                <div>
                  <p className="text-sm font-semibold text-ink-900">{item.name}</p>
                  <KitNote>{item.spec}</KitNote>
                </div>
                <p className={cn("text-ink-900", item.className)}>
                  {item.name.startsWith("Price") ? "Rp 120.000" : dict.hero.headline.join(" ")}
                </p>
              </div>
            ))}
          </div>
          <KitGroup label="Highlight (lime text, ink outline, pink underline)">
            <p className="text-6xl font-extrabold tracking-tight">
              <span className="animate-underline text-highlight">{siteConfig.name}</span>
            </p>
            <KitNote>.text-highlight — brand-400 fill, 2px ink-900 stroke, blush-200 underline</KitNote>
          </KitGroup>
          <KitGroup label="Section heading component">
            <SectionHeading
              eyebrow={dict.robux.eyebrow}
              title={
                <>
                  {dict.robux.titleStart} <span className="text-highlight">{dict.robux.titleHighlight}</span>
                </>
              }
              description={dict.robux.description}
            />
          </KitGroup>
        </KitFrame>

        <KitFrame id="radius-shadow" title="Radius & shadow">
          <KitGroup label="Radius" className="grid grid-cols-2 gap-4 sm:grid-cols-4 lg:grid-cols-7">
            {radii.map((radius) => (
              <div key={radius.name}>
                <div className={cn("h-20 border-2 border-brand-300 bg-brand-50", radius.className)} />
                <p className="mt-2 text-xs font-semibold text-ink-900">{radius.name}</p>
                {radius.use ? <KitNote>{radius.use}</KitNote> : null}
              </div>
            ))}
          </KitGroup>
          <KitGroup label="Shadow" className="grid grid-cols-2 gap-8 lg:grid-cols-4">
            {shadows.map((shadow) => (
              <div key={shadow.name}>
                <div className={cn("h-24 rounded-2xl bg-white", shadow.className)} />
                <KitNote>{shadow.name}</KitNote>
              </div>
            ))}
          </KitGroup>
        </KitFrame>

        <KitFrame
          id="icons"
          title="Icons & art"
          description="Lucide icons at 1.75–2px stroke. Product art = gradient tile + dot pattern + icon."
        >
          <KitGroup label="Brand" className="flex flex-wrap items-center gap-6">
            <div>
              <Logo height={64} />
              <KitNote>Logo · 64</KitNote>
            </div>
            <div>
              <Logo height={34} />
              <KitNote>Logo · 34 (navbar)</KitNote>
            </div>
            <div>
              <span className="grid size-14 place-items-center rounded-2xl bg-brand-100 text-brand-700">
                <RobuxIcon className="size-7" aria-hidden="true" />
              </span>
              <KitNote>Robux icon</KitNote>
            </div>
            {(["whatsapp", "discord", "whatsappGroup"] as const).map((id) => (
              <div key={id}>
                <span className="grid size-14 place-items-center rounded-2xl bg-white text-ink-700 ring-1 ring-brand-100">
                  <ContactIcon id={id} className="size-6" />
                </span>
                <KitNote>{id}</KitNote>
              </div>
            ))}
          </KitGroup>
          <KitGroup label="Product art" className="grid grid-cols-4 gap-4 sm:grid-cols-8">
            {productIcons.map(({ icon, accent }) => (
              <div key={icon}>
                <ProductArt icon={icon} accent={accent} className="grid aspect-square place-items-center rounded-2xl" />
                <KitNote>{icon}</KitNote>
              </div>
            ))}
          </KitGroup>
        </KitFrame>

        <KitFrame
          id="buttons"
          title="Buttons"
          description="Primary always uses ink text on lime. Radius 16, weight 600."
        >
          <KitGroup label="Variants × sizes" className="grid gap-4">
            {buttonVariants.map((variant) => (
              <div key={variant} className="grid items-center gap-3 sm:grid-cols-[8rem_1fr]">
                <KitNote>{variant}</KitNote>
                <div className="flex flex-wrap items-center gap-3">
                  {buttonSizes.map((size) => (
                    <Button key={size} variant={variant} size={size}>
                      {size === "lg" ? <Zap className="size-4" aria-hidden="true" /> : null}
                      {dict.nav.buyRobux}
                    </Button>
                  ))}
                  <Button variant={variant} disabled>
                    Disabled
                  </Button>
                </div>
              </div>
            ))}
          </KitGroup>
          <KitGroup label="Special" className="flex flex-wrap items-center gap-4">
            <div>
              <span className="inline-flex h-11 items-center gap-2 rounded-full bg-ink-900 px-5 text-sm font-semibold text-white">
                <RobuxIcon className="size-4 text-brand-300" aria-hidden="true" />
                {dict.cta.primary}
                <ArrowUpRight className="size-4" aria-hidden="true" />
              </span>
              <KitNote>Dark pill (footer CTA)</KitNote>
            </div>
            <div>
              <span className="grid size-9 place-items-center rounded-full bg-ink-900 text-white">
                <ArrowRight className="size-4" aria-hidden="true" />
              </span>
              <KitNote>Icon / round dark</KitNote>
            </div>
            <div>
              <span className="grid size-12 place-items-center rounded-2xl bg-brand-400 text-ink-900 shadow-xl shadow-brand-500/30">
                <ArrowUpRight className="size-5 -rotate-45" aria-hidden="true" />
              </span>
              <KitNote>Back to top</KitNote>
            </div>
            <div>
              <span className="grid h-16 w-14 place-items-center rounded-xl border-2 border-brand-100 bg-white text-xl font-bold">
                −
              </span>
              <KitNote>Stepper</KitNote>
            </div>
          </KitGroup>
        </KitFrame>

        <KitFrame id="badges" title="Badges & chips">
          <KitGroup label="Order status">
            <StatusBadges />
          </KitGroup>
          <KitGroup label="Labels" className="flex flex-wrap items-start gap-4">
            {[
              ["bg-brand-100 text-brand-800", dict.hero.card.success, "Success"],
              ["bg-blush-500 text-white", dict.robux.methods.popular, "Popular"],
              ["bg-brand-100 text-brand-800", "Rp 120/Robux", "Rate pill"],
              ["bg-blush-50 text-blush-800", "Beli ≥ 5.000 Robux untuk Rp 115/Robux", "Next tier"],
              ["bg-blush-500 text-white", "Hot", "Tag / Hot"],
              ["bg-brand-400 text-ink-900", "Best value", "Tag / Best value"],
              ["bg-white text-brand-700 ring-1 ring-brand-100", "New", "Tag / New"],
            ].map(([style, label, note]) => (
              <div key={note}>
                <span className={cn("inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold", style)}>
                  {label}
                </span>
                <KitNote>{note}</KitNote>
              </div>
            ))}
          </KitGroup>
          <KitGroup label="Amount presets" className="grid grid-cols-3 gap-2 sm:grid-cols-6">
            {[500, 1000, 1500].map((amount, index) => (
              <span
                key={amount}
                className={cn(
                  "rounded-xl border-2 px-2 py-2",
                  index === 1 ? "border-brand-500 bg-brand-50" : "border-brand-100",
                )}
              >
                <span className="flex items-center gap-1 text-sm font-bold text-ink-900">
                  <RobuxIcon className="size-3.5 text-brand-500" aria-hidden="true" />
                  {amount.toLocaleString("id-ID")}
                </span>
                <span className="block text-xs text-ink-500">Rp {(amount * 120).toLocaleString("id-ID")}</span>
              </span>
            ))}
            <span className="rounded-xl border-2 border-brand-100 px-2 py-2 opacity-40">
              <span className="text-sm font-bold text-ink-900">10.000</span>
              <span className="block text-xs text-ink-500">over limit</span>
            </span>
          </KitGroup>
        </KitFrame>

        <KitFrame id="forms" title="Forms" description="Inputs 48px tall, radius 12, 2px border. Errors in blush.">
          <KitGroup label="Text field">
            <FieldStates />
          </KitGroup>
          <KitGroup label="Step header">
            <StepHeaders />
          </KitGroup>
          <KitGroup label="Payment picker">
            <PaymentPickerDemo />
          </KitGroup>
          <KitGroup label="Checkbox card (2-Step Verification)">
            <CheckboxDemo />
          </KitGroup>
          <KitGroup label="Search pill (footer order lookup)">
            <div className="flex max-w-sm items-center gap-2 rounded-full bg-white p-1.5 pl-4 shadow-sm ring-1 ring-brand-100">
              <Search className="size-4 text-ink-300" aria-hidden="true" />
              <span className="flex-1 text-sm text-ink-300">{dict.footer.checkOrder.placeholder}</span>
              <span className="grid size-9 place-items-center rounded-full bg-ink-900 text-white">
                <ArrowRight className="size-4" aria-hidden="true" />
              </span>
            </div>
          </KitGroup>
          <KitGroup label="Summary">
            <SummaryDemo />
          </KitGroup>
        </KitFrame>

        <KitFrame id="cards" title="Cards">
          <KitGroup label="Product card (shop)">
            <ProductCards />
          </KitGroup>
          <KitGroup label="Order card (hero)">
            <OrderCards />
          </KitGroup>
          <KitGroup label="Order success">
            <OrderSuccessDemo />
          </KitGroup>
        </KitFrame>

        <KitFrame id="patterns" title="Patterns" description="Full interactive blocks as they appear on the site.">
          <KitGroup label="Robux buy panel (/robux)">
            <Suspense>
              <RobuxPanel />
            </Suspense>
          </KitGroup>
          <KitGroup label="Check order (/check-order)">
            <div className="max-w-xl">
              <Suspense>
                <CheckOrder />
              </Suspense>
            </div>
          </KitGroup>
        </KitFrame>

        <KitFrame
          id="pages"
          title="Pages"
          description="Import each page URL with html.to.design at 1440 (desktop) and 390 (mobile). Scroll to the bottom first so every section has animated in."
        >
          <ul className="grid gap-3 sm:grid-cols-2">
            {[
              ["Home", "/"],
              ["Robux", "/robux"],
              ["Gamepass — games", "/gamepass"],
              ["Gamepass — list", "/gamepass/blox-fruits"],
              ["Check order", "/check-order"],
              ["404", "/not-found-page"],
            ].map(([name, href]) => (
              <li key={href}>
                <a
                  href={localeHref(locale, href)}
                  className="flex items-center justify-between rounded-2xl border border-brand-100 px-4 py-3 text-sm font-semibold text-ink-900 transition-colors hover:border-brand-300 hover:bg-brand-50"
                >
                  {name}
                  <span className="font-mono text-xs font-normal text-ink-500">{localeHref(locale, href)}</span>
                </a>
              </li>
            ))}
          </ul>
        </KitFrame>
      </Container>
    </div>
  );
}
