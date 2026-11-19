import { Lock } from "lucide-react";
import type { Metadata } from "next";
import { Suspense, type ReactNode } from "react";

import { adminCopy } from "@/app/admin/copy";
import { AdminShell } from "@/components/admin/admin-shell";
import {
  ExpiryForm,
  QrisForm,
  ResetButton,
  RobuxRatesForm,
  StockForm,
  type StockItem,
} from "@/components/admin/settings-forms";
import { products } from "@/data/products";
import { robuxConfig } from "@/data/robux";
import { gamepassGames } from "@/data/gamepasses";
import { gamepassProductSlug } from "@/lib/catalog";
import { formatAdminDate } from "@/components/admin/status-badge";
import { interpolate } from "@/i18n/format";
import type { SiteSettings } from "@/lib/settings";
import { requireAdmin } from "@/server/auth/admin";
import { getFreshSettings, getSettingsMeta, type SettingMeta } from "@/server/settings";

export const metadata: Metadata = { title: adminCopy.settings.title };

const t = adminCopy.settings;

const robuxMethodNames = { "send-username": "Via Send Username", gamepass: "Via Gamepass" } as const;

/** Everything that can be switched off, in the order buyers see it. */
const stockItems: StockItem[] = [
  ...robuxConfig.methods.map((method) => ({
    id: method.id,
    name: `Robux ${robuxMethodNames[method.id]}`,
    group: "robux" as const,
  })),
  ...products.map((product) => ({ id: product.slug, name: product.name, group: "shop" as const })),
  ...gamepassGames.map((game) => ({ id: gamepassProductSlug(game.slug), name: game.name, group: "gamepass" as const })),
];

export default function AdminSettingsPage() {
  return (
    <Suspense fallback={<div className="mx-auto h-96 max-w-6xl animate-pulse px-4 py-24" aria-busy="true" />}>
      <Settings />
    </Suspense>
  );
}

async function Settings() {
  const admin = await requireAdmin();
  const [settings, meta] = await Promise.all([getFreshSettings(), getSettingsMeta()]);
  const isOwner = admin.role === "owner";

  return (
    <AdminShell admin={admin} current="settings">
      <h1 className="text-2xl font-bold text-ink-900">{t.title}</h1>
      <p className="mt-1 max-w-2xl text-sm text-ink-500">{t.description}</p>
      {!isOwner ? (
        <p className="mt-4 flex items-center gap-2 rounded-xl bg-blush-50 px-4 py-3 text-sm text-blush-900">
          <Lock className="size-4 shrink-0" aria-hidden="true" />
          {t.ownerOnly}
        </p>
      ) : null}

      {/* Staff see the values but can't change them (the server refuses too). */}
      <fieldset disabled={!isOwner} className="mt-6 grid gap-5 disabled:opacity-60">
        <Section
          field="soldOut"
          title={t.stock.title}
          description={t.stock.description}
          meta={meta.soldOut}
          owner={isOwner}
        >
          <StockForm initial={settings.soldOut} items={stockItems} />
        </Section>
        <Section
          field="robuxRates"
          title={t.robux.title}
          description={t.robux.description}
          meta={meta.robuxRates}
          owner={isOwner}
        >
          <RobuxRatesForm initial={settings.robuxRates} />
        </Section>
        <Section field="qris" title={t.qris.title} description={t.qris.description} meta={meta.qris} owner={isOwner}>
          {/* key: after a new QR is saved, the form starts fresh with it. */}
          <QrisForm key={settings.qris.image} initial={settings.qris} />
        </Section>
        <Section
          field="orderExpiryMinutes"
          title={t.expiry.title}
          description={t.expiry.description}
          meta={meta.orderExpiryMinutes}
          owner={isOwner}
        >
          <ExpiryForm initial={settings.orderExpiryMinutes} />
        </Section>
      </fieldset>
    </AdminShell>
  );
}

function Section({
  field,
  title,
  description,
  meta,
  owner,
  children,
}: {
  field: keyof SiteSettings;
  title: string;
  description: string;
  meta?: SettingMeta;
  owner: boolean;
  children: ReactNode;
}) {
  return (
    <section
      aria-labelledby={`settings-${field}`}
      className="rounded-[1.75rem] border border-brand-100 bg-white p-5 sm:p-6"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 id={`settings-${field}`} className="text-lg font-bold text-ink-900">
            {title}
          </h2>
          <p className="mt-1 max-w-2xl text-sm text-ink-500">{description}</p>
          <p className="mt-1 text-xs text-ink-500">
            {meta
              ? interpolate(t.lastChanged, { date: formatAdminDate(meta.updatedAt), name: meta.updatedBy ?? "—" })
              : t.usingDefault}
          </p>
        </div>
        {meta && owner ? <ResetButton field={field} /> : null}
      </div>
      <div className="mt-5">{children}</div>
    </section>
  );
}
