import { getProofPath } from "@/server/admin/orders";
import { getAdmin } from "@/server/auth/admin";
import { readProof } from "@/server/payments/proof-storage";

/**
 * A buyer's transfer screenshot, for logged-in admins only. Served with a fixed image type,
 * no sniffing and no caching, so an uploaded file can never run as a page.
 */
export async function GET(_request: Request, { params }: RouteContext<"/admin/proofs/[paymentId]">) {
  if (!(await getAdmin())) return new Response("Unauthorized", { status: 401 });
  const { paymentId } = await params;
  const relative = await getProofPath(paymentId);
  const proof = relative ? await readProof(relative) : null;
  if (!proof) return new Response("Not found", { status: 404 });
  return new Response(proof.bytes, {
    headers: {
      "Content-Type": proof.type,
      "Content-Disposition": "inline",
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
      "Content-Security-Policy": "default-src 'none'; img-src 'self'; sandbox",
    },
  });
}
