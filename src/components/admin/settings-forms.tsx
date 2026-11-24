"use client";

import { Check, ImageUp, Loader2, Plus, RotateCcw, ScanLine, Trash2, TriangleAlert } from "lucide-react";
import { useRouter } from "next/navigation";
import { useActionState, useEffect, useId, useState, type ReactNode } from "react";

import { adminCopy } from "@/app/admin/copy";
import { SubmitError } from "@/components/checkout/submit-error";
import { Button } from "@/components/ui/button";
import { orderConfig } from "@/data/orders";
import { robuxConfig, type RobuxMethodId, type RobuxRateTier } from "@/data/robux";
import { formatIDR, formatNumber, interpolate } from "@/i18n/format";
import { parseQris, type QrisInfo } from "@/lib/qris";
import { calculateRobuxPrice, type RobuxRates } from "@/lib/robux-pricing";
import { SETTING_LIMITS, validateTiers, type QrisSetting, type SiteSettings, type SoldOut } from "@/lib/settings";
import { cn } from "@/lib/utils";
import {
  resetSettingAction,
  saveClosedMessageAction,
  saveExpiryAction,
  saveQrisAction,
  saveRobuxRatesAction,
  saveRobuxStockAction,
  saveSoldOutAction,
  type SettingsState,
} from "@/server/admin/settings-actions";

const t = adminCopy.settings;
const methodNames: Record<RobuxMethodId, string> = {
  "send-username": "Via Send Username",
  gamepass: "Via Gamepass",
};
const numberInput =
  "h-11 w-full min-w-0 rounded-xl border-2 bg-white px-3 text-sm text-ink-900 tabular-nums outline-none focus:border-brand-500";

/** Saved → reload server data (last-changed line, current QR). */
function useRefreshOnSave(state: SettingsState) {
  const router = useRouter();
  useEffect(() => {
    if (state.ok) router.refresh();
  }, [state, router]);
}

function SaveRow({ state, pending, disabled }: { state: SettingsState; pending: boolean; disabled?: boolean }) {
  return (
    <div className="mt-5 grid gap-3">
      <SubmitError message={state.error ? t.errors[state.error] : null} />
      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" disabled={pending || disabled}>
          {pending ? (
            <Loader2 className="size-4 animate-spin" aria-hidden="true" />
          ) : (
            <Check className="size-4" aria-hidden="true" />
          )}
          {pending ? t.saving : t.save}
        </Button>
        {state.ok && !pending ? (
          <p role="status" className="text-sm font-medium text-brand-800">
            {t.saved}
          </p>
        ) : null}
      </div>
    </div>
  );
}

/** Small separate form: remove the override for one setting. */
export function ResetButton({ field }: { field: keyof SiteSettings }) {
  const [state, action, pending] = useActionState<SettingsState, FormData>(resetSettingAction, {});
  useRefreshOnSave(state);
  return (
    <form action={action}>
      <input type="hidden" name="field" value={field} />
      <button
        type="submit"
        disabled={pending}
        className="inline-flex h-11 items-center gap-1.5 rounded-xl px-3 text-sm font-semibold text-ink-500 transition-colors hover:bg-brand-50 hover:text-ink-900 disabled:opacity-50"
      >
        <RotateCcw className={cn("size-4", pending && "animate-spin")} aria-hidden="true" />
        {t.reset}
      </button>
    </form>
  );
}

/* ---------------------------------------------- Robux rates ---------------------------------------------- */

const PREVIEW_AMOUNTS = [100, 1000, 5000];

