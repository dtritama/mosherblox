"use client";

import { ArrowDown, ArrowUp, Check, ChevronDown, ImageUp, Loader2, Plus, RotateCcw, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useId, useState, useTransition, type ReactNode } from "react";

import { adminCopy } from "@/app/admin/copy";
import { SubmitError } from "@/components/checkout/submit-error";
import { Button } from "@/components/ui/button";
import { orderConfig } from "@/data/orders";
import { locales, type LocalizedText } from "@/i18n/config";
import { interpolate } from "@/i18n/format";
import {
  CONTENT_LIMITS,
  parseBanners,
  parseContact,
  parseFaq,
  parseTexts,
  TEXT_GROUPS,
  type BannerContent,
  type ContactContent,
  type FaqItemContent,
  type Parsed,
  type SiteContent,
  type TextContent,
} from "@/lib/site-content";
import { cn } from "@/lib/utils";
import {
  resetContentAction,
  saveContentAction,
  uploadBannerAction,
  type ContentState,
} from "@/server/admin/content-actions";

const t = adminCopy.content;
const inputClass =
  "w-full min-w-0 rounded-xl border-2 border-brand-100 bg-white px-3 py-2.5 text-sm text-ink-900 outline-none placeholder:text-ink-500 focus:border-brand-500";
const iconButton =
  "grid size-11 shrink-0 place-items-center rounded-xl text-ink-500 transition-colors hover:bg-brand-50 hover:text-ink-900 disabled:opacity-30";

type Meta = { edited: boolean; changed: string };

function errorText(state: ContentState, itemName?: string) {
  if (!state.error) return null;
  const prefix =
    state.index !== undefined && itemName ? interpolate(t.at, { name: itemName, number: state.index + 1 }) : "";
  return prefix + t.errors[state.error];
}

