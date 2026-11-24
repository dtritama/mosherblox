import { Lock } from "lucide-react";
import type { Metadata } from "next";
import { Suspense } from "react";

import { adminCopy } from "@/app/admin/copy";
import { AdminShell } from "@/components/admin/admin-shell";
import { BannerEditor, ContactEditor, FaqEditor, TextsEditor } from "@/components/admin/content-editor";
import { formatAdminDate } from "@/components/admin/status-badge";
import { banners as builtinBanners } from "@/data/banners";
import { en } from "@/i18n/dictionaries/en";
import { id } from "@/i18n/dictionaries/id";
import { interpolate } from "@/i18n/format";
import { defaultBanners } from "@/lib/banners";
import { readText, TEXT_GROUPS, type FaqItemContent, type SiteContent } from "@/lib/site-content";
import { requireAdmin } from "@/server/auth/admin";
import { getFreshContent, type ContentMeta } from "@/server/site-content";

export const metadata: Metadata = { title: adminCopy.content.title };

const t = adminCopy.content;

const defaultFaq: FaqItemContent[] = id.faq.items.map((item, index) => ({
  question: { id: item.question, en: en.faq.items[index]?.question ?? "" },
  answer: { id: item.answer, en: en.faq.items[index]?.answer ?? "" },
}));

const defaultTexts = Object.fromEntries(
  TEXT_GROUPS.flatMap((group) =>
    group.fields.map(({ path }) => [path, { id: readText(id, path), en: readText(en, path) }]),
  ),
);

const builtinImages = Object.fromEntries(builtinBanners.map((banner) => [`builtin:${banner.id}`, banner.image.src]));

export default function AdminContentPage() {
  return (
    <Suspense fallback={<div className="mx-auto h-96 max-w-6xl animate-pulse px-4 py-24" aria-busy="true" />}>
      <Content />
    </Suspense>
  );
}

async function Content() {
  const admin = await requireAdmin();
  const isOwner = admin.role === "owner";
  const data = await getFreshContent().catch((error) => {
    console.error("[admin] content read failed", error);
    return null;
  });

  return (
    <AdminShell admin={admin} current="content">
      <h1 className="text-2xl font-bold text-ink-900">{t.title}</h1>
      <p className="mt-1 max-w-2xl text-sm text-ink-500">{t.description}</p>
      {!isOwner ? (
        <p className="mt-4 flex items-center gap-2 rounded-xl bg-blush-50 px-4 py-3 text-sm text-blush-900">
          <Lock className="size-4 shrink-0" aria-hidden="true" />
          {t.ownerOnly}
        </p>
      ) : null}
      {data ? (
        // Staff see the content but can't change it (the server refuses too).
        <fieldset disabled={!isOwner} className="mt-6 grid grid-cols-[minmax(0,1fr)] gap-5 disabled:opacity-60">
          <BannerEditor
            initial={data.content.banners ?? defaultBanners}
            builtinImages={builtinImages}
            edited={Boolean(data.meta.banners)}
            changed={changedLine(data.meta, "banners")}
          />
          <ContactEditor
            initial={data.content.contact}
            edited={Boolean(data.meta.contact)}
            changed={changedLine(data.meta, "contact")}
          />
          <FaqEditor
            initial={data.content.faq ?? defaultFaq}
            edited={Boolean(data.meta.faq)}
            changed={changedLine(data.meta, "faq")}
          />
          <TextsEditor
            initial={data.content.texts}
            defaults={defaultTexts}
            edited={Boolean(data.meta.texts)}
            changed={changedLine(data.meta, "texts")}
          />
        </fieldset>
      ) : (
        <p role="alert" className="mt-6 rounded-xl bg-blush-50 px-4 py-3 text-sm text-blush-900">
          {t.loadError}
        </p>
      )}
    </AdminShell>
  );
}

function changedLine(meta: Partial<Record<keyof SiteContent, ContentMeta>>, field: keyof SiteContent) {
  const entry = meta[field];
  return entry
    ? interpolate(t.lastChanged, { date: formatAdminDate(entry.updatedAt), name: entry.updatedBy ?? "—" })
    : t.usingDefault;
}
