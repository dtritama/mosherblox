"use client";

import { ArrowDown, ArrowUp, ImageUp, Loader2, Pencil, Plus, Trash2, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useId, useRef, useState, useTransition, type FormEvent, type ReactNode } from "react";

import { adminCopy } from "@/app/admin/copy";
import { SubmitError } from "@/components/checkout/submit-error";
import { Button } from "@/components/ui/button";
import { PaymentLogo } from "@/components/ui/payment-logo";
import { getPaymentBrand, OTHER_BRAND, paymentBrands, type PaymentKind } from "@/data/payment-brands";
import { orderConfig } from "@/data/orders";
import { interpolate } from "@/i18n/format";
import {
  formatAccountNumber,
  PAYMENT_LIMITS,
  parsePaymentMethod,
  type AdminPaymentMethod,
  type PaymentMethodError,
} from "@/lib/payment-methods";
import { cn } from "@/lib/utils";
import {
  deletePaymentMethodAction,
  movePaymentMethodAction,
  savePaymentMethodAction,
  setPaymentMethodActiveAction,
  type PaymentMethodState,
} from "@/server/admin/payment-actions";

const t = adminCopy.payments;
const dialogClass =
  "m-auto w-[calc(100%-2rem)] translate-y-0 rounded-[1.75rem] bg-white p-0 text-ink-900 opacity-100 shadow-2xl transition-[opacity,translate] duration-200 backdrop:bg-coal/50 backdrop:backdrop-blur-sm dark:border dark:border-brand-100 dark:backdrop:bg-black/60 starting:open:translate-y-3 starting:open:opacity-0";
const iconButton =
  "grid size-11 place-items-center rounded-xl text-ink-500 transition-colors enabled:hover:bg-brand-50 enabled:hover:text-ink-900 disabled:opacity-30";
const control =
  "h-12 w-full min-w-0 rounded-xl border-2 bg-white px-4 text-base text-ink-900 outline-none placeholder:text-ink-300 focus:border-brand-500 sm:text-sm";

const failed = (): PaymentMethodState => ({ error: "unavailable" });

