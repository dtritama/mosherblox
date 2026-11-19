import "server-only";
import { eq, inArray } from "drizzle-orm";
import { cacheLife, cacheTag } from "next/cache";
import { getDb, schema } from "@/server/db";
import { getAllCheckoutProducts } from "@/lib/catalog";
import { defaultSettings, mergeSettings, SETTING_KEYS, type SiteSettings } from "@/lib/settings";

/**
 * Store settings (/admin/settings) over the defaults in src/data/*.
 * - getSiteSettings(): cached, for pages (fast; refreshed within a minute, instantly after a save).
 * - getFreshSettings(): straight from the database, for pricing and creating orders.
 * A database problem never breaks the shop: the defaults are used instead.
 */

export const SETTINGS_TAG = "settings";

const keyOf = Object.fromEntries(Object.entries(SETTING_KEYS).map(([field, key]) => [key, field])) as Record<
  string,
  keyof SiteSettings
>;

async function readFromDb(): Promise<SiteSettings> {
  const rows = await getDb()
    .select({ key: schema.settings.key, value: schema.settings.value })
    .from(schema.settings)
    .where(inArray(schema.settings.key, Object.values(SETTING_KEYS)));
  const stored: Partial<Record<keyof SiteSettings, unknown>> = {};
  for (const row of rows) if (keyOf[row.key]) stored[keyOf[row.key]] = row.value;
  return mergeSettings(
    stored,
    getAllCheckoutProducts().map((product) => product.slug),
  );
}

export async function getSiteSettings(): Promise<SiteSettings> {
  "use cache";
  cacheTag(SETTINGS_TAG);
  cacheLife("minutes");
  try {
    return await readFromDb();
  } catch (error) {
    // E.g. no database during `next build`: prerender with the defaults; refreshed within a minute.
    console.warn("[settings] using defaults:", error instanceof Error ? error.message : error);
    return defaultSettings;
  }
}

export async function getFreshSettings(): Promise<SiteSettings> {
  try {
    return await readFromDb();
  } catch (error) {
    console.error("[settings] read failed, using defaults", error);
    return defaultSettings;
  }
}

export interface SettingMeta {
  updatedAt: string;
  updatedBy: string | null;
}

/** Who changed each setting last (admin page). */
export async function getSettingsMeta(): Promise<Partial<Record<keyof SiteSettings, SettingMeta>>> {
  const rows = await getDb()
    .select({ key: schema.settings.key, updatedAt: schema.settings.updatedAt, by: schema.admins.name })
    .from(schema.settings)
    .leftJoin(schema.admins, eq(schema.admins.id, schema.settings.updatedBy))
    .where(inArray(schema.settings.key, Object.values(SETTING_KEYS)));
  return Object.fromEntries(
    rows
      .filter((row) => keyOf[row.key])
      .map((row) => [keyOf[row.key], { updatedAt: row.updatedAt.toISOString(), updatedBy: row.by }]),
  );
}

/** Upsert one setting (value already validated by the caller). */
export async function saveSetting<K extends keyof SiteSettings>(field: K, value: SiteSettings[K], adminId: string) {
  await getDb()
    .insert(schema.settings)
    .values({ key: SETTING_KEYS[field], value, updatedBy: adminId })
    .onConflictDoUpdate({
      target: schema.settings.key,
      set: { value, updatedBy: adminId, updatedAt: new Date() },
    });
}

/** Back to the default from src/data/* (removes the stored override). */
export async function resetSetting(field: keyof SiteSettings) {
  await getDb().delete(schema.settings).where(eq(schema.settings.key, SETTING_KEYS[field]));
}