export function RobuxRatesForm({ initial }: { initial: RobuxRates }) {
  const [state, action, pending] = useActionState<SettingsState, FormData>(saveRobuxRatesAction, {});
  useRefreshOnSave(state);
  const [rates, setRates] = useState<Record<RobuxMethodId, RobuxRateTier[]>>(
    () =>
      Object.fromEntries(robuxConfig.methods.map(({ id }) => [id, initial[id].map((tier) => ({ ...tier }))])) as Record<
        RobuxMethodId,
        RobuxRateTier[]
      >,
  );
  const errors = Object.fromEntries(robuxConfig.methods.map(({ id }) => [id, validateTiers(rates[id])])) as Record<
    RobuxMethodId,
    ReturnType<typeof validateTiers>
  >;
  const hasError = Object.values(errors).some(Boolean);

  const setTier = (method: RobuxMethodId, index: number, field: keyof RobuxRateTier, raw: string) => {
    const digits = raw.replace(/\D/g, "").slice(0, 6);
    setRates((prev) => ({
      ...prev,
      [method]: prev[method].map((tier, i) =>
        i === index ? { ...tier, [field]: digits ? Number(digits) : NaN } : tier,
      ),
    }));
  };
  const addTier = (method: RobuxMethodId) =>
    setRates((prev) => {
      const last = prev[method].at(-1) ?? { minAmount: 0, rate: 100 };
      return { ...prev, [method]: [...prev[method], { minAmount: (last.minAmount || 0) + 1000, rate: last.rate }] };
    });
  const removeTier = (method: RobuxMethodId, index: number) =>
    setRates((prev) => ({ ...prev, [method]: prev[method].filter((_, i) => i !== index) }));

  return (
    <form action={action}>
      <input type="hidden" name="rates" value={JSON.stringify(rates)} />
      <div className="grid grid-cols-[minmax(0,1fr)] gap-4 lg:grid-cols-2">
        {robuxConfig.methods.map(({ id }) => {
          const tiers = rates[id];
          const error = errors[id] ?? state.rateErrors?.[id];
          return (
            <fieldset key={id} className="rounded-2xl border border-brand-100 p-4" aria-invalid={Boolean(error)}>
              <legend className="px-1 text-sm font-bold text-ink-900">{methodNames[id]}</legend>
              <div
                className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)_2.75rem] gap-2 text-xs font-medium text-ink-500"
                aria-hidden="true"
              >
                <span>
                  {t.robux.from} ({t.robux.robux})
                </span>
                <span>{t.robux.rate}</span>
              </div>
              <ol className="mt-1.5 grid gap-2">
                {tiers.map((tier, index) => (
                  <li key={index} className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)_2.75rem] items-center gap-2">
                    <input
                      inputMode="numeric"
                      aria-label={`${methodNames[id]} tier ${index + 1}: ${t.robux.from}`}
                      value={Number.isNaN(tier.minAmount) ? "" : String(tier.minAmount)}
                      readOnly={index === 0}
                      onChange={(event) => setTier(id, index, "minAmount", event.target.value)}
                      className={cn(numberInput, "border-brand-100 read-only:bg-brand-50 read-only:text-ink-500")}
                    />
                    <div className="relative">
                      <span className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-sm text-ink-500">
                        Rp
                      </span>
                      <input
                        inputMode="numeric"
                        aria-label={`${methodNames[id]} tier ${index + 1}: ${t.robux.rate}`}
                        value={Number.isNaN(tier.rate) ? "" : String(tier.rate)}
                        onChange={(event) => setTier(id, index, "rate", event.target.value)}
                        className={cn(numberInput, "pl-9", error ? "border-blush-300" : "border-brand-100")}
                      />
                    </div>
                    {index > 0 ? (
                      <button
                        type="button"
                        onClick={() => removeTier(id, index)}
                        aria-label={`${t.robux.removeTier} ${index + 1}`}
                        className="grid size-11 place-items-center rounded-xl text-ink-500 transition-colors hover:bg-blush-50 hover:text-blush-700"
                      >
                        <Trash2 className="size-4" aria-hidden="true" />
                      </button>
                    ) : (
                      <span />
                    )}
                  </li>
                ))}
              </ol>
              {tiers.length < SETTING_LIMITS.maxTiers ? (
                <button
                  type="button"
                  onClick={() => addTier(id)}
                  className="mt-2 inline-flex h-11 items-center gap-1.5 rounded-xl px-2 text-sm font-semibold text-brand-700 hover:bg-brand-50"
                >
                  <Plus className="size-4" aria-hidden="true" />
                  {t.robux.addTier}
                </button>
              ) : null}
              {error ? (
                <p role="alert" className="mt-2 text-sm text-blush-800">
                  {t.robux.rateErrors[error]}
                </p>
              ) : (
                <dl className="mt-3 grid grid-cols-3 gap-2 border-t border-dashed border-brand-200 pt-3 text-xs">
                  <dt className="sr-only">{t.robux.preview}</dt>
                  {PREVIEW_AMOUNTS.map((amount) => (
                    <dd key={amount} className="rounded-xl bg-brand-50 px-2 py-1.5">
                      <span className="block text-ink-500">{formatNumber(amount, "id")} Robux</span>
                      <span className="font-bold text-ink-900 tabular-nums">
                        {formatIDR(calculateRobuxPrice(id, amount, rates as RobuxRates))}
                      </span>
                    </dd>
                  ))}
                </dl>
              )}
            </fieldset>
          );
        })}
      </div>
      <SaveRow state={state} pending={pending} disabled={hasError} />
    </form>
  );
}

