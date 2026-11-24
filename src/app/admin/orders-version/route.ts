import { getOrdersVersion } from "@/server/admin/orders";
import { getAdmin } from "@/server/auth/admin";

/** Polled by the order list (components/admin/live-orders.tsx): a tiny "did anything change" check. */
export async function GET() {
  if (!(await getAdmin())) return new Response("Unauthorized", { status: 401 });
  return Response.json({ version: await getOrdersVersion() }, { headers: { "Cache-Control": "private, no-store" } });
}