/** Editor state for one part: value, dirty flag, client check with the server's own rules, save. */
function useEditor<T>(field: keyof SiteContent, initial: T, parse: (value: unknown) => Parsed<unknown>) {
  const router = useRouter();
  const [value, setValue] = useState(initial);
  const [savedJson, setSavedJson] = useState(() => JSON.stringify(initial));
  const [state, setState] = useState<ContentState>({});
  const [pending, startTransition] = useTransition();
  const json = JSON.stringify(value);
  const dirty = json !== savedJson;

  useEffect(() => {
    if (!dirty) return;
    const warn = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  const save = () => {
    const parsed = parse(value);
    if (!parsed.ok) return setState({ error: parsed.error, index: parsed.index });
    startTransition(async () => {
      const result = await saveContentAction(field, value).catch((): ContentState => ({ error: "unavailable" }));
      setState(result);
      if (result.ok) {
        setSavedJson(json);
        router.refresh();
      }
    });
  };

  return { value, setValue, save, state, setState, pending, dirty };
}

/** Card with title, last change, reset, the fields and the save row. */
function Part({
  field,
  title,
  description,
  meta,
  editor,
  itemName,
  children,
}: {
  field: keyof SiteContent;
  title: string;
  description: string;
  meta: Meta;
  editor: { save: () => void; state: ContentState; pending: boolean; dirty: boolean };
  itemName?: string;
  children: ReactNode;
}) {
  const [resetting, startReset] = useTransition();
  const [resetError, setResetError] = useState<ContentState>({});
  const reset = () => {
    if (!window.confirm(t.confirmReset)) return;
    startReset(async () => {
      const result = await resetContentAction(field).catch((): ContentState => ({ error: "unavailable" }));
      if (result.ok) window.location.reload();
      else setResetError(result);
    });
  };
  const { state, pending, dirty } = editor;

  return (
    <section
      aria-labelledby={`content-${field}`}
      className="min-w-0 rounded-[1.75rem] border border-brand-100 bg-white p-5 sm:p-6"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 id={`content-${field}`} className="text-lg font-bold text-ink-900">
            {title}
          </h2>
          <p className="mt-1 max-w-2xl text-sm text-ink-500">{description}</p>
          <p className="mt-1 text-xs text-ink-500">{meta.changed}</p>
        </div>
        {meta.edited ? (
          <button
            type="button"
            onClick={reset}
            disabled={resetting}
            className="inline-flex h-11 items-center gap-1.5 rounded-xl px-3 text-sm font-semibold text-ink-500 transition-colors hover:bg-brand-50 hover:text-ink-900 disabled:opacity-50"
          >
            <RotateCcw className={cn("size-4", resetting && "animate-spin")} aria-hidden="true" />
            {t.reset}
          </button>
        ) : null}
      </div>
      <form
        noValidate
        onSubmit={(event) => {
          event.preventDefault();
          editor.save();
        }}
        className="mt-5"
      >
        {children}
        <div className="mt-5 grid gap-3">
          <SubmitError message={errorText(state, itemName) ?? errorText(resetError)} />
          <div className="flex flex-wrap items-center gap-3">
            <Button type="submit" disabled={pending || !dirty}>
              {pending ? (
                <Loader2 className="size-4 animate-spin" aria-hidden="true" />
              ) : (
                <Check className="size-4" aria-hidden="true" />
              )}
              {pending ? t.saving : t.save}
            </Button>
            <p role="status" className={cn("text-sm font-medium", dirty ? "text-blush-700" : "text-brand-800")}>
              {pending ? "" : dirty ? t.unsaved : state.ok ? t.saved : ""}
            </p>
          </div>
        </div>
      </form>
    </section>
  );
}

/** The same text in Indonesian and English, side by side on wide screens. */
function LocalizedField({
  label,
  value,
  onChange,
  max,
  multiline,
  rows = 3,
  placeholder,
}: {
  label: string;
  value: LocalizedText;
  onChange: (value: LocalizedText) => void;
  max: number;
  multiline?: boolean;
  rows?: number;
  placeholder?: LocalizedText;
}) {
  const id = useId();
  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-3 md:grid-cols-2">
      {locales.map((locale) => {
        const props = {
          id: `${id}-${locale}`,
          lang: locale,
          value: value[locale],
          maxLength: max,
          placeholder: placeholder?.[locale],
          className: inputClass,
          onChange: (event: { target: { value: string } }) => onChange({ ...value, [locale]: event.target.value }),
        };
        return (
          <div key={locale} className="min-w-0">
            <label htmlFor={props.id} className="mb-1.5 block text-sm font-medium text-ink-700">
              {label} <span className="font-normal text-ink-500">· {t.languages[locale]}</span>
            </label>
            {multiline ? <textarea {...props} rows={rows} /> : <input {...props} type="text" />}
          </div>
        );
      })}
    </div>
  );
}

function move<T>(list: T[], from: number, to: number) {
  const copy = [...list];
  copy.splice(to, 0, ...copy.splice(from, 1));
  return copy;
}

function ItemButtons<T>({
  name,
  index,
  list,
  onChange,
}: {
  name: string;
  index: number;
  list: T[];
  onChange: (list: T[]) => void;
}) {
  const label = `${name} ${index + 1}`;
  return (
    <div className="flex shrink-0">
      <button
        type="button"
        className={iconButton}
        disabled={index === 0}
        aria-label={interpolate(t.up, { name: label })}
        onClick={() => onChange(move(list, index, index - 1))}
      >
        <ArrowUp className="size-4" aria-hidden="true" />
      </button>
      <button
        type="button"
        className={iconButton}
        disabled={index === list.length - 1}
        aria-label={interpolate(t.down, { name: label })}
        onClick={() => onChange(move(list, index, index + 1))}
      >
        <ArrowDown className="size-4" aria-hidden="true" />
      </button>
      <button
        type="button"
        className={cn(iconButton, "hover:bg-blush-50 hover:text-blush-800")}
        aria-label={interpolate(t.remove, { name: label })}
        onClick={() => onChange(list.filter((_, i) => i !== index))}
      >
        <Trash2 className="size-4" aria-hidden="true" />
      </button>
    </div>
  );
}

/* ---------------------------------------------- Banners ---------------------------------------------- */

export function BannerEditor({
  initial,
  builtinImages,
  ...meta
}: { initial: BannerContent[]; builtinImages: Record<string, string> } & Meta) {
  const editor = useEditor("banners", initial, parseBanners);
  const { value: banners, setValue, setState } = editor;
  /** Banner being replaced, "new", or null. */
  const [uploading, setUploading] = useState<string | null>(null);

  const upload = async (file: File | undefined, target: string) => {
    if (!file) return;
    setState({});
    if (file.size > orderConfig.proofMaxBytes) return setState({ error: "badImage" });
    setUploading(target);
    const formData = new FormData();
    formData.set("image", file);
    const result = await uploadBannerAction(formData).catch((): Awaited<ReturnType<typeof uploadBannerAction>> => ({
      error: "unavailable",
    }));
    setUploading(null);
    const image = result.file;
    if (!image) return setState({ error: result.error ?? "unavailable" });
    setValue((list) =>
      target === "new"
        ? [...list, { id: image.split(".")[0], image, alt: { id: "", en: "" }, href: "", visible: true }]
        : list.map((banner) => (banner.id === target ? { ...banner, image } : banner)),
    );
  };
  const update = (id: string, patch: Partial<BannerContent>) =>
    setValue((list) => list.map((banner) => (banner.id === id ? { ...banner, ...patch } : banner)));

  return (
    <Part
      field="banners"
      title={t.banners.title}
      description={t.banners.description}
      meta={meta}
      editor={{ ...editor, pending: editor.pending || uploading !== null }}
      itemName={t.banners.name}
    >
      {banners.length === 0 ? <p className="text-sm text-ink-500">{t.banners.empty}</p> : null}
      <ul className="grid grid-cols-[minmax(0,1fr)] gap-4">
        {banners.map((banner, index) => (
          <li
            key={banner.id}
            className="grid grid-cols-[minmax(0,1fr)] gap-4 rounded-2xl border border-brand-100 p-4 lg:grid-cols-[18rem_minmax(0,1fr)]"
          >
            <div className="min-w-0">
              {/* Admin preview: a plain <img> is enough. */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={builtinImages[banner.image] ?? `/banners/${banner.image}`}
                alt=""
                className={cn(
                  "aspect-[71/25] w-full rounded-xl border border-brand-100 bg-brand-50 object-cover",
                  !banner.visible && "opacity-40 grayscale",
                )}
              />
              <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2">
                <FilePicker
                  label={t.banners.replace}
                  busy={uploading === banner.id}
                  disabled={uploading !== null}
                  onPick={(file) => void upload(file, banner.id)}
                />
                <label className="inline-flex min-h-11 items-center gap-2 text-sm font-medium text-ink-700">
                  <input
                    type="checkbox"
                    checked={banner.visible}
                    onChange={(event) => update(banner.id, { visible: event.target.checked })}
                    className="size-4 accent-ink-900"
                  />
                  {t.banners.visible}
                </label>
              </div>
            </div>
            <div className="grid min-w-0 content-start gap-3">
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-bold text-ink-900">
                  {t.banners.name} {index + 1}
                </p>
                <ItemButtons name={t.banners.name} index={index} list={banners} onChange={setValue} />
              </div>
              <LocalizedField
                label={t.banners.alt}
                value={banner.alt}
                onChange={(alt) => update(banner.id, { alt })}
                max={CONTENT_LIMITS.alt}
                multiline
                rows={2}
              />
              <p className="-mt-2 text-xs text-ink-500">{t.banners.altHint}</p>
              <PlainField
                label={t.banners.link}
                hint={t.banners.linkHint}
                value={banner.href}
                max={CONTENT_LIMITS.href}
                onChange={(href) => update(banner.id, { href })}
              />
            </div>
          </li>
        ))}
      </ul>
      <div className="mt-4">
        {banners.length < CONTENT_LIMITS.banners ? (
          <FilePicker
            label={t.banners.add}
            busy={uploading === "new"}
            disabled={uploading !== null}
            onPick={(file) => void upload(file, "new")}
          />
        ) : (
          <p className="text-sm text-ink-500">{t.banners.full}</p>
        )}
        <p className="mt-1.5 text-xs text-ink-500">{t.banners.hint}</p>
      </div>
    </Part>
  );
}

function FilePicker({
  label,
  busy,
  disabled,
  onPick,
}: {
  label: string;
  busy: boolean;
  disabled: boolean;
  onPick: (file: File | undefined) => void;
}) {
  const id = useId();
  return (
    <span className="relative inline-flex">
      <input
        id={id}
        type="file"
        accept={orderConfig.proofTypes.join(",")}
        disabled={disabled}
        onChange={(event) => {
          onPick(event.target.files?.[0]);
          event.target.value = ""; // the same file can be picked again
        }}
        className="peer sr-only"
      />
      <label
        htmlFor={id}
        className="inline-flex h-11 cursor-pointer items-center gap-2 rounded-xl bg-brand-100 px-4 text-sm font-semibold text-brand-800 transition-colors peer-focus-visible:ring-2 peer-focus-visible:ring-brand-400 peer-focus-visible:ring-offset-2 peer-disabled:pointer-events-none peer-disabled:opacity-60 hover:bg-brand-200 active:scale-[0.97]"
      >
        {busy ? (
          <Loader2 className="size-4 animate-spin" aria-hidden="true" />
        ) : (
          <ImageUp className="size-4" aria-hidden="true" />
        )}
        {busy ? t.banners.uploading : label}
      </label>
    </span>
  );
}

function PlainField({
  label,
  hint,
  value,
  onChange,
  max,
  type = "text",
}: {
  label: string;
  hint?: string;
  value: string;
  onChange: (value: string) => void;
  max: number;
  type?: "text" | "tel" | "url";
}) {
  const id = useId();
  return (
    <div className="min-w-0">
      <label htmlFor={id} className="mb-1.5 block text-sm font-medium text-ink-700">
        {label}
      </label>
      <input
        id={id}
        type={type}
        value={value}
        maxLength={max}
        spellCheck={false}
        autoComplete="off"
        aria-describedby={hint ? `${id}-hint` : undefined}
        onChange={(event) => onChange(event.target.value)}
        className={inputClass}
      />
      {hint ? (
        <p id={`${id}-hint`} className="mt-1 text-xs text-ink-500">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

/* ---------------------------------------------- Contact ---------------------------------------------- */

export function ContactEditor({ initial, ...meta }: { initial: ContactContent } & Meta) {
  const editor = useEditor("contact", initial, parseContact);
  const { value, setValue } = editor;
  const set = (key: keyof ContactContent) => (text: string) => setValue((prev) => ({ ...prev, [key]: text }));
  return (
    <Part field="contact" title={t.contact.title} description={t.contact.description} meta={meta} editor={editor}>
      <div className="grid grid-cols-[minmax(0,1fr)] gap-4 md:grid-cols-3">
        <PlainField label={t.contact.whatsapp} type="tel" value={value.whatsapp} max={30} onChange={set("whatsapp")} />
        <PlainField label={t.contact.discord} type="url" value={value.discord} max={200} onChange={set("discord")} />
        <PlainField
          label={t.contact.whatsappGroup}
          type="url"
          value={value.whatsappGroup}
          max={200}
          onChange={set("whatsappGroup")}
        />
      </div>
    </Part>
  );
}

/* ---------------------------------------------- FAQ ---------------------------------------------- */

export function FaqEditor({ initial, ...meta }: { initial: FaqItemContent[] } & Meta) {
  const editor = useEditor("faq", initial, parseFaq);
  const { value: items, setValue } = editor;
  const update = (index: number, patch: Partial<FaqItemContent>) =>
    setValue((list) => list.map((item, i) => (i === index ? { ...item, ...patch } : item)));
  const add = () => setValue((list) => [...list, { question: { id: "", en: "" }, answer: { id: "", en: "" } }]);

  return (
    <Part
      field="faq"
      title={t.faq.title}
      description={t.faq.description}
      meta={meta}
      editor={editor}
      itemName={t.faq.name}
    >
      {items.length === 0 ? <p className="text-sm text-ink-500">{t.faq.empty}</p> : null}
      <ol className="grid grid-cols-[minmax(0,1fr)] gap-4">
        {items.map((item, index) => (
          <li key={index} className="grid min-w-0 gap-3 rounded-2xl border border-brand-100 p-4">
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm font-bold text-ink-900">
                {t.faq.name} {index + 1}
              </p>
              <ItemButtons name={t.faq.name} index={index} list={items} onChange={setValue} />
            </div>
            <LocalizedField
              label={t.faq.question}
              value={item.question}
              onChange={(question) => update(index, { question })}
              max={CONTENT_LIMITS.question}
            />
            <LocalizedField
              label={t.faq.answer}
              value={item.answer}
              onChange={(answer) => update(index, { answer })}
              max={CONTENT_LIMITS.answer}
              multiline
              rows={4}
            />
          </li>
        ))}
      </ol>
      {items.length < CONTENT_LIMITS.faqItems ? (
        <Button variant="soft" className="mt-4" onClick={add}>
          <Plus className="size-4" aria-hidden="true" />
          {t.faq.add}
        </Button>
      ) : (
        <p className="mt-4 text-sm text-ink-500">{t.faq.full}</p>
      )}
    </Part>
  );
}

/* ---------------------------------------------- Section texts ---------------------------------------------- */

export function TextsEditor({
  initial,
  defaults,
  ...meta
}: { initial: TextContent; defaults: Record<string, LocalizedText> } & Meta) {
  const editor = useEditor(
    "texts",
    Object.fromEntries(Object.entries(defaults).map(([path, text]) => [path, { ...text, ...initial[path] }])),
    parseTexts,
  );
  const { value, setValue } = editor;
  return (
    <Part field="texts" title={t.texts.title} description={t.texts.description} meta={meta} editor={editor}>
      <div className="grid grid-cols-[minmax(0,1fr)] gap-2">
        {TEXT_GROUPS.map((group) => (
          <details key={group.id} className="group min-w-0 rounded-2xl border border-brand-100">
            <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-3 rounded-2xl px-4 font-semibold text-ink-900 hover:bg-brand-50 [&::-webkit-details-marker]:hidden">
              {group.title}
              <ChevronDown
                className="size-4 shrink-0 text-ink-500 transition-transform group-open:rotate-180"
                aria-hidden="true"
              />
            </summary>
            <div className="grid grid-cols-[minmax(0,1fr)] gap-4 p-4 pt-2">
              {group.fields.map(({ path, label, multiline }) => (
                <LocalizedField
                  key={path}
                  label={label}
                  value={value[path]}
                  placeholder={defaults[path]}
                  onChange={(text) => setValue((prev) => ({ ...prev, [path]: text }))}
                  max={CONTENT_LIMITS.text}
                  multiline={multiline}
                />
              ))}
            </div>
          </details>
        ))}
      </div>
    </Part>
  );
}
