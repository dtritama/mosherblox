import type { Metadata, Viewport } from "next";

import { adminCopy } from "@/app/admin/copy";
import { poppins } from "@/app/fonts/poppins";
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
  colorScheme: "light",
};

export default function AdminRootLayout({ children }: LayoutProps<"/admin">) {
  return (
    <html lang="id" className={`${poppins.variable} bg-white`}>
      <body className="min-h-dvh bg-brand-50/50 text-ink-900" suppressHydrationWarning>
        <MotionProvider>{children}</MotionProvider>
      </body>
    </html>
  );
}
