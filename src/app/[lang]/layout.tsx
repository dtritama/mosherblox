import type { Metadata, Viewport } from "next";
import { notFound } from "next/navigation";

import { poppins } from "@/app/fonts/poppins";

import { BackToTop } from "@/components/layout/back-to-top";
import { Footer } from "@/components/layout/footer";
import { Navbar } from "@/components/layout/navbar";
import { NightDecor } from "@/components/layout/night-decor";
import { ResumeOrder } from "@/components/orders/resume-order";
import { THEME_SCRIPT } from "@/components/layout/theme-toggle";
import { ScrollProgress } from "@/components/layout/scroll-progress";
import { MotionProvider } from "@/components/providers/motion-provider";
import { SettingsProvider } from "@/components/providers/settings-provider";
import { TopUpProvider } from "@/components/topup/topup-provider";
import { siteConfig } from "@/config/site";
import { hasLocale, locales, ogLocales } from "@/i18n/config";
import { getContentDictionary, getDictionaryFor } from "@/i18n/get-dictionary";
import { localeAlternates } from "@/i18n/metadata";
import { I18nProvider } from "@/i18n/i18n-provider";
import { getPaymentOptions } from "@/server/payment-methods";
import { getSiteSettings } from "@/server/settings";
import { getNavItems } from "@/server/nav";
import { getSiteContent } from "@/server/site-content";
import { getPublicStats } from "@/server/stats";

import "../globals.css";

/** Pre-render every locale at build time (/id and /en are fully static). */
export function generateStaticParams() {
  return locales.map((lang) => ({ lang }));
}

export async function generateMetadata({ params }: LayoutProps<"/[lang]">): Promise<Metadata> {
  const { lang } = await params;
  if (!hasLocale(lang)) return {};
  const { meta } = getDictionaryFor(lang);

  return {
    metadataBase: new URL(siteConfig.url),
    title: { default: meta.title, template: `%s · ${siteConfig.name}` },
    description: meta.description,
    applicationName: siteConfig.name,
    keywords: [...meta.keywords, siteConfig.name],
    alternates: localeAlternates(lang),
    openGraph: {
      type: "website",
      siteName: siteConfig.name,
      title: meta.ogTitle,
      description: meta.description,
      locale: ogLocales[lang],
      alternateLocale: locales.filter((locale) => locale !== lang).map((locale) => ogLocales[locale]),
      url: `/${lang}`,
    },
    twitter: { card: "summary_large_image", title: meta.ogTitle, description: meta.description },
    robots: { index: true, follow: true },
  };
}

export const viewport: Viewport = {
  themeColor: siteConfig.themeColor,
  // color-scheme comes from CSS (:root / [data-theme="dark"] in globals.css): the theme is the visitor's choice.
};

export default async function RootLayout({ children, params }: LayoutProps<"/[lang]">) {
  const { lang } = await params;
  if (!hasLocale(lang)) notFound();
  // Admin-editable prices + QRIS (cached; refreshed right after a save in /admin/settings).
  // + home content (/admin/content): texts in the dictionary, contact links.
  const [{ robuxRates, qris, soldOut, robuxStock, storeOpen, closedMessage }, stats, { contact }, dict, navItems, paymentOptions] = await Promise.all([
    getSiteSettings(),
    getPublicStats(),
    getSiteContent(),
    getContentDictionary(lang),
    getNavItems(),
    getPaymentOptions(),
  ]);

  return (
    // suppressHydrationWarning: THEME_SCRIPT sets data-theme on <html> before React loads.
    <html lang={lang} className={poppins.variable} data-scroll-behavior="smooth" suppressHydrationWarning>
      <head>
        {/* Before paint: a visitor who picked dark mode never sees a white flash. */}
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
      </head>
      {/* suppressHydrationWarning: browser extensions (e.g. ColorZilla adds `cz-shortcut-listen`) inject
          attributes into <body> before React loads. This only silences attribute mismatches on this one element. */}
      <body className="min-h-dvh overflow-x-clip" suppressHydrationWarning>
        <a
          href="#main"
          className="sr-only z-100 rounded-lg bg-brand-400 px-4 py-2 font-semibold text-coal focus:not-sr-only focus:fixed focus:top-3 focus:left-3"
        >
          {dict.common.skipToContent}
        </a>
        <I18nProvider locale={lang} dict={dict}>
          <MotionProvider>
            <SettingsProvider value={{ robuxRates, qris, soldOut, robuxStock, storeOpen, closedMessage, stats, contact, paymentOptions }}>
              <TopUpProvider>
                <ScrollProgress />
                <NightDecor />
                <Navbar items={navItems} />
                <main id="main" className="overflow-x-clip">{children}</main>
                <Footer />
                <BackToTop />
                <ResumeOrder />
              </TopUpProvider>
            </SettingsProvider>
          </MotionProvider>
        </I18nProvider>
      </body>
    </html>
  );
}
