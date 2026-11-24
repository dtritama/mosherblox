import type { Metadata, Viewport } from "next";

import { adminCopy } from "@/app/admin/copy";
import { poppins } from "@/app/fonts/poppins";
import { THEME_SCRIPT } from "@/components/layout/theme-toggle";
import { MotionProvider } from "@/components/providers/motion-provider";
import { siteConfig } from "@/config/site";

import "../globals.css";

/**
 * Root layout of the admin panel (separate from the public /id and /en site: no navbar, footer
 * or locale). Every page here reads the admin session cookie, so navigations block on the
 * server instead of prerendering an instant shell.
 */
export const instant = false;

export const metadata: Metadata = {
  title: { default: adminCopy.title, template: `%s · ${adminCopy.title}` },
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  themeColor: siteConfig.themeColor,
  // color-scheme comes from CSS: the theme is the visitor's choice (shared with the store).
};

export default function AdminRootLayout({ children }: LayoutProps<"/admin">) {
  return (
    <html lang="id" className={`${poppins.variable} bg-white dark:bg-(--page-bg)`} suppressHydrationWarning>
      <head>
        {/* Before paint: no white flash in dark mode. suppressHydrationWarning: it sets data-theme. */}
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
      </head>
      <body className="min-h-dvh bg-brand-50/50 text-ink-900 dark:bg-(--page-bg)" suppressHydrationWarning>
        <MotionProvider>{children}</MotionProvider>
      </body>
    </html>
  );
}
