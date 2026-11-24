import { ExternalLink, LogOut } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

import { adminCopy } from "@/app/admin/copy";
import { Logo } from "@/components/ui/logo";
import { cn } from "@/lib/utils";
import type { AdminUser } from "@/server/auth/admin";
import { logoutAction } from "@/server/admin/actions";

const t = adminCopy.nav;

/** Header + page frame for logged-in admin pages. */
export function AdminShell({
  admin,
  current,
  children,
}: {
  admin: AdminUser;
  current: "orders" | "reviews" | "content" | "settings";
  children: ReactNode;
}) {
  return (
    <>
      <header className="sticky top-0 z-20 border-b border-brand-100 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-3 px-4 pt-1 sm:h-16 sm:flex-nowrap sm:px-6 sm:pt-0">
          <Link
            href="/admin"
            className="flex min-h-11 shrink-0 items-center gap-2 rounded-xl focus-visible:ring-2 focus-visible:ring-brand-400 focus-visible:outline-none"
          >
            <Logo eager height={32} />
            <span className="hidden rounded-full bg-ink-900 px-2 py-0.5 text-[11px] font-bold tracking-wider text-white uppercase sm:inline">
              Admin
            </span>
          </Link>
          <nav aria-label="Admin" className="order-last -mx-2 no-scrollbar flex w-full min-w-0 gap-0.5 overflow-x-auto pb-1 sm:order-none sm:mx-0 sm:ml-2 sm:w-auto sm:gap-1 sm:pb-0">
            {(
              [
                ["orders", "/admin", t.orders],
                ["reviews", "/admin/reviews", t.reviews],
                ["content", "/admin/content", t.content],
                ["settings", "/admin/settings", t.settings],
              ] as const
            ).map(([key, href, label]) => (
              <Link
                key={key}
                href={href}
                aria-current={current === key ? "page" : undefined}
                className={cn(
                  "inline-flex h-11 shrink-0 items-center rounded-xl px-2.5 text-sm font-semibold transition-colors sm:px-3",
                  current === key ? "bg-brand-100 text-ink-900" : "text-ink-500 hover:bg-brand-50 hover:text-ink-900",
                )}
              >
                {label}
              </Link>
            ))}
          </nav>
          <div className="ml-auto flex shrink-0 items-center gap-1">
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
                <span className="sr-only sm:not-sr-only">{t.logout}</span>
              </button>
            </form>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8">{children}</main>
    </>
  );
}
