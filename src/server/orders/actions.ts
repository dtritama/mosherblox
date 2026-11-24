"use server";

import type {
  ClaimPaymentResult,
  CreateOrderResult,
  FindOrderResult,
  ProductOrderInput,
  RobuxOrderInput,
} from "@/lib/orders/types";
import type { RobuxMethodId } from "@/data/robux";
import { normalizeWhatsapp } from "@/lib/validation";
import { quoteProductOrder, quoteRobuxOrder, type QuoteResult } from "@/server/orders/quote";
import { claimPayment, createOrder, findOrder } from "@/server/orders/service";
import { deleteProof, saveProof } from "@/server/payments/proof-storage";
import { rateLimit } from "@/server/rate-limit";
import { getFreshSettings } from "@/server/settings";
import { notifyTeam } from "@/server/jobs/queue";
import { after } from "next/server";
import { isProductSoldOut, isRobuxMethodSoldOut, type SiteSettings } from "@/lib/settings";
import { getProductBySlug } from "@/lib/catalog";
import { lookupRobloxUser } from "@/server/roblox/users";
import { hasReview } from "@/server/reviews";

/**
 * Server Actions the checkout and Check Order page call (through `orderService`).
 * Anyone can POST to these, so every argument is treated as untrusted: shapes are checked
 * here, values by the shared validation rules, and prices are computed on the server.
 * Errors come back as codes — never stack traces or raw rows.
 */

const str = (value: unknown, max = 300) => (typeof value === "string" ? value.slice(0, max) : "");

async function create(quote: QuoteResult, settings: SiteSettings): Promise<CreateOrderResult> {
  // Closed by the owner: refused even from a page that was opened before.
  if (!settings.storeOpen) return { ok: false, error: "storeClosed" };
  if (!quote.ok) return { ok: false, error: "invalid", fields: quote.fields };
  // Out of stock (admin settings), checked on the server whatever the page showed.
  const { kind, robuxMethod, productSlug } = quote.quote;
  const soldOut =
    kind === "robux"
      ? robuxMethod !== null && isRobuxMethodSoldOut(settings.soldOut, robuxMethod)
      : productSlug !== null && isProductSoldOut(settings.soldOut, productSlug);
  if (soldOut) return { ok: false, error: "soldOut" };
  if (kind === "robux" && settings.robuxStock !== null && (quote.quote.robuxAmount ?? 0) > settings.robuxStock) {
    return { ok: false, error: "notEnoughStock" };
  }
  if (!(await rateLimit("createOrder"))) return { ok: false, error: "rateLimited" };

  // The Roblox account the order is for: looked up here, whatever the browser showed.
  const deliversToUsername =
    kind === "robux" || (productSlug !== null && getProductBySlug(productSlug)?.delivery !== "voucher");
  let roblox: Pick<typeof quote.quote, "account" | "robloxUserId" | "robloxDisplayName"> = {
    account: quote.quote.account,
  };
  if (deliversToUsername) {
    try {
      const user = await lookupRobloxUser(quote.quote.account.toLowerCase());
      if (!user) return { ok: false, error: "invalid", fields: { account: "robloxNotFound" } };
      roblox = { account: user.name, robloxUserId: user.id, robloxDisplayName: user.displayName };
    } catch (error) {
      // Roblox down: don't block sales; the admin sees the order without a Roblox ID.
      console.warn("[orders] Roblox lookup failed, continuing:", error instanceof Error ? error.message : error);
    }
  }

  try {
    const order = await createOrder({ ...quote.quote, ...roblox }, { expiryMinutes: settings.orderExpiryMinutes });
    // Optional ping for every new order (DISCORD_NOTIFY_NEW_ORDERS=1); after the response is sent.
    if (process.env.DISCORD_NOTIFY_NEW_ORDERS === "1") after(() => notifyTeam({ kind: "newOrder", orderId: order.id }));
    return { ok: true, order };
  } catch (error) {
    console.error("[orders] create failed", error);
    return { ok: false, error: "unavailable" };
  }
}

