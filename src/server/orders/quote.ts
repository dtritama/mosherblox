import "server-only";
import { getCheckoutPaymentMethod } from "@/data/payments";
import { robuxConfig, type RobuxMethodId } from "@/data/robux";
import type { LocalizedText } from "@/i18n/config";
import { en } from "@/i18n/dictionaries/en";
import { id } from "@/i18n/dictionaries/id";
import { formatNumber } from "@/i18n/format";
import { getProductBySlug } from "@/lib/catalog";
import type { ProductOrderInput, RobuxOrderInput } from "@/lib/orders/types";
import { calculateRobuxPrice, type RobuxRates } from "@/lib/robux-pricing";
import { normalizeWhatsapp, validateOrder, validateRobuxOrder, type OrderErrorCode } from "@/lib/validation";

/**
 * Turns what the buyer picked into a priced order line, using only server-side data
 * (src/data/*) and the same pure rules as the checkout. Nothing priced by the browser is used.
 */
export interface OrderQuote {
  kind: "robux" | "product";
  productSlug: string | null;
  optionId: string | null;
  robuxMethod: RobuxMethodId | null;
  robuxAmount: number | null;
  productName: string;
  itemLabel: LocalizedText;
  account: string;
  whatsapp: string;
  paymentMethod: string;
  subtotal: number;
  fee: number;
  /** Filled in by the order action after looking `account` up on Roblox (never from the browser). */
  robloxUserId?: number | null;
  robloxDisplayName?: string | null;
}

export type QuoteResult =
  { ok: true; quote: OrderQuote } | { ok: false; fields: Partial<Record<string, OrderErrorCode>> };

const isRobuxMethod = (value: string): value is RobuxMethodId =>
  robuxConfig.methods.some((method) => method.id === value);

/** `rates`: the tiers in effect (admin settings); defaults to src/data/robux.ts. */
export function quoteRobuxOrder(input: RobuxOrderInput, rates?: RobuxRates): QuoteResult {
  if (!isRobuxMethod(input.method)) return { ok: false, fields: { amount: "amountMin" } };
  const amount = Number.isSafeInteger(input.amount) ? input.amount : null;
  const fields = validateRobuxOrder({ ...input, amount });
  const whatsapp = normalizeWhatsapp(input.whatsapp);
  const payment = getCheckoutPaymentMethod(input.paymentId);
  if (!payment) fields.payment = "pickPayment";
  if (Object.keys(fields).length > 0 || amount === null || !whatsapp || !payment) return { ok: false, fields };

  // Method names are the same in both languages; only the number format differs.
  const label = (locale: "id" | "en", name: string) => `${formatNumber(amount, locale)} Robux · ${name}`;
  return {
    ok: true,
    quote: {
      kind: "robux",
      productSlug: null,
      optionId: null,
      robuxMethod: input.method,
      robuxAmount: amount,
      productName: "Robux",
      itemLabel: {
        id: label("id", id.robux.methods[input.method].name),
        en: label("en", en.robux.methods[input.method].name),
      },
      account: input.account.trim(),
      whatsapp,
      paymentMethod: payment.id,
      subtotal: calculateRobuxPrice(input.method, amount, rates),
      fee: payment.fee,
    },
  };
}

export function quoteProductOrder(input: ProductOrderInput): QuoteResult {
  const product = getProductBySlug(input.productSlug);
  if (!product) return { ok: false, fields: { option: "pickOption" } };
  const optionIds = product.options.map((option) => option.id);
  const fields: Partial<Record<string, OrderErrorCode>> = validateOrder(product.delivery, optionIds, input);
  const option = product.options.find((item) => item.id === input.optionId);
  const whatsapp = normalizeWhatsapp(input.whatsapp);
  const payment = getCheckoutPaymentMethod(input.paymentId);
  if (!payment) fields.payment = "pickPayment";
  if (Object.keys(fields).length > 0 || !option || !whatsapp || !payment) return { ok: false, fields };

  return {
    ok: true,
    quote: {
      kind: "product",
      productSlug: product.slug,
      optionId: option.id,
      robuxMethod: null,
      robuxAmount: null,
      productName: product.name,
      itemLabel: option.label,
      account: input.account.trim(),
      whatsapp,
      paymentMethod: payment.id,
      subtotal: option.price,
      fee: payment.fee,
    },
  };
}
