"use client";

import { ImageUp, Loader2, Trash2, Upload, X } from "lucide-react";
import { useRouter } from "next/navigation";
import {
  useEffect,
  useEffectEvent,
  useId,
  useRef,
  useState,
  useTransition,
  type DragEvent,
  type ReactNode,
} from "react";

import { adminCopy } from "@/app/admin/copy";
import { SubmitError } from "@/components/checkout/submit-error";
import { Button } from "@/components/ui/button";
import { orderConfig } from "@/data/orders";
import { interpolate } from "@/i18n/format";
import { cn } from "@/lib/utils";
import { deliveryProofAction, type DeliveryProofState } from "@/server/admin/actions";

const t = adminCopy.delivery;
const MAX = orderConfig.deliveryProofMax;

interface Draft {
  id: string;
  file: File;
  url: string;
}

async function send(fields: Record<string, string | File>): Promise<DeliveryProofState> {
  const formData = new FormData();
  for (const [key, value] of Object.entries(fields)) formData.set(key, value);
  return deliveryProofAction(formData).catch((): DeliveryProofState => ({ error: "unavailable" }));
}

/**
 * "Bukti pengiriman" on the admin order page: screenshots showing the Robux / item was sent, up to 6.
 * Pick, drop or paste (Ctrl/Cmd+V) images → previews → upload (one request per image, so each stays
 * under the upload limit). The buyer sees the saved ones on Check Order.
 */
