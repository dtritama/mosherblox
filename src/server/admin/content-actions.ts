"use server";

import { updateTag } from "next/cache";
import { banners as builtinBanners } from "@/data/banners";
import { en } from "@/i18n/dictionaries/en";
import { id } from "@/i18n/dictionaries/id";
import {
  BANNER_FILE,
  parseBanners,
  parseContact,
  parseFaq,
  parseTexts,
  type BannerContent,
  type ContentError,
  type SiteContent,
} from "@/lib/site-content";
import { requireAdmin } from "@/server/auth/admin";
import { deleteBannerImage, saveBannerImage } from "@/server/payments/proof-storage";
import { CONTENT_TAG, getFreshContent, resetContent, saveContent } from "@/server/site-content";

/** /admin/content actions. Owner only, like /admin/settings; every argument is re-validated here. */

export type ContentState = {
  ok?: boolean;
  error?: ContentError | "forbidden" | "unavailable" | "badImage";
  /** Which banner / question the error is about (0-based). */
  index?: number;
};

async function requireOwner() {
  const admin = await requireAdmin();
  return admin.role === "owner" ? admin : null;
}

const uploads = (banners: BannerContent[] | null) =>
  (banners ?? []).map((banner) => banner.image).filter((image) => BANNER_FILE.test(image));

export async function saveContentAction(field: keyof SiteContent, input: unknown): Promise<ContentState> {
  const admin = await requireOwner();
  if (!admin) return { error: "forbidden" };
  try {
    switch (field) {
      case "banners": {
        const parsed = parseBanners(input);
        if (!parsed.ok) return parsed;
        const known = builtinBanners.map((banner) => `builtin:${banner.id}`);
        const unknown = parsed.value.findIndex(({ image }) => !BANNER_FILE.test(image) && !known.includes(image));
        if (unknown >= 0) return { error: "bannerImage", index: unknown };
        const before = uploads((await getFreshContent()).content.banners);
        await saveContent("banners", parsed.value, admin.id);
        const kept = uploads(parsed.value);
        await Promise.all(before.filter((file) => !kept.includes(file)).map((file) => deleteBannerImage(file)));
        break;
      }
      case "contact": {
        const parsed = parseContact(input);
        if (!parsed.ok) return parsed;
        await saveContent("contact", parsed.value, admin.id);
        break;
      }
      case "faq": {
        const parsed = parseFaq(input);
        if (!parsed.ok) return parsed;
        await saveContent("faq", parsed.value, admin.id);
        break;
      }
      case "texts": {
        const parsed = parseTexts(input, { id, en });
        if (!parsed.ok) return parsed;
        await saveContent("texts", parsed.value, admin.id);
        break;
      }
      default:
        return { error: "invalid" };
    }
    updateTag(CONTENT_TAG);
    return { ok: true };
  } catch (error) {
    console.error("[admin] content save failed", error);
    return { error: "unavailable" };
  }
}

/** Back to the content in code. */
export async function resetContentAction(field: keyof SiteContent): Promise<ContentState> {
  const admin = await requireOwner();
  if (!admin) return { error: "forbidden" };
  if (!["banners", "contact", "faq", "texts"].includes(field)) return { error: "invalid" };
  try {
    const files = field === "banners" ? uploads((await getFreshContent()).content.banners) : [];
    await resetContent(field);
    await Promise.all(files.map((file) => deleteBannerImage(file)));
    updateTag(CONTENT_TAG);
    return { ok: true };
  } catch (error) {
    console.error("[admin] content reset failed", error);
    return { error: "unavailable" };
  }
}

/** One image per call (keeps each request under the upload limit). It goes live when the list is saved. */
export async function uploadBannerAction(formData: FormData): Promise<ContentState & { file?: string }> {
  if (!(await requireOwner())) return { error: "forbidden" };
  const file = formData.get("image");
  if (!(file instanceof File)) return { error: "badImage" };
  try {
    const saved = await saveBannerImage(file);
    return saved.ok ? { ok: true, file: saved.file } : { error: "badImage" };
  } catch (error) {
    console.error("[admin] banner upload failed", error);
    return { error: "unavailable" };
  }
}
