"use client";

import { Moon } from "lucide-react";

import { useStoreSettings } from "@/components/providers/settings-provider";
import { useI18n } from "@/i18n/i18n-provider";
import { cn } from "@/lib/utils";

/**
 * Store closed = orders are pre-orders: says so, with the owner's own text (admin settings) below.
 * Nothing while the store is open. `show`: it closed after this page was loaded.
 */
export function StoreClosedNotice({ show = false, className }: { show?: boolean; className?: string }) {
  const { locale, dict } = useI18n();
  const { storeOpen, closedMessage } = useStoreSettings();
  if (storeOpen && !show) return null;
  return (
    <div
      role="status"
      className={cn("flex items-start gap-3 rounded-2xl border border-blush-200 bg-blush-50 p-4 text-left", className)}
    >
      <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-blush-100 text-blush-700">
        <Moon className="size-5" aria-hidden="true" />
      </span>
      <div className="min-w-0">
        <p className="font-bold text-ink-900">{dict.storeClosed.title}</p>
        <p className="mt-0.5 text-sm text-ink-700">{dict.preorder.info}</p>
        <p className="mt-2 text-sm break-words whitespace-pre-line text-ink-700">
          {closedMessage[locale] || closedMessage.id}
        </p>
      </div>
    </div>
  );
}
