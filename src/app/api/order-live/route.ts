import { createHash } from "node:crypto";
import { normalizeWhatsapp } from "@/lib/validation";
import { findOrder } from "@/server/orders/service";
import { isOverLimit, rateLimit } from "@/server/rate-limit";
import { hasReview } from "@/server/reviews";

/**
 * Live progress for an order the buyer has open (lib/orders/use-live-order.ts). Needs the order ID and
 * WhatsApp number, like the lookup — in the body, never in the URL. Sends the order only when it differs
 * from the version the browser has. Generous limit for real orders (many buyers can share one mobile
 * IP); wrong guesses have their own strict limit, so this is no way around the lookup's.
 */
export async function POST(request: Request) {
  const json = (body: unknown, status = 200) =>
    Response.json(body, { status, headers: { "Cache-Control": "private, no-store" } });

  if (!(await rateLimit("orderLive")) || (await isOverLimit("orderLiveMiss"))) return json({ error: "rateLimited" }, 429);
  let input: Record<string, unknown>;
  try {
    const text = await request.text();
    input = text.length < 500 ? (JSON.parse(text) as Record<string, unknown>) : {};
  } catch {
    return json({ error: "invalid" }, 400);
  }
  const id = typeof input?.id === "string" ? input.id.slice(0, 32) : "";
  const whatsapp = typeof input?.whatsapp === "string" ? normalizeWhatsapp(input.whatsapp.slice(0, 32)) : null;
  try {
    const order = id && whatsapp ? await findOrder(id, whatsapp) : null;
    if (!order) {
      await rateLimit("orderLiveMiss");
      return json({ error: "notFound" }, 404);
    }
    if (order.status === "completed") order.hasReview = await hasReview(order.id);
    const version = createHash("sha1").update(JSON.stringify(order)).digest("base64url");
    return json(version === input.version ? { version } : { version, order });
  } catch (error) {
    console.error("[orders] live lookup failed", error);
    return json({ error: "unavailable" }, 503);
  }
}
