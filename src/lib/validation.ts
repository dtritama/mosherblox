import { robuxConfig, type RobuxMethodId } from "@/data/robux";
import { detectCountry, stripTrunkZero } from "@/lib/dial-codes";
import { getRobuxMaxAmount, getRobuxMethod } from "@/lib/robux-pricing";
import type { DeliveryType } from "@/types";

/**
 * Pure, framework-free validation so the same rules can be reused
 * by the API in phase 2 (server-side validation is still mandatory there).
 * Errors are returned as codes; the UI translates them via `dict.checkout.errors`.
 */

export const LIMITS = {
  usernameMax: 20,
  emailMax: 254,
  whatsappMax: 24,
} as const;

/** Roblox usernames: 3–20 characters, letters/digits, at most one underscore, not at the start or end. */
const ROBLOX_USERNAME = /^(?=.{3,20}$)[A-Za-z0-9]+(?:_[A-Za-z0-9]+)?$/;

export const isRobloxUsername = (value: string) => ROBLOX_USERNAME.test(value.trim());
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
/** Indonesian mobile number in international form: 62 + 8xx + 7–11 digits. */
const ID_MOBILE = /^628\d{7,11}$/;
/** Other countries (E.164): country code + number, 8–15 digits. */
const INTERNATIONAL = /^[1-9]\d{7,14}$/;

export type OrderErrorCode =
  | "invalidEmail"
  | "invalidUsername"
  | "invalidWhatsapp"
  | "pickOption"
  | "pickPayment"
  | "amountMin"
  | "amountMax"
  | "confirm2sv"
  /** The buyer didn't tick "Ya, ini akun Roblox saya" under the looked-up account. */
  | "confirmAccount"
  /** The server found no Roblox account with that username. */
  | "robloxNotFound";

export type AccountFieldType = "username" | "email";

/** Vouchers are emailed; everything else needs a Roblox username. */
export function getAccountFieldType(delivery: DeliveryType): AccountFieldType {
  return delivery === "voucher" ? "email" : "username";
}

/** Strip characters a Roblox username can never contain, while typing. */
export function sanitizeUsername(value: string) {
  return value.replace(/[^A-Za-z0-9_]/g, "").slice(0, LIMITS.usernameMax);
}

export function sanitizeEmail(value: string) {
  return value.replace(/\s/g, "").slice(0, LIMITS.emailMax);
}

/** Allow what people naturally type for a phone number: digits, a leading +, spaces and dashes. */
export function sanitizeWhatsapp(value: string) {
  return value.replace(/[^\d+\s-]/g, "").slice(0, LIMITS.whatsappMax);
}

/**
 * One canonical form per number:
 * - Indonesian ("0812-3456 7890", "812…", "62812…", "+62 812…") → "628123…"
 * - any other country, written with its code ("+60 12-345…", "0060…") → "+6012345…". The "+" stays: without
 *   it "81…" could be Japan or Indonesia. null = not a usable number.
 */
export function normalizeWhatsapp(value: string): string | null {
  const trimmed = value.trim();
  let digits = trimmed.replace(/\D/g, "");
  const international = trimmed.startsWith("+") || digits.startsWith("00");
  if (international) {
    digits = digits.replace(/^00/, "");
    digits = stripTrunkZero(digits);
    if (digits.startsWith("62")) return ID_MOBILE.test(digits) ? digits : null;
    return INTERNATIONAL.test(digits) && detectCountry(`+${digits}`) ? `+${digits}` : null;
  }
  if (digits.startsWith("0")) digits = `62${digits.slice(1)}`;
  else if (digits.startsWith("8")) digits = `62${digits}`;
  return ID_MOBILE.test(digits) ? digits : null;
}

/** Digits only, for wa.me links. */
export const whatsappDigits = (normalized: string) => normalized.replace(/\D/g, "");

/** "+60123456789" → "+60 123456789" (numbers outside Indonesia). */
export function formatForeignWhatsapp(normalized: string) {
  const code = detectCountry(normalized)?.code ?? "";
  return `+${code} ${whatsappDigits(normalized).slice(code.length)}`.trim();
}

function validateAccount(type: AccountFieldType, account: string): OrderErrorCode | undefined {
  const value = account.trim();
  if (type === "email") return EMAIL_PATTERN.test(value) ? undefined : "invalidEmail";
  return ROBLOX_USERNAME.test(value) ? undefined : "invalidUsername";
}

/* ---------- Product checkout (shop items, premium, gift cards, gamepasses) ---------- */

export type OrderField = "account" | "whatsapp" | "option" | "payment" | "confirmAccount";
export type OrderErrors = Partial<Record<OrderField, OrderErrorCode>>;

export interface OrderDraft {
  account: string;
  whatsapp: string;
  optionId: string;
  paymentId: string;
  /** Buyer ticked "Ya, ini akun Roblox saya" (only for products delivered to a Roblox username). */
  confirmedAccount: boolean;
}

export function validateOrder(delivery: DeliveryType, optionIds: readonly string[], draft: OrderDraft): OrderErrors {
  const errors: OrderErrors = {};
  const type = getAccountFieldType(delivery);
  const account = validateAccount(type, draft.account);
  if (account) errors.account = account;
  else if (type === "username" && !draft.confirmedAccount) errors.confirmAccount = "confirmAccount";
  if (!normalizeWhatsapp(draft.whatsapp)) errors.whatsapp = "invalidWhatsapp";
  if (!optionIds.includes(draft.optionId)) errors.option = "pickOption";
  if (!draft.paymentId) errors.payment = "pickPayment";
  return errors;
}

/* ---------- Robux panel ---------- */

export type RobuxOrderField = "amount" | "account" | "whatsapp" | "payment" | "confirm2sv" | "confirmAccount";
export type RobuxOrderErrors = Partial<Record<RobuxOrderField, OrderErrorCode>>;

export interface RobuxOrderDraft {
  method: RobuxMethodId;
  /** null while the input is empty. */
  amount: number | null;
  account: string;
  whatsapp: string;
  paymentId: string;
  /** Buyer confirmed 2-Step Verification is on (only checked for methods that require it). */
  confirmed2sv: boolean;
  /** Buyer ticked "Ya, ini akun Roblox saya" under the looked-up account. */
  confirmedAccount: boolean;
}

/** Amount rules for one order; pass the method to apply its daily limit. */
export function validateRobuxAmount(amount: number | null, method?: RobuxMethodId): OrderErrorCode | undefined {
  if (amount === null || amount < robuxConfig.minAmount) return "amountMin";
  if (amount > (method ? getRobuxMaxAmount(method) : robuxConfig.maxAmount)) return "amountMax";
  return undefined;
}

export function validateRobuxOrder(draft: RobuxOrderDraft): RobuxOrderErrors {
  const errors: RobuxOrderErrors = {};
  const amount = validateRobuxAmount(draft.amount, draft.method);
  if (amount) errors.amount = amount;
  const account = validateAccount("username", draft.account);
  if (account) errors.account = account;
  else if (!draft.confirmedAccount) errors.confirmAccount = "confirmAccount";
  if (!normalizeWhatsapp(draft.whatsapp)) errors.whatsapp = "invalidWhatsapp";
  if (!draft.paymentId) errors.payment = "pickPayment";
  if (getRobuxMethod(draft.method).requires2sv && !draft.confirmed2sv) errors.confirm2sv = "confirm2sv";
  return errors;
}