export function DeliveryProof({
  orderId,
  saved,
  canUpload,
}: {
  orderId: string;
  saved: { file: string; url: string }[];
  /** Only once the order is paid (paid / processing / completed). */
  canUpload: boolean;
}) {
  const router = useRouter();
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const [busy, startBusy] = useTransition();
  const fileId = useId();
  const free = MAX - saved.length - drafts.length;

  // Free the preview URLs when leaving the page.
  const urls = useRef(new Set<string>());
  useEffect(() => {
    const open = urls.current;
    return () => open.forEach((url) => URL.revokeObjectURL(url));
  }, []);

  const add = (files: Iterable<File>) => {
    if (busy) return;
    setError(null);
    const next: Draft[] = [];
    for (const file of files) {
      if (!(orderConfig.proofTypes as readonly string[]).includes(file.type)) setError(t.errors.badImage);
      else if (file.size > orderConfig.proofMaxBytes) setError(t.errors.tooBig);
      else if (next.length >= free) setError(t.errors.tooMany);
      else {
        const url = URL.createObjectURL(file);
        urls.current.add(url);
        next.push({ id: crypto.randomUUID(), file, url });
      }
    }
    if (next.length > 0) setDrafts((list) => [...list, ...next]);
  };

  const discard = (draft: Draft) => {
    URL.revokeObjectURL(draft.url);
    urls.current.delete(draft.url);
    setDrafts((list) => list.filter((item) => item.id !== draft.id));
  };

  const upload = () =>
    startBusy(async () => {
      setError(null);
      for (const draft of drafts) {
        const result = await send({ orderId, intent: "upload", image: draft.file });
        if (!result.ok) {
          // The ones already sent are saved; this one and the rest stay here to retry.
          setError(t.errors[result.error ?? "unavailable"]);
          break;
        }
        discard(draft);
      }
      router.refresh();
    });

  const remove = (file: string) => {
    if (!window.confirm(t.confirmRemove)) return;
    startBusy(async () => {
      const result = await send({ orderId, intent: "remove", file });
      setError(result.error ? t.errors[result.error] : null);
      router.refresh();
    });
  };

  const onPaste = useEffectEvent((event: ClipboardEvent) => {
    // Only images; pasting text into the note field keeps working.
    const files = [...(event.clipboardData?.files ?? [])].filter((file) => file.type.startsWith("image/"));
    if (files.length === 0) return;
    event.preventDefault();
    add(files);
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
          add(event.dataTransfer.files);
        },
      }
    : {};

  return (
    <div
      {...dropHandlers}
      className={cn(
        "grid grid-cols-[minmax(0,1fr)] gap-4 transition-colors",
        canUpload && "rounded-2xl border-2 border-dashed p-4",
        canUpload && (dragging ? "border-brand-500 bg-brand-50" : "border-brand-200"),
      )}
    >
      {saved.length > 0 ? (
        <div className="grid gap-2">
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {saved.map(({ file, url }, index) => (
              <Tile
                key={file}
                url={url}
                href={url}
                alt={interpolate(t.alt, { id: orderId, number: index + 1 })}
                button={
                  canUpload ? (
                    <TileButton
                      label={interpolate(t.removeOne, { number: index + 1 })}
                      disabled={busy}
                      onClick={() => remove(file)}
                    >
                      <Trash2 className="size-4" aria-hidden="true" />
                    </TileButton>
                  ) : null
                }
              />
            ))}
          </ul>
          <p className="text-xs text-ink-500">{interpolate(t.visible, { count: saved.length, max: MAX })}</p>
        </div>
      ) : (
        <p className="text-sm text-ink-500">{canUpload ? t.empty : t.notYet}</p>
      )}

      {drafts.length > 0 ? (
        <div className="grid gap-2">
          <p className="text-sm font-semibold text-blush-700">{interpolate(t.notSaved, { count: drafts.length })}</p>
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {drafts.map((draft) => (
              <Tile
                key={draft.id}
                url={draft.url}
                alt={draft.file.name}
                draft
                button={
                  <TileButton
                    label={interpolate(t.discard, { name: draft.file.name })}
                    disabled={busy}
                    onClick={() => discard(draft)}
                  >
                    <X className="size-4" aria-hidden="true" />
                  </TileButton>
                }
              />
            ))}
          </ul>
        </div>
      ) : null}

      {canUpload ? (
        <>
          <div className="flex flex-wrap items-center gap-2">
            {free > 0 ? (
              <>
                <span className="relative inline-flex">
                  <input
                    id={fileId}
                    type="file"
                    multiple
                    accept={orderConfig.proofTypes.join(",")}
                    disabled={busy}
                    onChange={(event) => {
                      add([...(event.target.files ?? [])]);
                      event.target.value = ""; // the same file can be picked again
                    }}
                    className="peer sr-only"
                  />
                  <label
                    htmlFor={fileId}
                    className="inline-flex h-11 cursor-pointer items-center gap-2 rounded-xl bg-brand-100 px-4 text-sm font-semibold text-brand-800 transition-colors peer-focus-visible:ring-2 peer-focus-visible:ring-brand-400 peer-focus-visible:ring-offset-2 peer-disabled:pointer-events-none peer-disabled:opacity-60 hover:bg-brand-200 active:scale-[0.97]"
                  >
                    <ImageUp className="size-4" aria-hidden="true" />
                    {saved.length + drafts.length > 0 ? t.addMore : t.choose}
                  </label>
                </span>
                <p className="text-sm text-ink-500">{dragging ? t.dropNow : t.dropHint}</p>
              </>
            ) : (
              <p className="text-sm text-ink-500">{interpolate(t.full, { max: MAX })}</p>
            )}
          </div>
          {drafts.length > 0 ? (
            <Button onClick={upload} disabled={busy} className="justify-self-start">
              {busy ? (
                <Loader2 className="size-4 animate-spin" aria-hidden="true" />
              ) : (
                <Upload className="size-4" aria-hidden="true" />
              )}
              {busy ? t.uploading : interpolate(t.upload, { count: drafts.length })}
            </Button>
          ) : null}
          <p className="text-xs text-ink-500">{interpolate(t.hint, { max: MAX })}</p>
        </>
      ) : null}
      <SubmitError message={error} />
    </div>
  );
}

function Tile({
  url,
  href,
  alt,
  draft,
  button,
}: {
  url: string;
  href?: string;
  alt: string;
  draft?: boolean;
  button: ReactNode;
}) {
  // Local blob preview or our own route: a plain <img> keeps it simple and exact.
  const image = (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={url} alt={alt} className="aspect-[3/4] w-full bg-brand-50/60 object-contain" />
  );
  return (
    <li
      className={cn(
        "relative min-w-0 overflow-hidden rounded-2xl border",
        draft ? "border-dashed border-blush-300" : "border-brand-100",
      )}
    >
      {href ? (
        <a href={href} target="_blank" rel="noopener" className="block">
          {image}
        </a>
      ) : (
        image
      )}
      {button}
    </li>
  );
}

function TileButton({
  label,
  disabled,
  onClick,
  children,
}: {
  label: string;
  disabled: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      disabled={disabled}
      onClick={onClick}
      className="absolute top-1.5 right-1.5 grid size-11 place-items-center rounded-xl bg-white/90 text-blush-700 shadow-sm transition-colors hover:bg-blush-50 disabled:opacity-60"
    >
      {children}
    </button>
  );
}
