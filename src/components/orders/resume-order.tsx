"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

import { localeHref } from "@/i18n/config";
import { useI18n } from "@/i18n/i18n-provider";

/** Query param the checkout success screen puts in the address bar (`?order=MB-…`). */
export const RESUME_PARAM = "order";

/**
 * A page loaded with `?order=MB-…` (a refresh right after checkout, or a saved link) goes to
 * Check Order with that order, which opens it at once when this device remembers it.
 * Mounted once in the [lang] layout, so it only looks at the address of the first page load —
 * the success screen setting the param later doesn't trigger it.
 */
export function ResumeOrder() {
  const { locale } = useI18n();
  const router = useRouter();

  useEffect(() => {
    const id = new URL(window.location.href).searchParams.get(RESUME_PARAM);
    const checkOrderPath = localeHref(locale, "/check-order");
    if (!id || !/^MB-[A-Z0-9]{4,13}$/.test(id) || window.location.pathname === checkOrderPath) return;
    router.replace(`${checkOrderPath}?id=${encodeURIComponent(id)}`);
    // Only the first page load counts.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return null;
}
