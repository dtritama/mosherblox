import { readQrisImage } from "@/server/payments/proof-storage";

/**
 * The store's current QRIS image (uploaded in /admin/settings). Public: buyers must see it.
 * File names are random and never reused, so the response can be cached forever.
 */
export async function GET(_request: Request, { params }: RouteContext<"/payments/qris/[file]">) {
  const { file } = await params;
  const image = await readQrisImage(file);
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
