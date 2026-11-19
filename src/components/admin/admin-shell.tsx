import { ExternalLink, LogOut } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

import { adminCopy } from "@/app/admin/copy";
import { Logo } from "@/components/ui/logo";
import type { AdminUser } from "@/server/auth/admin";
import { logoutAction } from "@/server/admin/actions";

const t = adminCopy.nav;

/** Header + page frame for logged-in admin pages. */
export function AdminShell({ admin, children }: { admin: AdminUser; children: ReactNode }) {
  return (
    <>
      <header className="sticky top-0 z-20 border-b border-brand-100 bg-white/90 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center gap-3 px-4 sm:px-6">
          <Link
            href="/admin"
            className="flex items-center gap-2 rounded-xl focus-visible:ring-2 focus-visible:ring-brand-400 focus-visible:outline-none"
          >
            <Logo eager height={32} />
            <span className="hidden rounded-full bg-ink-900 px-2 py-0.5 text-[11px] font-bold tracking-wider text-white uppercase sm:inline">
              Admin
            </span>
          </Link>
          <nav aria-label="Admin" className="ml-2 hidden sm:block">
            <Link
              href="/admin"
              className="inline-flex h-11 items-center rounded-xl px-3 text-sm font-semibold text-ink-900 hover:bg-brand-50"
            >
              {t.orders}
            </Link>
          </nav>
          <div className="ml-auto flex items-center gap-1">
            <a
              href="/id"
              target="_blank"
              rel="noopener"
              className="hidden h-11 items-center gap-1.5 rounded-xl px-3 text-sm text-ink-500 hover:bg-brand-50 hover:text-ink-900 md:inline-flex"
            >
              {t.site}
              <ExternalLink className="size-3.5" aria-hidden="true" />
            </a>
            <span className="hidden max-w-40 truncate px-2 text-sm text-ink-500 sm:inline" title={admin.email}>
              {admin.name}
            </span>
            <form action={logoutAction}>
              <button
                type="submit"
                className="inline-flex h-11 items-center gap-1.5 rounded-xl px-3 text-sm font-semibold text-ink-700 transition-colors hover:bg-blush-50 hover:text-blush-800 active:scale-[0.97]"
              >
                <LogOut className="size-4" aria-hidden="true" />
                {t.logout}
              </button>
            </form>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8">{children}</main>
    </>
  );
}