/** /admin/payments: the owner's bank / e-wallet accounts — add, edit, on/off, order, delete. */
export function PaymentMethods({ methods, owner }: { methods: AdminPaymentMethod[]; owner: boolean }) {
  const router = useRouter();
  const [busy, startBusy] = useTransition();
  const [error, setError] = useState<PaymentMethodState["error"] | null>(null);
  // key: every opening starts with a fresh form.
  const [editing, setEditing] = useState<{ key: number; method: AdminPaymentMethod | null } | null>(null);
  const [removing, setRemoving] = useState<AdminPaymentMethod | null>(null);

  const run = (action: () => Promise<PaymentMethodState>) =>
    startBusy(async () => {
      const result = await action().catch(failed);
      setError(result.error ?? null);
      router.refresh();
    });
  const edit = (method: AdminPaymentMethod | null) => setEditing({ key: Date.now(), method });

  return (
    <section aria-labelledby="payment-accounts" className="mt-5 rounded-[1.75rem] border border-brand-100 bg-white">
      <div className="flex flex-wrap items-center justify-between gap-3 p-4 sm:p-5">
        <h2 id="payment-accounts" className="text-lg font-bold text-ink-900">
          {t.accounts}
        </h2>
        {owner ? (
          <Button onClick={() => edit(null)} disabled={methods.length >= PAYMENT_LIMITS.max}>
            <Plus className="size-4" aria-hidden="true" />
            {t.add}
          </Button>
        ) : null}
      </div>
      <SubmitError message={error ? t.errors[error] : null} className="mx-4 mb-4 sm:mx-5" />

      {methods.length === 0 ? (
        <p className="border-t border-brand-100 px-6 py-12 text-center text-sm text-ink-500">{t.empty}</p>
      ) : (
        <ul className="divide-y divide-brand-100 border-t border-brand-100">
          {methods.map((method, index) => (
            <li key={method.id} className="flex flex-wrap items-center gap-x-4 gap-y-3 p-4 sm:px-5">
              <div className={cn("flex min-w-0 flex-1 basis-64 items-center gap-4", !method.active && "opacity-50")}>
                <PaymentLogo name={method.name} brand={method.brand} logo={method.logo} className="h-12 w-20 p-1.5" />
                <div className="min-w-0">
                  <p className="font-semibold break-words text-ink-900">{method.name}</p>
                  <p className="font-mono text-sm break-words text-ink-700 tabular-nums">
                    {formatAccountNumber(method.number)}
                  </p>
                  <p className="text-xs break-words text-ink-500">
                    {interpolate(t.holderLine, { name: method.holder })}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1 max-sm:w-full max-sm:justify-between">
                <button
                  type="button"
                  role="switch"
                  aria-checked={method.active}
                  aria-label={interpolate(t.toggle, { name: method.name })}
                  disabled={!owner || busy}
                  onClick={() => run(() => setPaymentMethodActiveAction(method.id, !method.active))}
                  className="mr-2 flex h-11 items-center gap-2.5 text-sm font-medium text-ink-700"
                >
                  <span
                    aria-hidden="true"
                    className={cn(
                      "flex h-6 w-11 rounded-full p-0.5 transition-colors",
                      method.active ? "bg-brand-500" : "bg-ink-300",
                    )}
                  >
                    <span
                      className={cn(
                        "size-5 rounded-full bg-snow shadow transition-transform",
                        method.active && "translate-x-5",
                      )}
                    />
                  </span>
                  <span className="w-14 text-left">{method.active ? t.active : t.inactive}</span>
                </button>
                {owner ? (
                  <div className="flex">
                    <IconButton
                      label={interpolate(t.up, { name: method.name })}
                      disabled={busy || index === 0}
                      onClick={() => run(() => movePaymentMethodAction(method.id, "up"))}
                    >
                      <ArrowUp className="size-4" aria-hidden="true" />
                    </IconButton>
                    <IconButton
                      label={interpolate(t.down, { name: method.name })}
                      disabled={busy || index === methods.length - 1}
                      onClick={() => run(() => movePaymentMethodAction(method.id, "down"))}
                    >
                      <ArrowDown className="size-4" aria-hidden="true" />
                    </IconButton>
                    <IconButton
                      label={interpolate(t.editOne, { name: method.name })}
                      disabled={busy}
                      onClick={() => edit(method)}
                    >
                      <Pencil className="size-4" aria-hidden="true" />
                    </IconButton>
                    <IconButton
                      label={interpolate(t.removeOne, { name: method.name })}
                      disabled={busy}
                      onClick={() => setRemoving(method)}
                      className="enabled:hover:bg-blush-50 enabled:hover:text-blush-700"
                    >
                      <Trash2 className="size-4" aria-hidden="true" />
                    </IconButton>
                  </div>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      )}

      {editing ? (
        <MethodDialog
          key={editing.key}
          method={editing.method}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            setError(null);
            router.refresh();
          }}
        />
      ) : null}
      {removing ? (
        <RemoveDialog
          key={removing.id}
          method={removing}
          onClose={() => setRemoving(null)}
          onRemoved={() => {
            setRemoving(null);
            setError(null);
            router.refresh();
          }}
        />
      ) : null}
    </section>
  );
}

function IconButton({
  label,
  className,
  ...props
}: {
  label: string;
  disabled: boolean;
  onClick: () => void;
  className?: string;
  children: ReactNode;
}) {
  return <button type="button" aria-label={label} title={label} className={cn(iconButton, className)} {...props} />;
}

/** Opens as soon as it is mounted; unmounted again by onClose. */
function useModal() {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = ref.current;
    if (dialog && !dialog.open) dialog.showModal();
  }, []);
  return ref;
}

function MethodDialog({
  method,
  onClose,
  onSaved,
}: {
  method: AdminPaymentMethod | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const ref = useModal();
  const id = useId();
  const [pending, startSave] = useTransition();
  const [brand, setBrand] = useState(method?.brand ?? "");
  const [kind, setKind] = useState<PaymentKind>(method?.kind ?? "bank");
  const [name, setName] = useState(method?.brand === OTHER_BRAND ? method.name : "");
  const [number, setNumber] = useState(method?.number ?? "");
  const [holder, setHolder] = useState(method?.holder ?? "");
  const [active, setActive] = useState(method?.active ?? true);
  const [logo, setLogo] = useState<{ file: File; url: string } | null>(null);
  const [removeLogo, setRemoveLogo] = useState(false);
  const [touched, setTouched] = useState(false);
  const [error, setError] = useState<PaymentMethodState["error"] | null>(null);

  useEffect(() => () => void (logo && URL.revokeObjectURL(logo.url)), [logo]);

  const preset = getPaymentBrand(brand);
  const isOther = brand === OTHER_BRAND;
  const shownKind = preset?.kind ?? kind;
  const input = { brand, kind, name, number, holder };
  const parsed = parsePaymentMethod(input);
  const errors: Partial<Record<PaymentMethodError, true>> = touched && !parsed.ok ? parsed.errors : {};
  // The stored logo belongs to the brand it was saved with.
  const ownLogo = method?.logo?.startsWith("/payments/logo/") ? method.logo : null;
  const keepsOwn = ownLogo !== null && !removeLogo;
  const shownLogo = logo?.url ?? (keepsOwn ? ownLogo : (preset?.logo ?? null));

  const pickBrand = (next: string) => {
    if (next === brand) return;
    setBrand(next);
    // Another brand: an earlier own logo no longer fits.
    if (next !== method?.brand) setRemoveLogo(true);
    else setRemoveLogo(false);
    setLogo(null);
  };
  const pickLogo = (file: File | null) => {
    if (!file) return;
    const ok =
      file.size <= orderConfig.proofMaxBytes && (orderConfig.proofTypes as readonly string[]).includes(file.type);
    setError(ok ? null : "badImage");
    if (ok) setLogo({ file, url: URL.createObjectURL(file) });
  };

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setTouched(true);
    if (!parsed.ok) {
      const first = (["brand", "name", "number", "holder"] as const).find((field) => parsed.errors[field]);
      if (first)
        document.getElementById(first === "brand" ? `${id}-brand-${paymentBrands[0].id}` : `${id}-${first}`)?.focus();
      return;
    }
    const data = new FormData();
    if (method) data.set("id", method.id);
    for (const [key, value] of Object.entries(input)) data.set(key, value);
    data.set("active", active ? "1" : "0");
    if (removeLogo) data.set("removeLogo", "1");
    if (logo) data.set("logo", logo.file);
    startSave(async () => {
      const result = await savePaymentMethodAction(data).catch(failed);
      if (result.ok) onSaved();
      else setError(result.error ?? "unavailable");
    });
  };

  return (
    <dialog
      ref={ref}
      aria-labelledby={`${id}-title`}
      onClose={onClose}
      onCancel={(event) => pending && event.preventDefault()}
      className={cn(dialogClass, "max-h-[calc(100dvh-2rem)] max-w-xl")}
    >
      <form onSubmit={submit} noValidate className="p-5 sm:p-6">
        <h2 id={`${id}-title`} className="text-xl font-bold">
          {method ? t.editTitle : t.addTitle}
        </h2>

        <fieldset className="mt-5 min-w-0">
          <legend className="text-sm font-semibold">{t.brand}</legend>
          {(["ewallet", "bank"] as const).map((group) => (
            <div key={group} className="mt-3">
              <p className="mb-1.5 text-xs text-ink-500">{t.kinds[group]}</p>
              <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
                {paymentBrands
                  .filter((item) => item.kind === group)
                  .map((item) => (
                    <BrandOption
                      key={item.id}
                      id={`${id}-brand-${item.id}`}
                      group={`${id}-brand`}
                      checked={brand === item.id}
                      onChange={() => pickBrand(item.id)}
                      name={item.name}
                    >
                      <PaymentLogo name={item.name} brand={item.id} logo={item.logo} className="h-9 w-full border-0" />
                    </BrandOption>
                  ))}
              </div>
            </div>
          ))}
          <div className="mt-2 grid">
            <BrandOption
              id={`${id}-brand-other`}
              group={`${id}-brand`}
              checked={isOther}
              onChange={() => pickBrand(OTHER_BRAND)}
              name={t.other}
            >
              <span className="grid h-9 place-items-center text-sm font-semibold text-ink-700">{t.other}</span>
            </BrandOption>
          </div>
          {errors.brand ? <FieldError>{t.fieldErrors.brand}</FieldError> : null}
        </fieldset>

        {isOther ? (
          <div className="mt-5 grid grid-cols-[minmax(0,1fr)] gap-4 sm:grid-cols-2">
            <Field id={`${id}-name`} label={t.name} error={errors.name ? t.fieldErrors.name : undefined}>
              <input
                id={`${id}-name`}
                value={name}
                maxLength={PAYMENT_LIMITS.nameMax}
                placeholder={t.namePlaceholder}
                aria-invalid={Boolean(errors.name)}
                aria-describedby={errors.name ? `${id}-name-error` : undefined}
                onChange={(event) => setName(event.target.value)}
                className={cn(control, errors.name ? "border-blush-500" : "border-brand-100 hover:border-brand-300")}
              />
            </Field>
            <fieldset className="min-w-0">
              <legend className="mb-1.5 text-sm font-semibold">{t.kind}</legend>
              <div className="grid grid-cols-2 gap-2">
                {(["bank", "ewallet"] as const).map((value) => (
                  <label
                    key={value}
                    className={cn(
                      "grid h-12 cursor-pointer place-items-center rounded-xl border-2 text-sm font-medium transition-colors has-focus-visible:ring-2 has-focus-visible:ring-brand-400",
                      kind === value ? "border-brand-500 bg-brand-50" : "border-brand-100 hover:border-brand-300",
                    )}
                  >
                    <input
                      type="radio"
                      name={`${id}-kind`}
                      className="sr-only"
                      checked={kind === value}
                      onChange={() => setKind(value)}
                    />
                    {t.kinds[value]}
                  </label>
                ))}
              </div>
            </fieldset>
          </div>
        ) : null}

        <div className="mt-5 grid grid-cols-[minmax(0,1fr)] gap-4 sm:grid-cols-2">
          <Field
            id={`${id}-number`}
            label={t.number[shownKind]}
            error={errors.number ? t.fieldErrors.number[shownKind] : undefined}
          >
            <input
              id={`${id}-number`}
              inputMode="numeric"
              autoComplete="off"
              value={number}
              maxLength={30}
              placeholder={shownKind === "ewallet" ? "0812 3456 7890" : "1234567890"}
              aria-invalid={Boolean(errors.number)}
              aria-describedby={errors.number ? `${id}-number-error` : undefined}
              onChange={(event) => setNumber(event.target.value)}
              className={cn(
                control,
                "font-mono tabular-nums",
                errors.number ? "border-blush-500" : "border-brand-100 hover:border-brand-300",
              )}
            />
          </Field>
          <Field id={`${id}-holder`} label={t.holder} error={errors.holder ? t.fieldErrors.holder : undefined}>
            <input
              id={`${id}-holder`}
              autoComplete="off"
              value={holder}
              maxLength={PAYMENT_LIMITS.holderMax}
              placeholder={t.holderPlaceholder}
              aria-invalid={Boolean(errors.holder)}
              aria-describedby={errors.holder ? `${id}-holder-error` : undefined}
              onChange={(event) => setHolder(event.target.value)}
              className={cn(control, errors.holder ? "border-blush-500" : "border-brand-100 hover:border-brand-300")}
            />
          </Field>
        </div>

        {preset || isOther ? (
          <div className="mt-5">
            <p className="text-sm font-semibold">{t.logo}</p>
            <div className="mt-1.5 flex flex-wrap items-center gap-3">
              <PaymentLogo
                name={preset?.name ?? (name.trim() || t.other)}
                brand={brand}
                logo={shownLogo}
                className="h-12 w-24 p-1.5"
              />
              <span className="relative inline-flex">
                <input
                  id={`${id}-logo`}
                  type="file"
                  accept={orderConfig.proofTypes.join(",")}
                  onChange={(event) => {
                    pickLogo(event.target.files?.[0] ?? null);
                    event.target.value = "";
                  }}
                  className="peer sr-only"
                />
                <label
                  htmlFor={`${id}-logo`}
                  className="inline-flex h-11 cursor-pointer items-center gap-2 rounded-xl bg-brand-100 px-4 text-sm font-semibold text-brand-800 transition-colors peer-focus-visible:ring-2 peer-focus-visible:ring-brand-400 hover:bg-brand-200"
                >
                  <ImageUp className="size-4" aria-hidden="true" />
                  {t.logoChoose}
                </label>
              </span>
              {logo || keepsOwn ? (
                <button
                  type="button"
                  onClick={() => (logo ? setLogo(null) : setRemoveLogo(true))}
                  className="inline-flex h-11 items-center gap-1.5 rounded-xl px-3 text-sm font-semibold text-ink-500 hover:bg-brand-50 hover:text-ink-900"
                >
                  <X className="size-4" aria-hidden="true" />
                  {t.logoRemove}
                </button>
              ) : null}
            </div>
            <p className="mt-1.5 text-xs text-ink-500">{t.logoHint}</p>
          </div>
        ) : null}

        <label className="mt-5 flex min-h-11 cursor-pointer items-center gap-3 text-sm">
          <input
            type="checkbox"
            checked={active}
            onChange={(event) => setActive(event.target.checked)}
            className="size-5 accent-brand-500"
          />
          {t.showAtCheckout}
        </label>

        <p className="mt-3 rounded-xl bg-blush-50 px-4 py-3 text-sm text-blush-900">{t.checkTwice}</p>
        <SubmitError message={error ? t.errors[error] : null} className="mt-4" />

        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button variant="outline" disabled={pending} onClick={() => ref.current?.close()}>
            {t.cancel}
          </Button>
          <Button type="submit" disabled={pending}>
            {pending ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : null}
            {pending ? t.saving : t.save}
          </Button>
        </div>
      </form>
    </dialog>
  );
}

function BrandOption({
  id,
  group,
  checked,
  onChange,
  name,
  children,
}: {
  id: string;
  group: string;
  checked: boolean;
  onChange: () => void;
  name: string;
  children: ReactNode;
}) {
  return (
    <label
      title={name}
      className={cn(
        "min-w-0 cursor-pointer rounded-xl border-2 p-1 transition-colors has-focus-visible:ring-2 has-focus-visible:ring-brand-400",
        checked ? "border-brand-500 bg-brand-50" : "border-brand-100 hover:border-brand-300",
      )}
    >
      <input
        id={id}
        type="radio"
        name={group}
        className="sr-only"
        checked={checked}
        onChange={onChange}
        aria-label={name}
      />
      {children}
    </label>
  );
}

function Field({ id, label, error, children }: { id: string; label: string; error?: string; children: ReactNode }) {
  return (
    <div className="min-w-0">
      <label htmlFor={id} className="mb-1.5 block text-sm font-semibold">
        {label}
      </label>
      {children}
      {error ? <FieldError id={`${id}-error`}>{error}</FieldError> : null}
    </div>
  );
}

function FieldError({ id, children }: { id?: string; children: ReactNode }) {
  return (
    <p id={id} role="alert" className="mt-1.5 text-xs font-medium text-blush-700">
      {children}
    </p>
  );
}

function RemoveDialog({
  method,
  onClose,
  onRemoved,
}: {
  method: AdminPaymentMethod;
  onClose: () => void;
  onRemoved: () => void;
}) {
  const ref = useModal();
  const titleId = useId();
  const [pending, startRemove] = useTransition();
  const [error, setError] = useState<PaymentMethodState["error"] | null>(null);
  const remove = () =>
    startRemove(async () => {
      const result = await deletePaymentMethodAction(method.id).catch(failed);
      if (result.ok) onRemoved();
      else setError(result.error ?? "unavailable");
    });

  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      onClose={onClose}
      onCancel={(event) => pending && event.preventDefault()}
      className={cn(dialogClass, "max-w-md")}
    >
      <div className="p-6">
        <span className="grid size-12 place-items-center rounded-2xl bg-blush-100 text-blush-700">
          <Trash2 className="size-6" aria-hidden="true" />
        </span>
        <h2 id={titleId} className="mt-4 text-xl font-bold">
          {interpolate(t.removeTitle, { name: method.name })}
        </h2>
        <p className="mt-1.5 text-sm break-words text-ink-700">
          {interpolate(t.removeText, { number: formatAccountNumber(method.number) })}
        </p>
        <SubmitError message={error ? t.errors[error] : null} className="mt-4" />
        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button variant="outline" autoFocus disabled={pending} onClick={() => ref.current?.close()}>
            {t.cancel}
          </Button>
          <Button variant="pink" disabled={pending} onClick={remove}>
            {pending ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : null}
            {pending ? t.removing : t.remove}
          </Button>
        </div>
      </div>
    </dialog>
  );
}
