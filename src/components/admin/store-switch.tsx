"use client";

import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { adminCopy } from "@/app/admin/copy";
import { cn } from "@/lib/utils";
import { setStoreOpenAction } from "@/server/admin/settings-actions";

const t = adminCopy.storeStatus;

/** Header button: opens / closes the store for new orders (owner; staff only see the state). */
export function StoreSwitch({ open, owner }: { open: boolean; owner: boolean }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [failed, setFailed] = useState(false);

  const toggle = () => {
    if (!window.confirm(open ? t.confirmClose : t.confirmOpen)) return;
    startTransition(async () => {
      const result = await setStoreOpenAction(!open).catch(() => ({ ok: false }));
      setFailed(!result.ok);
      router.refresh();
    });
  };

  return (
    <button
      type="button"
      role="switch"
      aria-checked={open}
      aria-label={t.label}
      title={failed ? t.failed : open ? t.hintOpen : t.hintClosed}
      disabled={!owner || pending}
      onClick={toggle}
      className={cn(
        "inline-flex h-11 items-center gap-2 rounded-xl border px-3 text-sm font-semibold whitespace-nowrap transition-colors disabled:cursor-default",
        open
          ? "border-brand-200 bg-brand-50 text-brand-800 enabled:hover:border-brand-400"
          : "border-blush-200 bg-blush-50 text-blush-800 enabled:hover:border-blush-400",
      )}
    >
      {pending ? (
        <Loader2 className="size-4 animate-spin" aria-hidden="true" />
      ) : (
        <span aria-hidden="true" className={cn("size-2.5 rounded-full", open ? "bg-brand-500" : "bg-blush-500")} />
      )}
      {failed ? t.failed : open ? t.open : t.closed}
    </button>
  );
}
