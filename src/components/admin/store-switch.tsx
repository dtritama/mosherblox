"use client";

import { Loader2, Moon, Store } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useId, useRef, useState, useTransition } from "react";

import { adminCopy } from "@/app/admin/copy";
import { SubmitError } from "@/components/checkout/submit-error";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { setStoreOpenAction } from "@/server/admin/settings-actions";

const t = adminCopy.storeStatus;

/**
 * Header button: opens / closes the store for new orders (owner; staff only see the state).
 * Asks first in a native <dialog> (top layer: focus stays inside, Esc closes, page behind is inert).
 */
export function StoreSwitch({ open, owner, closedMessage }: { open: boolean; owner: boolean; closedMessage: string }) {
  const router = useRouter();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);
  const titleId = useId();
  const textId = useId();
  const [pending, startTransition] = useTransition();
  const [failed, setFailed] = useState(false);
  // What the dialog asks. Kept apart from `open` so the text doesn't flip while it closes.
  const [closing, setClosing] = useState(open);
  const Icon = closing ? Moon : Store;

  const ask = () => {
    setClosing(open);
    setFailed(false);
    dialogRef.current?.showModal();
    // Enter by accident changes nothing.
    cancelRef.current?.focus();
  };

  const confirm = () =>
    startTransition(async () => {
      const result = await setStoreOpenAction(!closing).catch(() => ({ ok: false }));
      if (!result.ok) return setFailed(true);
      dialogRef.current?.close();
      router.refresh();
    });

  return (
    <>
      <button
        type="button"
        aria-haspopup="dialog"
        title={open ? t.hintOpen : t.hintClosed}
        disabled={!owner || pending}
        onClick={ask}
        className={cn(
          "inline-flex h-11 items-center gap-2 rounded-xl border px-3 text-sm font-semibold whitespace-nowrap transition-colors disabled:cursor-default",
          open
            ? "border-brand-200 bg-brand-50 text-brand-800 enabled:hover:border-brand-400"
            : "border-blush-200 bg-blush-50 text-blush-800 enabled:hover:border-blush-400",
        )}
      >
        <span aria-hidden="true" className={cn("size-2.5 rounded-full", open ? "bg-brand-500" : "bg-blush-500")} />
        {open ? t.open : t.closed}
      </button>

      <dialog
        ref={dialogRef}
        aria-labelledby={titleId}
        aria-describedby={textId}
        // While saving, Esc and the backdrop don't hide a change that is still running.
        onCancel={(event) => pending && event.preventDefault()}
        onClick={(event) => {
          if (event.target === event.currentTarget && !pending) event.currentTarget.close();
        }}
        className="m-auto w-[calc(100%-2rem)] max-w-md translate-y-0 rounded-[1.75rem] bg-white p-0 text-ink-900 opacity-100 shadow-2xl transition-[opacity,translate] duration-200 backdrop:bg-coal/50 dark:border dark:border-brand-100 dark:backdrop:bg-black/60 backdrop:backdrop-blur-sm starting:open:translate-y-3 starting:open:opacity-0"
      >
        <div className="p-6">
          <span
            className={cn(
              "grid size-12 place-items-center rounded-2xl",
              closing ? "bg-blush-100 text-blush-700" : "bg-brand-100 text-brand-700",
            )}
          >
            <Icon className="size-6" aria-hidden="true" />
          </span>
          <h2 id={titleId} className="mt-4 text-xl font-bold">
            {closing ? t.closeTitle : t.openTitle}
          </h2>
          <p id={textId} className="mt-1.5 text-sm text-ink-700">
            {closing ? t.closeText : t.openText}
          </p>

          {closing ? (
            <div className="mt-4 rounded-2xl border border-blush-200 bg-blush-50 p-4">
              <p className="text-xs font-semibold text-blush-800">{t.preview}</p>
              <p className="mt-1 max-h-40 overflow-y-auto text-sm break-words whitespace-pre-line text-ink-900">
                {closedMessage}
              </p>
              <Link
                href="/admin/settings"
                onClick={() => dialogRef.current?.close()}
                className="mt-2 inline-flex min-h-11 items-center text-sm font-semibold text-blush-800 underline underline-offset-4 hover:text-blush-900"
              >
                {t.edit}
              </Link>
            </div>
          ) : null}

          <SubmitError message={failed ? t.failed : null} className="mt-4" />

          <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button ref={cancelRef} variant="outline" disabled={pending} onClick={() => dialogRef.current?.close()}>
              {t.cancel}
            </Button>
            <Button variant={closing ? "pink" : "primary"} disabled={pending} onClick={confirm}>
              {pending ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : null}
              {pending ? t.saving : closing ? t.closeConfirm : t.openConfirm}
            </Button>
          </div>
        </div>
      </dialog>
    </>
  );
}
