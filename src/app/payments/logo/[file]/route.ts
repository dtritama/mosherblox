import { readPaymentLogo } from "@/server/payments/proof-storage";

/**
 * Logo of a payment method (uploaded in /admin/payments). Public: shown at checkout.
 * File names are random and never reused, so the response can be cached forever.
 */
export async function GET(_request: Request, { params }: RouteContext<"/payments/logo/[file]">) {
  const { file } = await params;
  const image = await readPaymentLogo(file);
  if (!image) return new Response("Not found", { status: 404 });
  return new Response(image.bytes, {
    headers: {
      "Content-Type": image.type,
      "Cache-Control": "public, max-age=31536000, immutable",
      "X-Content-Type-Options": "nosniff",
      "Content-Security-Policy": "default-src 'none'; sandbox",
    },
  });
}