/* ------------------------------------------------ Expiry ------------------------------------------------ */

/** Robux in stock. Shown on the site; completed Robux orders subtract from it automatically. */
export function ClosedMessageForm({ initial }: { initial: SiteSettings["closedMessage"] }) {
  const [state, action, pending] = useActionState<SettingsState, FormData>(saveClosedMessageAction, {});
  useRefreshOnSave(state);
  const [message, setMessage] = useState(initial);
  const id = useId();
  return (
    <form action={action}>
      <div className="grid grid-cols-[minmax(0,1fr)] gap-4 md:grid-cols-2">
        {(["id", "en"] as const).map((locale) => (
          <div key={locale}>
            <label htmlFor={`${id}-${locale}`} className="mb-1.5 block text-sm font-medium text-ink-700">
              {t.store[locale]}
            </label>
            <textarea
              id={`${id}-${locale}`}
              name={locale}
              lang={locale}
              rows={3}
              maxLength={SETTING_LIMITS.closedMessageMax}
              value={message[locale]}
              onChange={(event) => setMessage((prev) => ({ ...prev, [locale]: event.target.value }))}
              aria-describedby={`${id}-hint`}
              className="w-full min-w-0 rounded-xl border-2 border-brand-100 bg-white px-3 py-2.5 text-sm text-ink-900 outline-none hover:border-brand-300 focus:border-brand-500"
            />
          </div>
        ))}
      </div>
      <p id={`${id}-hint`} className="mt-1.5 text-xs text-ink-500">
        {t.store.hint}
      </p>
      <SaveRow state={state} pending={pending} disabled={!message.id.trim()} />
    </form>
  );
}

export function RobuxStockForm({ initial }: { initial: number | null }) {
  const [state, action, pending] = useActionState<SettingsState, FormData>(saveRobuxStockAction, {});
  useRefreshOnSave(state);
  const [value, setValue] = useState(initial === null ? "" : String(initial));
  const id = useId();
  const amount = value === "" ? null : Number(value);
  const valid = amount !== null && Number.isSafeInteger(amount) && amount >= 0 && amount <= 100_000_000;
  return (
    <form action={action}>
      <label htmlFor={id} className="mb-1.5 block text-sm font-medium text-ink-700">
        {t.robuxStock.amount}
      </label>
      <div className="flex max-w-xs items-center gap-2">
        <input
          id={id}
          name="amount"
          inputMode="numeric"
          value={value === "" ? "" : formatNumber(Number(value), "id")}
          onChange={(event) =>
            setValue(
              event.target.value
                .replace(/\D/g, "")
                .replace(/^0+(?=\d)/, "")
                .slice(0, 9),
            )
          }
          placeholder="0"
          aria-describedby={`${id}-hint`}
          className={cn(numberInput, "border-brand-100 hover:border-brand-300")}
        />
        <span className="text-sm font-semibold text-ink-500">Robux</span>
      </div>
      <p id={`${id}-hint`} className="mt-1.5 text-xs text-ink-500">
        {initial === null ? t.robuxStock.notTracked : t.robuxStock.hint}
      </p>
      <SaveRow state={state} pending={pending} disabled={!valid} />
    </form>
  );
}

