import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";

import { adminCopy } from "@/app/admin/copy";
import { LoginForm } from "@/components/admin/login-form";
import { ThemeButton } from "@/components/layout/theme-toggle";
import { Logo } from "@/components/ui/logo";
import { getAdmin } from "@/server/auth/admin";

export const metadata: Metadata = { title: adminCopy.login.title };

/** Already logged in? Go straight to the orders. Reads the cookie, so it sits behind Suspense. */
async function RedirectIfLoggedIn() {
  if (await getAdmin()) redirect("/admin");
  return null;
}

export default function AdminLoginPage() {
  const t = adminCopy.login;
  return (
    <main className="relative grid min-h-dvh place-items-center px-4 py-10">
      <Suspense>
        <RedirectIfLoggedIn />
      </Suspense>
      <div className="absolute top-4 right-4">
        <ThemeButton labels={adminCopy.theme} className="size-11" />
      </div>
      <div className="w-full max-w-sm">
        <Logo eager height={44} className="mx-auto" />
        <div className="mt-6 rounded-[1.75rem] border border-brand-100 bg-white p-6 shadow-xl shadow-brand-900/5 sm:p-8">
          <h1 className="text-xl font-bold text-ink-900">{t.title}</h1>
          <p className="mt-1 text-sm text-ink-500">{t.description}</p>
          <div className="mt-6">
            <LoginForm />
          </div>
        </div>
      </div>
    </main>
  );
}
