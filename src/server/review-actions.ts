"use server";

import { normalizeWhatsapp } from "@/lib/validation";
import { rateLimit } from "@/server/rate-limit";
import { REVIEW_LIMITS, submitReview, type ReviewError } from "@/server/reviews";

export type SubmitReviewResult = { ok: true } | { ok: false; error: ReviewError | "rateLimited" | "unavailable" };

/** Buyer review from Check Order: needs the order ID and WhatsApp number, like the lookup. */
export async function submitReviewAction(input: {
  orderId: string;
  whatsapp: string;
  rating: number;
  body: string;
}): Promise<SubmitReviewResult> {
  const raw = (input ?? {}) as Partial<Record<keyof typeof input, unknown>>;
  if (!(await rateLimit("review"))) return { ok: false, error: "rateLimited" };
  const phone = normalizeWhatsapp(typeof raw.whatsapp === "string" ? raw.whatsapp.slice(0, 32) : "");
  if (!phone) return { ok: false, error: "notFound" };
  try {
    return await submitReview({
      orderId: typeof raw.orderId === "string" ? raw.orderId.slice(0, 32) : "",
      whatsapp: phone,
      rating: typeof raw.rating === "number" ? raw.rating : 0,
      body: typeof raw.body === "string" ? raw.body.slice(0, REVIEW_LIMITS.bodyMax + 50) : "",
    });
  } catch (error) {
    console.error("[reviews] submit failed", error);
    return { ok: false, error: "unavailable" };
  }
}
