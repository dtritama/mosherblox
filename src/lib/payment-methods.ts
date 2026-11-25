import { getPaymentBrand, OTHER_BRAND, type PaymentKind } from "@/data/payment-brands";

/**
 * Transfer payment methods (bank accounts and e-wallets the owner adds in /admin/payments).
 * Pure: the admin form and the server use the same validation.
 */

/** Where a buyer sends the money. Saved with the order, so later edits never change an open order. */
export interface PayTo {
  brand: string;
  kind: PaymentKind;
  name: string;
  /** Digits only. */
  number: string;
  holder: string;
  logo: string | null;
}

/** What the checkout needs. Account numbers are only sent once an order exists. */
export type PaymentOption = Pick<PayTo, "brand" | "kind" | "name" | "logo"> & { id: string };

export interface AdminPaymentMethod extends PayTo {
  id: string;
  active: boolean;
  updatedAt: string;
  updatedBy: string | null;
}

export const PAYMENT_LIMITS = { max: 20, nameMax: 30, holderMax: 60 } as const;

export type PaymentMethodError = "brand" | "name" | "number" | "holder";

export interface PaymentMethodInput {
  brand: string;
  kind: string;
  name: string;
  number: string;
  holder: string;
}

const clean = (text: string) => text.replace(/\s+/g, " ").trim();

/** Spaces, dots and dashes are fine while typing; an e-wallet's +62 / 62 becomes 0. */
export function normalizeAccountNumber(raw: string, kind: PaymentKind) {
  const compact = raw.replace(/[\s.-]/g, "");
  const local = kind === "ewallet" ? compact.replace(/^\+?62(?=8)/, "0") : compact;
  const valid = kind === "ewallet" ? /^0\d{8,14}$/ : /^\d{6,20}$/;
  return valid.test(local) ? local : null;
}

export function parsePaymentMethod(
  input: PaymentMethodInput,
): { ok: true; value: Omit<PayTo, "logo"> } | { ok: false; errors: Partial<Record<PaymentMethodError, true>> } {
  const errors: Partial<Record<PaymentMethodError, true>> = {};
  const brand = getPaymentBrand(input.brand);
  if (!brand && input.brand !== OTHER_BRAND) errors.brand = true;
  const kind: PaymentKind = brand?.kind ?? (input.kind === "ewallet" ? "ewallet" : "bank");
  const name = brand?.name ?? clean(input.name);
  if (!errors.brand && (name.length < 2 || name.length > PAYMENT_LIMITS.nameMax)) errors.name = true;
  const number = normalizeAccountNumber(input.number, kind);
  if (!number) errors.number = true;
  const holder = clean(input.holder);
  if (holder.length < 2 || holder.length > PAYMENT_LIMITS.holderMax) errors.holder = true;
  if (Object.keys(errors).length > 0 || !number) return { ok: false, errors };
  return { ok: true, value: { brand: input.brand, kind, name, number, holder } };
}

/** 1234567890 → "1234 5678 90", easier to compare with a banking app. */
export const formatAccountNumber = (number: string) => number.replace(/(\d{4})(?=\d)/g, "$1 ");
