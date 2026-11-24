"use client";

import { useRef, useState } from "react";

import { CountrySelect } from "@/components/checkout/country-select";
import type { FieldControlProps } from "@/components/checkout/form-parts";
import { useI18n } from "@/i18n/i18n-provider";
import { detectCountry, DIAL_CODES, type DialCode } from "@/lib/dial-codes";
import { cn } from "@/lib/utils";
import { LIMITS, sanitizeWhatsapp } from "@/lib/validation";

const INDONESIA = DIAL_CODES.find((item) => item.iso === "ID")!;

/**
 * WhatsApp number with a country picker (Indonesia by default). The value is one string that says the
 * country by itself: Indonesian numbers as typed ("0812…"), others with "+" ("+60 12…") — what
 * `normalizeWhatsapp` expects. Pasting a full "+60…" number picks the country.
 */
export function PhoneInput({
  value,
  onChange,
  invalid,
  control,
}: {
  value: string;
  onChange: (value: string) => void;
  invalid: boolean;
  control: FieldControlProps;
}) {
  const { dict } = useI18n();
  const t = dict.checkout.whatsapp;
  // Remembered for codes several countries share (+1).
  const inputRef = useRef<HTMLInputElement>(null);
  const [picked, setPicked] = useState<DialCode>(INDONESIA);

  const foreign = value.startsWith("+") && value.length > 1;
  const country = !foreign
    ? INDONESIA
    : picked !== INDONESIA && value.startsWith(`+${picked.code}`)
      ? picked
      : (detectCountry(value) ?? INDONESIA);
  const prefix = `+${country.code}`;
  const text = country !== INDONESIA && value.startsWith(prefix) ? value.slice(prefix.length).trimStart() : value;

  const emit = (next: DialCode, national: string) =>
    onChange(next === INDONESIA ? national : `+${next.code} ${national}`);

  const type = (raw: string) => {
    const clean = sanitizeWhatsapp(raw);
    // A whole international number was typed or pasted.
    const full = clean.startsWith("+") ? clean : clean.startsWith("00") ? `+${clean.slice(2)}` : null;
    if (full === null) return emit(country, clean);
    const found = detectCountry(full);
    if (found?.iso === "ID") return emit(INDONESIA, full.replace(/^\+\s*6\s*2/, "").trimStart());
    onChange(full);
  };

  const pick = (next: DialCode) => {
    setPicked(next);
    emit(next, text.replace(/^\+/, ""));
    // Straight on to the number.
    inputRef.current?.focus();
  };

  return (
    <div
      className={cn(
        "flex h-12 w-full min-w-0 rounded-xl border-2 bg-white transition-colors focus-within:border-brand-500",
        invalid ? "border-blush-500" : "border-brand-100 hover:border-brand-300",
      )}
    >
      <CountrySelect value={country} onSelect={pick} />
      <input
        ref={inputRef}
        {...control}
        type="tel"
        inputMode="tel"
        autoComplete="tel"
        maxLength={LIMITS.whatsappMax}
        placeholder={country === INDONESIA ? t.placeholder : t.placeholderForeign}
        value={text}
        onChange={(event) => type(event.target.value)}
        className="min-w-0 flex-1 rounded-r-[0.6rem] bg-transparent px-3 text-sm text-ink-900 outline-none placeholder:text-ink-300"
      />
    </div>
  );
}
