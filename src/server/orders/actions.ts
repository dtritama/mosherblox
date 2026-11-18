"use server";

import type { CreateOrderResult, FindOrderResult, ProductOrderInput, RobuxOrderInput } from "@/lib/orders/types";
import type { RobuxMethodId } from "@/data/robux";
import { normalizeWhatsapp } from "@/lib/validation";
import { quoteProductOrder, quoteRobuxOrder, type QuoteResult } from "@/server/orders/quote";
import { createOrder, findOrder } from "@/server/orders/service";
import { rateLimit } from "@/server/rate-limit";

/**
 * Server Actions the checkout and Check Order page call (through `orderService`).
 * Anyone can POST to these, so every argument is treated as untrusted: shapes are checked
 * here, values by the shared validation rules, and prices are computed on the server.
 * Errors come back as codes — never stack traces or raw rows.
 */

const str = (value: unknown, max = 300) => (typeof value === "string" ? value.slice(0, max) : "");

async function create(quote: QuoteResult): Promise<CreateOrderResult> {
  if (!quote.ok) return { ok: false, error: "invalid", fields: quote.fields };
  if (!(await rateLimit("createOrder"))) return { ok: false, error: "rateLimited" };
  try {
    return { ok: true, order: await createOrder(quote.quote) };
  } catch (error) {
    console.error("[orders] create failed", error);
    return { ok: false, error: "unavailable" };
  }
}

export async function createRobuxOrderAction(input: RobuxOrderInput): Promise<CreateOrderResult> {
  const raw = (input ?? {}) as Partial<Record<keyof RobuxOrderInput, unknown>>;
  return create(
    quoteRobuxOrder({
      method: str(raw.method, 32) as RobuxMethodId,
      amount: typeof raw.amount === "number" ? raw.amount : Number.NaN,
      account: str(raw.account),
      whatsapp: str(raw.whatsapp, 32),
      paymentId: str(raw.paymentId, 32),
      confirmed2sv: raw.confirmed2sv === true,
    }),
  );
}

export async function createProductOrderAction(input: ProductOrderInput): Promise<CreateOrderResult> {
  const raw = (input ?? {}) as Partial<Record<keyof ProductOrderInput, unknown>>;
  return create(
    quoteProductOrder({
      productSlug: str(raw.productSlug, 100),
      optionId: str(raw.optionId, 100),
      account: str(raw.account),
      whatsapp: str(raw.whatsapp, 32),
      paymentId: str(raw.paymentId, 32),
    }),
  );
}

export async function findOrderAction(id: string, whatsapp: string): Promise<FindOrderResult> {
  if (!(await rateLimit("lookup"))) return { ok: false, error: "rateLimited" };
  const phone = normalizeWhatsapp(str(whatsapp, 32));
  if (!phone) return { ok: true, order: null };
  try {
    return { ok: true, order: await findOrder(str(id, 32), phone) };
  } catch (error) {
    console.error("[orders] lookup failed", error);
    return { ok: false, error: "unavailable" };
  }
}
