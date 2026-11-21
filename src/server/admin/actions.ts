"use server";

import { updateTag } from "next/cache";
import { redirect } from "next/navigation";
import { STATS_TAG } from "@/server/stats";
import { moderateReview, REVIEWS_TAG } from "@/server/reviews";
import { checkCredentials, endSession, requireAdmin, startSession } from "@/server/auth/admin";
import { hit, rateLimit } from "@/server/rate-limit";
import { canTransition } from "@/lib/orders/status";
import type { OrderStatus } from "@/lib/orders/types";
import { normalizeOrderId } from "@/lib/orders/order-id";
import { OrderTransitionError, transitionOrder } from "@/server/orders/service";
import { eq } from "drizzle-orm";
import { getDb, schema } from "@/server/db";
import { deleteDeliveryProof, saveDeliveryProof } from "@/server/payments/proof-storage";

/** Admin server actions. Each one checks the session itself — never trust that the UI hid a button. */

const str = (value: FormDataEntryValue | null, max: number) => (typeof value === "string" ? value.slice(0, max) : "");

export type LoginState = { error?: "invalid" | "rateLimited" | "unavailable"; email?: string };

export async function loginAction(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const email = str(formData.get("email"), 254).trim().toLowerCase();
  const password = str(formData.get("password"), 200);
  // Per connection and per account, so neither one IP nor a botnet on one email gets far.
  if (!(await rateLimit("adminLogin")) || !hit(`adminLoginEmail:${email}`, 5, 15 * 60_000)) {
    return { error: "rateLimited", email };
  }
  let ok = false;
  try {
    const admin = email && password ? await checkCredentials(email, password) : null;
    if (admin) {
      await startSession(admin.id);
      ok = true;
    }
  } catch (error) {
    console.error("[admin] login failed", error);
    return { error: "unavailable", email };
  }
  if (!ok) return { error: "invalid", email };
  redirect("/admin");
}

export async function logoutAction() {
  await endSession();
  redirect("/admin/login");
}

const STATUSES: readonly OrderStatus[] = ["pending", "paid", "processing", "completed", "failed", "expired"];

/** notAllowed also covers "someone changed this order meanwhile" — the page reloads to show the new state. */
export type StatusState = { ok?: boolean; error?: "notAllowed" | "unavailable" | "noteRequired" };

/** Move an order to another status (only moves the status machine allows), with an optional note. */
export async function setOrderStatusAction(_prev: StatusState, formData: FormData): Promise<StatusState> {
  const admin = await requireAdmin();
  const orderId = normalizeOrderId(str(formData.get("orderId"), 32));
  const from = str(formData.get("from"), 16) as OrderStatus;
  const to = str(formData.get("to"), 16) as OrderStatus;
  const note = str(formData.get("note"), 500).trim();
  if (!orderId || !STATUSES.includes(to) || !STATUSES.includes(from) || !canTransition(from, to)) {
    return { error: "notAllowed" };
  }
  // Failing an order is what the buyer asks support about: always say why.
  if (to === "failed" && !note) return { error: "noteRequired" };
  try {
    await transitionOrder(orderId, to, {
      actor: "admin",
      adminId: admin.id,
      note: note || undefined,
      expectedFrom: from,
    });
    // A completed order changes the Robux stock, the success counter and the leaderboard.
    if (to === "completed") {
      updateTag("settings");
      updateTag(STATS_TAG);
    }
    return { ok: true };
  } catch (error) {
    if (error instanceof OrderTransitionError) return { error: "notAllowed" };
    console.error("[admin] status change failed", error);
    return { error: "unavailable" };
  }
}

export type ReviewModerationState = { ok?: boolean; error?: "notFound" | "unavailable" };

/** Approve (show on the site) or reject a buyer review. */
export async function moderateReviewAction(
  _prev: ReviewModerationState,
  formData: FormData,
): Promise<ReviewModerationState> {
  const admin = await requireAdmin();
  const id = str(formData.get("reviewId"), 40);
  const decision = str(formData.get("decision"), 10);
  if (decision !== "approved" && decision !== "rejected") return { error: "notFound" };
  try {
    if (!(await moderateReview(id, decision, admin.id))) return { error: "notFound" };
    updateTag(REVIEWS_TAG);
    return { ok: true };
  } catch (error) {
    console.error("[admin] review moderation failed", error);
    return { error: "unavailable" };
  }
}

export type DeliveryProofState = {
  ok?: boolean;
  error?: "notAllowed" | "noImage" | "badImage" | "tooBig" | "unavailable";
};

/** A delivery proof only makes sense once the buyer has paid. */
const DELIVERY_PROOF_STATUSES: readonly OrderStatus[] = ["paid", "processing", "completed"];

/**
 * "Bukti pengiriman": upload (or replace) / remove the screenshot showing the Robux / item was
 * sent. The buyer sees it on Check Order.
 */
export async function deliveryProofAction(_prev: DeliveryProofState, formData: FormData): Promise<DeliveryProofState> {
  await requireAdmin();
  const orderId = normalizeOrderId(str(formData.get("orderId"), 32));
  const intent = str(formData.get("intent"), 10);
  const { orders } = schema;
  try {
    const db = getDb();
    const [order] = await db
      .select({ status: orders.status, deliveryProof: orders.deliveryProof })
      .from(orders)
      .where(eq(orders.id, orderId))
      .limit(1);
    if (!order) return { error: "notAllowed" };

    if (intent === "remove") {
      await db.update(orders).set({ deliveryProof: null, deliveryProofAt: null }).where(eq(orders.id, orderId));
      if (order.deliveryProof) await deleteDeliveryProof(order.deliveryProof).catch(() => undefined);
      return { ok: true };
    }

    if (!DELIVERY_PROOF_STATUSES.includes(order.status)) return { error: "notAllowed" };
    const file = formData.get("image");
    if (!(file instanceof File) || file.size === 0) return { error: "noImage" };
    const saved = await saveDeliveryProof(file);
    if (!saved.ok) return { error: saved.error === "tooBig" ? "tooBig" : "badImage" };
    try {
      await db
        .update(orders)
        .set({ deliveryProof: saved.file, deliveryProofAt: new Date() })
        .where(eq(orders.id, orderId));
    } catch (error) {
      await deleteDeliveryProof(saved.file).catch(() => undefined);
      throw error;
    }
    // Replaced: the old file isn't referenced any more.
    if (order.deliveryProof) await deleteDeliveryProof(order.deliveryProof).catch(() => undefined);
    return { ok: true };
  } catch (error) {
    console.error("[admin] delivery proof failed", error);
    return { error: "unavailable" };
  }
}
