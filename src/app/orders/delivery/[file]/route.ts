import { readDeliveryProof } from "@/server/payments/proof-storage";

/**
 * "Bukti pengiriman": the screenshot an admin uploaded to show the Robux / item was sent.
 * The file name is a random UUID that only appears after a Check Order lookup (order ID + WhatsApp)
 * or in the admin panel, so the link itself is the key. Names are never reused → cache forever,
 * but only in the buyer's own browser.
 */
export async function GET(_request: Request, { params }: RouteContext<"/orders/delivery/[file]">) {
  const { file } = await params;
  const image = await readDeliveryProof(file);
  if (!image) return new Response("Not found", { status: 404 });
  return new Response(image.bytes, {
    headers: {
      "Content-Type": image.type,
      "Cache-Control": "private, max-age=31536000, immutable",
      "X-Content-Type-Options": "nosniff",
      "X-Robots-Tag": "noindex",
      "Referrer-Policy": "no-referrer",
      "Content-Security-Policy": "default-src 'none'; sandbox",
    },
  });
}
