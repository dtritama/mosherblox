import { rateLimit } from "@/server/rate-limit";
import { getPublicReviews } from "@/server/reviews";

/** One page of approved reviews for the home section (`?page=2`). Public data only, masked names. */
export async function GET(request: Request) {
  const json = (body: unknown, status = 200) =>
    Response.json(body, { status, headers: { "Cache-Control": "no-store" } });

  if (!(await rateLimit("reviews"))) return json({ error: "rateLimited" }, 429);
  const raw = new URL(request.url).searchParams.get("page") ?? "";
  // Only pages that exist: anything else must not fill the cache.
  const { pages } = await getPublicReviews();
  const page = /^\d{1,5}$/.test(raw) ? Number(raw) : 0;
  if (page < 1 || page > pages) return json({ error: "notFound", pages }, 404);
  const { items } = await getPublicReviews(page);
  return items.length > 0 ? json({ items, pages }) : json({ error: "unavailable" }, 503);
}
