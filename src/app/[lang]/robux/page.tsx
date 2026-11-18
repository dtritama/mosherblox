import type { Metadata } from "next";
import { Suspense } from "react";

import { RobuxPanel } from "@/components/robux/robux-panel";
import { getI18n } from "@/i18n/get-dictionary";
import { localeAlternates } from "@/i18n/metadata";

export async function generateMetadata(): Promise<Metadata> {
  const { locale, dict } = await getI18n();
  return {
    title: dict.robux.metaTitle,
    description: dict.robux.metaDescription,
    alternates: localeAlternates(locale, "/robux"),
  };
}

export default function RobuxPage() {
  return (
    <div className="relative isolate overflow-clip pt-24 pb-14 lg:pt-32 lg:pb-20">
      <div aria-hidden="true" className="absolute inset-x-0 top-0 -z-10 h-[38rem]">
        <div className="absolute inset-0 bg-grid mask-[radial-gradient(ellipse_at_top,black_30%,transparent_75%)]" />
        <div className="absolute -top-32 -right-24 size-[30rem] rounded-full bg-brand-200/70 blur-3xl" />
        <div className="absolute top-10 -left-40 size-[24rem] rounded-full bg-blush-100/70 blur-3xl" />
      </div>
      {/* The panel reads ?method=&amount= (pre-fill from the home page), which needs a Suspense boundary. */}
      <Suspense fallback={<div className="mx-auto h-[40rem] max-w-7xl animate-pulse rounded-[2rem] bg-brand-50" />}>
        <RobuxPanel />
      </Suspense>
    </div>
  );
}
