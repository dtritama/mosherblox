import { readBannerImage } from "@/server/payments/proof-storage";

/** Home banner uploaded in /admin/content. Public; names are random and never reused → cache forever. */
export async function GET(_request: Request, { params }: RouteContext<"/banners/[file]">) {
  const { file } = await params;
  const image = await readBannerImage(file);
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
