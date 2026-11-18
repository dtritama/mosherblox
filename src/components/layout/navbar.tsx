"use client";

import { AnimatePresence, m } from "motion/react";
import { Menu, X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

import { LanguageSwitcher } from "@/components/layout/language-switcher";
import { buttonVariants } from "@/components/ui/button";
import { Container } from "@/components/ui/container";
import { Logo } from "@/components/ui/logo";
import { navItems } from "@/config/site";
import { localeHref } from "@/i18n/config";
import { useI18n } from "@/i18n/i18n-provider";
import { cn } from "@/lib/utils";
import { RobuxIcon } from "@/components/ui/robux-icon";

function useScrolled(threshold = 12) {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > threshold);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [threshold]);
  return scrolled;
}

/** Tracks which section is currently in the middle of the viewport. */
function useActiveSection(ids: readonly string[]) {
  const [active, setActive] = useState<string | null>(null);
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) setActive(entry.target.id);
        }
      },
      { rootMargin: "-45% 0px -50% 0px" },
    );
    for (const id of ids) {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    }
    return () => observer.disconnect();
  }, [ids]);
  return active;
}

/** Home-page sections that the navbar highlights while scrolling. */
const sectionIds = navItems.filter((item) => item.href.startsWith("#")).map((item) => item.href.slice(1));

export function Navbar() {
  const scrolled = useScrolled();
  const activeSection = useActiveSection(sectionIds);
  const [open, setOpen] = useState(false);
  const { locale, dict } = useI18n();
  const pathname = usePathname();
  const homePath = localeHref(locale);

  /** Section links are active while scrolling the home page; page links while on that page. */
  const isActive = (href: string) =>
    href.startsWith("#")
      ? pathname === homePath && activeSection === href.slice(1)
      : pathname.startsWith(localeHref(locale, href));

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => event.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <header
      className={cn(
        "fixed inset-x-0 top-0 z-50 transition-[background-color,box-shadow,backdrop-filter] duration-300",
        scrolled || open
          ? "bg-white/85 shadow-[0_1px_0_0_rgb(134_201_43/0.2),0_8px_30px_-12px_rgb(16_22_10/0.15)] backdrop-blur-xl"
          : "bg-transparent",
      )}
    >
      <Container className="flex h-16 items-center justify-between gap-4 lg:h-18">
        <Link href={homePath} aria-label={dict.nav.home} className="shrink-0">
          <Logo eager height={48} />
        </Link>

        <nav aria-label={dict.nav.main} className="hidden lg:block">
          <ul className="flex items-center gap-1 rounded-full border border-brand-100 bg-white/60 p-1 backdrop-blur">
            {navItems.map((item) => {
              const active = isActive(item.href);
              return (
                <li key={item.href}>
                  <Link
                    href={localeHref(locale, item.href)}
                    aria-current={active ? (item.href.startsWith("#") ? "true" : "page") : undefined}
                    className={cn(
                      "block rounded-full px-4 py-2 text-sm font-medium transition-colors duration-200",
                      active
                        ? "bg-brand-400 text-ink-900 shadow-md shadow-brand-500/30"
                        : "text-ink-700 hover:text-brand-700",
                    )}
                  >
                    {dict.nav.items[item.key]}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        <div className="flex items-center gap-2">
          <LanguageSwitcher />
          <Link
            href={localeHref(locale, "/robux")}
            className={buttonVariants({ size: "sm", className: "hidden sm:inline-flex" })}
          >
            <RobuxIcon className="size-4" aria-hidden="true" />
            {dict.nav.buyRobux}
          </Link>
          <button
            type="button"
            onClick={() => setOpen((value) => !value)}
            aria-expanded={open}
            aria-controls="mobile-nav"
            aria-label={open ? dict.nav.closeMenu : dict.nav.openMenu}
            className="grid size-10 place-items-center rounded-xl border border-brand-100 bg-white text-ink-900 lg:hidden"
          >
            {open ? <X className="size-5" /> : <Menu className="size-5" />}
          </button>
        </div>
      </Container>

      <AnimatePresence initial={false}>
        {open ? (
          <m.nav
            id="mobile-nav"
            aria-label={dict.nav.mobile}
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
            className="overflow-hidden border-t border-brand-100 lg:hidden"
          >
            <Container className="grid gap-1 py-3">
              {navItems.map((item, index) => (
                <m.div
                  key={item.href}
                  initial={{ opacity: 0, x: -12 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.04 * index }}
                >
                  <Link
                    href={localeHref(locale, item.href)}
                    onClick={() => setOpen(false)}
                    aria-current={isActive(item.href) && !item.href.startsWith("#") ? "page" : undefined}
                    className={cn(
                      "block rounded-xl px-3 py-3 text-base font-medium text-ink-900 hover:bg-brand-50",
                      isActive(item.href) && "bg-brand-50",
                    )}
                  >
                    {dict.nav.items[item.key]}
                  </Link>
                </m.div>
              ))}
              <Link
                href={localeHref(locale, "/robux")}
                onClick={() => setOpen(false)}
                className={buttonVariants({ className: "mt-2 w-full" })}
              >
                <RobuxIcon className="size-4" aria-hidden="true" />
                {dict.nav.buyRobux}
              </Link>
            </Container>
          </m.nav>
        ) : null}
      </AnimatePresence>
    </header>
  );
}