export function ExpiryForm({ initial }: { initial: number }) {
  const [state, action, pending] = useActionState<SettingsState, FormData>(saveExpiryAction, {});
  useRefreshOnSave(state);
  const [minutes, setMinutes] = useState(String(initial));
  const id = useId();
  const value = Number(minutes);
  const valid = Number.isInteger(value) && value >= SETTING_LIMITS.expiryMin && value <= SETTING_LIMITS.expiryMax;
  return (
    <form action={action}>
      <label htmlFor={id} className="mb-1.5 block text-sm font-medium text-ink-700">
        {t.expiry.minutes}
      </label>
      <div className="flex flex-wrap items-center gap-2">
        <input
          id={id}
          name="minutes"
          inputMode="numeric"
          value={minutes}
          onChange={(event) => setMinutes(event.target.value.replace(/\D/g, "").slice(0, 3))}
          aria-invalid={!valid}
          aria-describedby={`${id}-hint`}
          className={cn(numberInput, "w-28", valid ? "border-brand-100" : "border-blush-500")}
        />
        {[15, 30, 60].map((preset) => (
          <button
            key={preset}
            type="button"
            onClick={() => setMinutes(String(preset))}
            aria-pressed={value === preset}
            className={cn(
              "h-11 rounded-xl border px-3 text-sm font-semibold transition-colors",
              value === preset
                ? "border-ink-900 bg-ink-900 text-white"
                : "border-brand-100 bg-white hover:border-brand-300",
            )}
          >
            {preset}
          </button>
        ))}
      </div>
      <p id={`${id}-hint`} className="mt-1.5 text-xs text-ink-500">
        {t.expiry.hint}
      </p>
      <SaveRow state={state} pending={pending} disabled={!valid} />
    </form>
  );
}

/* ------------------------------------------------- QRIS ------------------------------------------------- */

type Check =
  | { kind: "idle" }
  | { kind: "checking" }
  | { kind: "ok"; info: QrisInfo }
  | { kind: "warn"; message: string; needsConfirm: boolean };

/** Reads the QR in the browser (Chrome/Edge/Android have a built-in detector) to catch a wrong file early. */
async function checkQrImage(url: string): Promise<{ check: Check; width: number; height: number }> {
  const img = new Image();
  img.src = url;
  await img.decode();
  const size = { width: img.naturalWidth, height: img.naturalHeight };
  const Detector = (
    globalThis as {
      BarcodeDetector?: new (o: { formats: string[] }) => {
        detect(i: HTMLImageElement): Promise<{ rawValue: string }[]>;
      };
    }
  ).BarcodeDetector;
  if (!Detector) return { ...size, check: { kind: "warn", message: t.qris.checkUnsupported, needsConfirm: true } };
  const codes = await new Detector({ formats: ["qr_code"] }).detect(img).catch(() => []);
  if (codes.length === 0) return { ...size, check: { kind: "warn", message: t.qris.checkFailed, needsConfirm: true } };
  const info = parseQris(codes[0].rawValue);
  if (!info) return { ...size, check: { kind: "warn", message: t.qris.checkNotQris, needsConfirm: true } };
  if (!info.checksumOk) return { ...size, check: { kind: "warn", message: t.qris.checkBadCrc, needsConfirm: true } };
  if (!info.isStatic) return { ...size, check: { kind: "warn", message: t.qris.checkDynamic, needsConfirm: true } };
  return { ...size, check: { kind: "ok", info } };
}

