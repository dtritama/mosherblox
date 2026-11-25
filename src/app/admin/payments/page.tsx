import { Lock } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";

import { adminCopy } from "@/app/admin/copy";
import { AdminShell } from "@/components/admin/admin-shell";
import { PaymentMethods } from "@/components/admin/payment-methods";
import { PaymentLogo } from "@/components/ui/payment-logo";
import { QRIS_LOGO } from "@/data/payment-brands";
import { interpolate } from "@/i18n/format";
import { requireAdmin } from "@/server/auth/admin";
import { listPaymentMethods } from "@/server/payment-methods";
import { getFreshSettings } from "@/server/settings";

export const metadata: Metadata = { title: adminCopy.payments.title };

const t = adminCopy.payments;

export default function AdminPaymentsPage() {
  return (
    <Suspense fallback={<div className="mx-auto h-96 max-w-6xl animate-pulse px-4 py-24" aria-busy="true" />}>
      <Payments />
    </Suspense>
  );
}

async function Payments() {
  const admin = await requireAdmin();
  const [methods, { qris }] = await Promise.all([listPaymentMethods(), getFreshSettings()]);
  const owner = admin.role === "owner";

  return (
    <AdminShell admin={admin} current="payments">
      <h1 className="text-2xl font-bold text-ink-900">{t.title}</h1>
      <p className="mt-1 max-w-2xl text-sm text-ink-500">{t.description}</p>
      {!owner ? (
        <p className="mt-4 flex items-center gap-2 rounded-xl bg-blush-50 px-4 py-3 text-sm text-blush-900">
          <Lock className="size-4 shrink-0" aria-hidden="true" />
          {t.ownerOnly}
        </p>
      ) : null}

      <section
        aria-label="QRIS"
        className="mt-6 flex flex-wrap items-center gap-4 rounded-[1.75rem] border border-brand-100 bg-white p-4 sm:p-5"
      >
        <PaymentLogo name="QRIS" logo={QRIS_LOGO} className="h-12 w-20 p-1.5" />
        <div className="min-w-0 flex-1">
          <h2 className="font-bold text-ink-900">QRIS</h2>
          <p className="text-sm text-ink-500">{interpolate(t.qris, { name: qris.merchantName })}</p>
        </div>
        <Link
          href="/admin/settings#settings-qris"
          className="inline-flex h-11 items-center rounded-xl border border-brand-200 px-4 text-sm font-semibold text-ink-900 transition-colors hover:border-brand-400 max-sm:w-full max-sm:justify-center"
        >
          {t.qrisEdit}
        </Link>
      </section>

      <PaymentMethods methods={methods} owner={owner} />
    </AdminShell>
  );
}
