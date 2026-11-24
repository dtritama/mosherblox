"use client";

import { Moon } from "lucide-react";

import { useStoreSettings } from "@/components/providers/settings-provider";
import { useI18n } from "@/i18n/i18n-provider";
import { cn } from "@/lib/utils";

/** "Toko lagi offline" + the owner's text (admin settings). Nothing while the store is open. */
export function StoreClosedNotice({ className }: { className?: string }) {
  const { locale, dict } = useI18n();
  const { storeOpen, closedMessage } = useStoreSettings();
  if (storeOpen) return null;
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
        <p className="mt-0.5 text-sm break-words whitespace-pre-line text-ink-700">
          {closedMessage[locale] || closedMessage.id}
        </p>
      </div>
    </div>
  );
}