function Field({ label, hint, id, children }: { label: string; hint?: string; id: string; children: ReactNode }) {
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-sm font-medium text-ink-700">
        {label}
      </label>
      {children}
      {hint ? (
        <p id={`${id}-hint`} className="mt-1.5 text-xs text-ink-500">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

export function QrisForm({ initial }: { initial: QrisSetting }) {
  const [state, action, pending] = useActionState<SettingsState, FormData>(saveQrisAction, {});
  useRefreshOnSave(state);
  const fileId = useId();
  const nameId = useId();
  const nmidId = useId();
  const confirmId = useId();
  const [merchantName, setMerchantName] = useState(initial.merchantName);
  const [nmid, setNmid] = useState(initial.nmid);
  const [preview, setPreview] = useState<{ url: string; name: string; width: number; height: number } | null>(null);
  const [check, setCheck] = useState<Check>({ kind: "idle" });
  const [confirmed, setConfirmed] = useState(false);
  const [fileKey, setFileKey] = useState(0);

  // Free the preview URL when it is replaced or the form unmounts.
  useEffect(() => () => (preview ? URL.revokeObjectURL(preview.url) : undefined), [preview]);

  const pick = async (file: File | undefined) => {
    setConfirmed(false);
    if (!file) {
      setPreview(null);
      setCheck({ kind: "idle" });
      return;
    }
    if (file.size > orderConfig.proofMaxBytes || !(orderConfig.proofTypes as readonly string[]).includes(file.type)) {
      setPreview(null);
      setCheck({ kind: "warn", message: t.errors.badImage, needsConfirm: false });
      setFileKey((key) => key + 1);
      return;
    }
    const url = URL.createObjectURL(file);
    setCheck({ kind: "checking" });
    try {
      const result = await checkQrImage(url);
      setPreview({ url, name: file.name, width: result.width, height: result.height });
      setCheck(result.check);
      if (result.check.kind === "ok") {
        setMerchantName(result.check.info.merchantName);
        setNmid(result.check.info.nmid);
      }
    } catch {
      setPreview(null);
      setCheck({ kind: "warn", message: t.errors.badImage, needsConfirm: false });
    }
  };

  const blocked =
    check.kind === "checking" ||
    (check.kind === "warn" && (!check.needsConfirm || !confirmed)) ||
    merchantName.trim().length === 0;

  return (
    <form action={action} className="grid gap-5 md:grid-cols-[minmax(0,14rem)_minmax(0,1fr)] md:items-start">
      <figure className="grid justify-items-center gap-2">
        <div className="w-full max-w-56 overflow-hidden rounded-2xl border border-brand-100 bg-white">
          {/* Plain <img>: the preview is a local blob URL and the live QR must keep its exact pixels. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={preview?.url ?? initial.image}
            alt={interpolate(t.qris.alt, { name: merchantName || initial.merchantName })}
            className="h-auto w-full"
          />
        </div>
        <figcaption className="text-center text-xs text-ink-500">{preview ? preview.name : t.qris.current}</figcaption>
      </figure>

      <div className="grid gap-4">
        <div>
          <p id={`${fileId}-label`} className="mb-1.5 text-sm font-medium text-ink-700">
            {t.qris.newImage}
          </p>
          <input
            key={fileKey}
            id={fileId}
            name="image"
            type="file"
            accept="image/jpeg,image/png,image/webp"
            aria-labelledby={`${fileId}-label ${fileId}-button`}
            aria-describedby={`${fileId}-hint`}
            onChange={(event) => void pick(event.target.files?.[0])}
            className="peer sr-only"
          />
          <label
            id={`${fileId}-button`}
            htmlFor={fileId}
            className="inline-flex h-11 cursor-pointer items-center gap-2 rounded-xl bg-brand-100 px-4 text-sm font-semibold text-brand-800 transition-colors peer-focus-visible:ring-2 peer-focus-visible:ring-brand-400 peer-focus-visible:ring-offset-2 hover:bg-brand-200 active:scale-[0.97]"
          >
            <ImageUp className="size-4" aria-hidden="true" />
            {t.qris.choose}
          </label>
          <p id={`${fileId}-hint`} className="mt-1.5 text-xs text-ink-500">
            {t.qris.imageHint}
          </p>
          <input type="hidden" name="width" value={preview?.width ?? ""} />
          <input type="hidden" name="height" value={preview?.height ?? ""} />
        </div>

        {check.kind !== "idle" ? (
          <div
            role="status"
            className={cn(
              "flex items-start gap-2 rounded-xl px-3 py-2.5 text-sm",
              check.kind === "ok"
                ? "bg-brand-50 text-brand-900"
                : check.kind === "checking"
                  ? "bg-brand-50 text-ink-700"
                  : "bg-blush-50 text-blush-900",
            )}
          >
            {check.kind === "checking" ? (
              <Loader2 className="mt-0.5 size-4 shrink-0 animate-spin" aria-hidden="true" />
            ) : check.kind === "ok" ? (
              <ScanLine className="mt-0.5 size-4 shrink-0 text-brand-700" aria-hidden="true" />
            ) : (
              <TriangleAlert className="mt-0.5 size-4 shrink-0 text-blush-500" aria-hidden="true" />
            )}
            {check.kind === "checking"
              ? t.qris.checking
              : check.kind === "ok"
                ? interpolate(t.qris.checkOk, { name: check.info.merchantName, city: check.info.merchantCity })
                : check.message}
          </div>
        ) : null}
        {check.kind === "warn" && check.needsConfirm ? (
          <label htmlFor={confirmId} className="flex cursor-pointer items-start gap-3 text-sm text-ink-900">
            <input
              id={confirmId}
              type="checkbox"
              checked={confirmed}
              onChange={(event) => setConfirmed(event.target.checked)}
              className="mt-0.5 size-5 shrink-0 accent-ink-900"
            />
            {t.qris.confirmUnchecked}
          </label>
        ) : null}

        <Field label={t.qris.merchantName} hint={t.qris.merchantHint} id={nameId}>
          <input
            id={nameId}
            name="merchantName"
            value={merchantName}
            maxLength={SETTING_LIMITS.merchantNameMax}
            required
            onChange={(event) => setMerchantName(event.target.value)}
            aria-describedby={`${nameId}-hint`}
            className={cn(numberInput, "border-brand-100 hover:border-brand-300")}
          />
        </Field>
        <Field label={t.qris.nmid} id={nmidId}>
          <input
            id={nmidId}
            name="nmid"
            value={nmid}
            maxLength={30}
            onChange={(event) => setNmid(event.target.value.toUpperCase())}
            className={cn(numberInput, "border-brand-100 font-mono hover:border-brand-300")}
          />
        </Field>
        <SaveRow state={state} pending={pending} disabled={blocked} />
      </div>
    </form>
  );
}

/* ------------------------------------------------- Stock ------------------------------------------------- */

export interface StockItem {
  id: string;
  name: string;
  group: "robux" | "shop" | "gamepass";
}

/** One switch per Robux method / product. ON = available; OFF = "Stok habis" (can't be bought). */
export function StockForm({ initial, items }: { initial: SoldOut; items: StockItem[] }) {
  const [state, action, pending] = useActionState<SettingsState, FormData>(saveSoldOutAction, {});
  useRefreshOnSave(state);
  const [off, setOff] = useState(() => new Set<string>([...initial.robuxMethods, ...initial.products]));
  const toggle = (id: string) =>
    setOff((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const groups = (["robux", "shop", "gamepass"] as const).map((group) => ({
    group,
    items: items.filter((item) => item.group === group),
  }));

  return (
    <form action={action}>
      {items
        .filter((item) => off.has(item.id))
        .map((item) => (
          <input
            key={item.id}
            type="hidden"
            name={item.group === "robux" ? "robuxMethods" : "products"}
            value={item.id}
          />
        ))}
      <p className="mb-4 text-sm font-medium text-ink-700">{interpolate(t.stock.summary, { count: off.size })}</p>
      <div className="grid grid-cols-[minmax(0,1fr)] gap-5 lg:grid-cols-3">
        {groups.map(({ group, items: groupItems }) => (
          <fieldset key={group} className="min-w-0">
            <legend className="mb-2 text-xs font-semibold tracking-wider text-ink-500 uppercase">
              {t.stock[group]}
            </legend>
            <ul className="grid grid-cols-[minmax(0,1fr)] gap-2">
              {groupItems.map((item) => {
                const available = !off.has(item.id);
                return (
                  <li key={item.id}>
                    <label
                      className={cn(
                        "flex min-h-11 cursor-pointer items-center justify-between gap-3 rounded-xl border px-3 py-2 transition-colors has-focus-visible:ring-2 has-focus-visible:ring-brand-400",
                        available
                          ? "border-brand-100 bg-white hover:border-brand-300"
                          : "border-ink-300/40 bg-ink-300/10",
                      )}
                    >
                      <span className="min-w-0 truncate text-sm font-medium text-ink-900">{item.name}</span>
                      <span className="flex shrink-0 items-center gap-2">
                        <span className={cn("text-xs font-semibold", available ? "text-brand-700" : "text-ink-700")}>
                          {available ? t.stock.available : t.stock.soldOut}
                        </span>
                        <input
                          type="checkbox"
                          role="switch"
                          aria-label={`${item.name}: ${t.stock.available}`}
                          checked={available}
                          onChange={() => toggle(item.id)}
                          className="peer sr-only"
                        />
                        <span
                          aria-hidden="true"
                          className={cn(
                            "relative h-6 w-11 rounded-full transition-colors",
                            available ? "bg-brand-400" : "bg-ink-300",
                          )}
                        >
                          <span
                            className={cn(
                              "absolute top-0.5 left-0.5 size-5 rounded-full bg-white shadow transition-transform",
                              available && "translate-x-5",
                            )}
                          />
                        </span>
                      </span>
                    </label>
                  </li>
                );
              })}
            </ul>
          </fieldset>
        ))}
      </div>
      <SaveRow state={state} pending={pending} />
    </form>
  );
}