export async function createRobuxOrderAction(input: RobuxOrderInput): Promise<CreateOrderResult> {
  const raw = (input ?? {}) as Partial<Record<keyof RobuxOrderInput, unknown>>;
  // Prices and expiry come from the admin settings, read fresh (never the cached copy the page used).
  const settings = await getFreshSettings();
  return create(
    quoteRobuxOrder(
      {
        method: str(raw.method, 32) as RobuxMethodId,
        amount: typeof raw.amount === "number" ? raw.amount : Number.NaN,
        account: str(raw.account),
        whatsapp: str(raw.whatsapp, 32),
        paymentId: str(raw.paymentId, 32),
        confirmed2sv: raw.confirmed2sv === true,
        confirmedAccount: raw.confirmedAccount === true,
      },
      settings.robuxRates,
    ),
    settings,
  );
}

export async function createProductOrderAction(input: ProductOrderInput): Promise<CreateOrderResult> {
  const raw = (input ?? {}) as Partial<Record<keyof ProductOrderInput, unknown>>;
  const settings = await getFreshSettings();
  return create(
    quoteProductOrder({
      productSlug: str(raw.productSlug, 100),
      optionId: str(raw.optionId, 100),
      account: str(raw.account),
      whatsapp: str(raw.whatsapp, 32),
      paymentId: str(raw.paymentId, 32),
      confirmedAccount: raw.confirmedAccount === true,
    }),
    settings,
  );
}

export async function findOrderAction(id: string, whatsapp: string): Promise<FindOrderResult> {
  if (!(await rateLimit("lookup"))) return { ok: false, error: "rateLimited" };
  const phone = normalizeWhatsapp(str(whatsapp, 32));
  if (!phone) return { ok: true, order: null };
  try {
    const order = await findOrder(str(id, 32), phone);
    // Completed orders can be reviewed once: tell Check Order whether that already happened.
    if (order?.status === "completed") order.hasReview = await hasReview(order.id);
    return { ok: true, order };
  } catch (error) {
    console.error("[orders] lookup failed", error);
    return { ok: false, error: "unavailable" };
  }
}

/**
 * "Saya sudah bayar": FormData with `orderId`, `whatsapp` and an optional `proof` image.
 * The proof is saved first (outside public/) and removed again if the order can't take it.
 */
export async function claimPaymentAction(formData: FormData): Promise<ClaimPaymentResult> {
  if (!(formData instanceof FormData)) return { ok: false, error: "notFound" };
  if (!(await rateLimit("claimPayment"))) return { ok: false, error: "rateLimited" };
  const orderId = str(formData.get("orderId"), 32);
  const phone = normalizeWhatsapp(str(formData.get("whatsapp"), 32));
  if (!orderId || !phone) return { ok: false, error: "notFound" };

  const proof = formData.get("proof");
  let proofPath: string | null = null;
  try {
    if (proof instanceof File && proof.size > 0) {
      const saved = await saveProof(proof, orderId.replace(/[^A-Z0-9-]/gi, "").slice(0, 16));
      if (!saved.ok) return { ok: false, error: "badProof" };
      proofPath = saved.path;
    }
    const result = await claimPayment(orderId, phone, proofPath);
    if (!result.ok) {
      if (proofPath) await deleteProof(proofPath);
      return result;
    }
    // The team's to-do: check the money. Queued after the response, so it never slows the buyer down.
    if (result.firstClaim) after(() => notifyTeam({ kind: "paymentClaimed", orderId: result.order.id }));
    return { ok: true, order: result.order };
  } catch (error) {
    if (proofPath) await deleteProof(proofPath).catch(() => undefined);
    console.error("[orders] claim payment failed", error);
    return { ok: false, error: "unavailable" };
  }
}
