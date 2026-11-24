import "server-only";
import { eq, inArray } from "drizzle-orm";
import { cacheLife, cacheTag } from "next/cache";
import { CONTENT_KEYS, defaultContent, mergeContent, type SiteContent } from "@/lib/site-content";
import { getDb, schema } from "@/server/db";

/**
 * Home page content (/admin/content), stored in the `settings` table.
 * - getSiteContent(): cached, for pages (refreshed instantly after a save via `updateTag`).
 * - getFreshContent(): straight from the database, for the editor; throws when it can't be read, so
 *   the editor never shows defaults that a save would then write over the real content.
 */

export const CONTENT_TAG = "content";

const { settings, admins } = schema;
type Field = keyof SiteContent;
const keyOf = Object.fromEntries(Object.entries(CONTENT_KEYS).map(([field, key]) => [key, field])) as Record<
  string,
  Field
>;

export interface ContentMeta {
  updatedAt: string;
  updatedBy: string | null;
}

async function readRows() {
  return getDb()
    .select({ key: settings.key, value: settings.value, updatedAt: settings.updatedAt, by: admins.name })
    .from(settings)
    .leftJoin(admins, eq(admins.id, settings.updatedBy))
    .where(inArray(settings.key, Object.values(CONTENT_KEYS)));
}

export async function getFreshContent() {
  const rows = await readRows();
  const stored: Partial<Record<Field, unknown>> = {};
  const meta: Partial<Record<Field, ContentMeta>> = {};
  for (const row of rows) {
    stored[keyOf[row.key]] = row.value;
    meta[keyOf[row.key]] = { updatedAt: row.updatedAt.toISOString(), updatedBy: row.by };
  }
  return { content: mergeContent(stored), meta };
}

export async function getSiteContent(): Promise<SiteContent> {
  "use cache";
  cacheTag(CONTENT_TAG);
  cacheLife("minutes");
  try {
    return (await getFreshContent()).content;
  } catch (error) {
    console.warn("[content] using defaults:", error instanceof Error ? error.message : error);
    return defaultContent;
  }
}

/** Upsert one part (value already validated by the caller). */
export async function saveContent<K extends Field>(field: K, value: SiteContent[K], adminId: string) {
  await getDb()
    .insert(settings)
    .values({ key: CONTENT_KEYS[field], value, updatedBy: adminId })
    .onConflictDoUpdate({
      target: settings.key,
      set: { value, updatedBy: adminId, updatedAt: new Date() },
    });
}

export async function resetContent(field: Field) {
  await getDb().delete(settings).where(eq(settings.key, CONTENT_KEYS[field]));
}
