"use client";

import { ExternalLink, ImageUp, Loader2, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useActionState, useEffect, useEffectEvent, useId, useRef, useState, type DragEvent } from "react";

import { adminCopy } from "@/app/admin/copy";
import { SubmitError } from "@/components/checkout/submit-error";
import { Button } from "@/components/ui/button";
import { orderConfig } from "@/data/orders";
import { interpolate } from "@/i18n/format";
import { cn } from "@/lib/utils";
import { deliveryProofAction, type DeliveryProofState } from "@/server/admin/actions";

const t = adminCopy.delivery;

/**
 * "Bukti pengiriman" on the admin order page: a screenshot showing the Robux / item was sent.
 * Pick, drop or paste (Ctrl/Cmd+V) an image → preview → upload. Replacing or removing it is one click; the buyer sees the
 * current one on Check Order.
 */
export function DeliveryProof({
  orderId,
  imageUrl,
  uploadedAt,
  canUpload,
}: {
  orderId: string;
  imageUrl: string | null;
  uploadedAt: string | null;
  /** Only once the order is paid (paid / processing / completed). */
  canUpload: boolean;
}) {
  const router = useRouter();
  const [state, formAction, pending] = useActionState<DeliveryProofState, FormData>(deliveryProofAction, {});
  const [preview, setPreview] = useState<{ url: string; name: string } | null>(null);
  const [localError, setLocalError] = useState<string | null>(null);
  const [fileKey, setFileKey] = useState(0);
  const fileId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  // Saved: show the server's version and clear the picker.
  useEffect(() => {
    if (!state.ok) return;
    router.refresh();
  }, [state, router]);

  useEffect(() => () => (preview ? URL.revokeObjectURL(preview.url) : undefined), [preview]);

  const pick = (file: File | undefined) => {
    setLocalError(null);
    if (!file) return setPreview(null);
    if (file.size > orderConfig.proofMaxBytes) {
      setFileKey((key) => key + 1);
      setPreview(null);
      return setLocalError(t.errors.tooBig);
    }
    if (!(orderConfig.proofTypes as readonly string[]).includes(file.type)) {
      setFileKey((key) => key + 1);
      setPreview(null);
      return setLocalError(t.errors.badImage);
    }
    setPreview({ url: URL.createObjectURL(file), name: file.name });
  };

  /** A dropped or pasted file goes into the real file input, so the form submits it as usual. */
  const take = (files: FileList | undefined) => {
    const input = inputRef.current;
    const file = files?.[0];
    if (!input || !file || pending) return;
    const transfer = new DataTransfer();
    transfer.items.add(file);
    input.files = transfer.files;
    pick(file);
  };

  const onPaste = useEffectEvent((event: ClipboardEvent) => {
    // Only images; pasting text into the note field keeps working.
    const files = event.clipboardData?.files;
    if (!files?.length || !files[0].type.startsWith("image/")) return;
    event.preventDefault();
    take(files);
  });
  useEffect(() => {
    if (!canUpload) return;
    const listener = (event: ClipboardEvent) => onPaste(event);
    document.addEventListener("paste", listener);
    return () => document.removeEventListener("paste", listener);
  }, [canUpload]);

  const dropHandlers = canUpload
    ? {
        onDragOver: (event: DragEvent) => {
          if (!event.dataTransfer.types.includes("Files")) return;
          event.preventDefault();
          setDragging(true);
        },
        onDragLeave: (event: DragEvent) => {
          if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setDragging(false);
        },
        onDrop: (event: DragEvent) => {
          if (!event.dataTransfer.types.includes("Files")) return;
          event.preventDefault();
          setDragging(false);
          take(event.dataTransfer.files);
        },
      }
    : {};

  const submit = (formData: FormData) => {
    formAction(formData);
    if (formData.get("intent") === "upload") {
      setPreview(null);
      setFileKey((key) => key + 1);
    }
  };

  const shown = preview?.url ?? imageUrl;
  const error = localError ?? (state.error ? t.errors[state.error] : null);

  return (
    <form
      action={submit}
      {...dropHandlers}
      className={cn(
        "grid gap-4 transition-colors",
        canUpload && "rounded-2xl border-2 border-dashed p-4",
        canUpload && (dragging ? "border-brand-500 bg-brand-50" : "border-brand-200"),
      )}
    >
      <input type="hidden" name="orderId" value={orderId} />

      {shown ? (
        <figure className="grid gap-2">
          <a
            href={preview ? undefined : (imageUrl ?? undefined)}
            target="_blank"
            rel="noopener"
            className="group block w-full max-w-xs overflow-hidden rounded-2xl border border-brand-100"
          >
            {/* Local blob preview or our own route: a plain <img> keeps it simple and exact. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={shown}
              alt={interpolate(t.alt, { id: orderId })}
              className="max-h-96 w-full object-contain transition-transform duration-300 group-hover:scale-[1.02]"
            />
            {!preview ? (
              <span className="flex items-center justify-center gap-1.5 border-t border-brand-100 bg-brand-50 py-2 text-xs font-semibold text-ink-700">
                {adminCopy.detail.openProof}
                <ExternalLink className="size-3.5" aria-hidden="true" />
              </span>
            ) : null}
          </a>
          <figcaption className="text-xs text-ink-500">
            {preview ? interpolate(t.previewOf, { name: preview.name }) : uploadedAt ? t.visible : null}
          </figcaption>
        </figure>
      ) : (
        <p className="text-sm text-ink-500">{canUpload ? t.empty : t.notYet}</p>
      )}

      {canUpload ? (
        <div className="flex flex-wrap items-center gap-2">
          <input
            key={fileKey}
            ref={inputRef}
            id={fileId}
            name="image"
            type="file"
            accept={orderConfig.proofTypes.join(",")}
            onChange={(event) => pick(event.target.files?.[0])}
            className="peer sr-only"
          />
          <label
            htmlFor={fileId}
            className="inline-flex h-11 cursor-pointer items-center gap-2 rounded-xl bg-brand-100 px-4 text-sm font-semibold text-brand-800 transition-colors peer-focus-visible:ring-2 peer-focus-visible:ring-brand-400 peer-focus-visible:ring-offset-2 hover:bg-brand-200 active:scale-[0.97]"
          >
            <ImageUp className="size-4" aria-hidden="true" />
            {imageUrl || preview ? t.chooseOther : t.choose}
          </label>
          <p className="text-sm text-ink-500">{dragging ? t.dropNow : t.dropHint}</p>
          {preview ? (
            <Button type="submit" name="intent" value="upload" disabled={pending}>
              {pending ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : null}
              {t.upload}
            </Button>
          ) : null}
          {imageUrl && !preview ? (
            <button
              type="submit"
              name="intent"
              value="remove"
              disabled={pending}
              onClick={(event) => {
                if (!window.confirm(t.confirmRemove)) event.preventDefault();
              }}
              className="inline-flex h-11 items-center gap-2 rounded-xl px-3 text-sm font-semibold text-blush-700 transition-colors hover:bg-blush-50 disabled:opacity-60"
            >
              <Trash2 className="size-4" aria-hidden="true" />
              {t.remove}
            </button>
          ) : null}
        </div>
      ) : null}

      {canUpload ? <p className="text-xs text-ink-500">{t.hint}</p> : null}
      <SubmitError message={error} />
    </form>
  );
}
