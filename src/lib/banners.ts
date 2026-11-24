import type { StaticImageData } from "next/image";

import { banners as builtinBanners } from "@/data/banners";
import type { LocalizedText } from "@/i18n/config";
import type { BannerContent } from "@/lib/site-content";

/** A banner ready to render: built-in image (static import) or the URL of an uploaded one. */
export interface Banner {
  id: string;
  image: StaticImageData | string;
  alt: LocalizedText;
  href?: string;
}

/** The built-in banners in the editor's shape. */
export const defaultBanners: BannerContent[] = builtinBanners.map((banner) => ({
  id: banner.id,
  image: `builtin:${banner.id}`,
  alt: { ...banner.alt },
  href: banner.href ?? "",
  visible: true,
}));

/** Image for an editor value; null when a built-in banner no longer exists. */
export function resolveBannerImage(image: string): StaticImageData | string | null {
  if (!image.startsWith("builtin:")) return `/banners/${image}`;
  return builtinBanners.find((banner) => `builtin:${banner.id}` === image)?.image ?? null;
}

/** Visible banners in order. */
export function resolveBanners(content: BannerContent[] | null): Banner[] {
  return (content ?? defaultBanners)
    .filter((banner) => banner.visible)
    .flatMap((banner) => {
      const image = resolveBannerImage(banner.image);
      const alt = { id: banner.alt.id, en: banner.alt.en || banner.alt.id };
      return image ? [{ id: banner.id, image, alt, href: banner.href || undefined }] : [];
    });
}
