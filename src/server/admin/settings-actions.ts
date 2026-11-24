"use server";

import { updateTag } from "next/cache";
import {
  isValidExpiry,
  isValidStock,
  parseClosedMessage,
  parseRobuxRates,
  parseSoldOut,
  SETTING_LIMITS,
  type RatesError,
  type SiteSettings,
} from "@/lib/settings";
import type { RobuxMethodId } from "@/data/robux";
import { getAllCheckoutProducts } from "@/lib/catalog";
import { requireAdmin, type AdminUser } from "@/server/auth/admin";
import { saveQrisImage } from "@/server/payments/proof-storage";
import { getFreshSettings, resetSetting, saveSetting, SETTINGS_TAG } from "@/server/settings";

/**
 * /admin/settings actions. Owner only: staff can handle orders but not change prices or the QRIS.
 * Every save refreshes the cached settings the shop pages use (`updateTag`).
 */

export type SettingsState = {
  ok?: boolean;
  error?: "forbidden" | "invalid" | "unavailable" | "badImage";
  rateErrors?: Partial<Record<RobuxMethodId, RatesError>>;
};

async function requireOwner(): Promise<AdminUser | null> {
  const admin = await requireAdmin();
  return admin.role === "owner" ? admin : null;
}

const str = (value: FormDataEntryValue | null, max: number) => (typeof value === "string" ? value.slice(0, max) : "");

async function run(save: (admin: AdminUser) => Promise<SettingsState>): Promise<SettingsState> {
  const admin = await requireOwner();
  if (!admin) return { error: "forbidden" };
  try {
    const result = await save(admin);
    if (result.ok) updateTag(SETTINGS_TAG);
    return result;
  } catch (error) {
    console.error("[admin] settings save failed", error);
    return { error: "unavailable" };
  }
}

export async function saveRobuxRatesAction(_prev: SettingsState, formData: FormData): Promise<SettingsState> {
  return run(async (admin) => {
    let input: unknown;
    try {
      input = JSON.parse(str(formData.get("rates"), 5000));
    } catch {
      return { error: "invalid" };
    }
    const parsed = parseRobuxRates(input);
    if (!parsed.ok) return { error: "invalid", rateErrors: parsed.errors };
    await saveSetting("robuxRates", parsed.rates, admin.id);
    return { ok: true };
  });
}

/** Robux in stock (whole number). Completed Robux orders subtract from it automatically. */
export async function saveRobuxStockAction(_prev: SettingsState, formData: FormData): Promise<SettingsState> {
  return run(async (admin) => {
    const amount = Number(str(formData.get("amount"), 12).replace(/\D/g, ""));
    if (!isValidStock(amount)) return { error: "invalid" };
    await saveSetting("robuxStock", amount, admin.id);
    return { ok: true };
  });
}

/** Header switch: open / close the store for new orders. */
export async function setStoreOpenAction(open: boolean): Promise<SettingsState> {
  return run(async (admin) => {
    if (typeof open !== "boolean") return { error: "invalid" };
    await saveSetting("storeOpen", open, admin.id);
    return { ok: true };
  });
}

/** Text buyers see while the store is closed. */
export async function saveClosedMessageAction(_prev: SettingsState, formData: FormData): Promise<SettingsState> {
  return run(async (admin) => {
    const message = parseClosedMessage({ id: str(formData.get("id"), 1000), en: str(formData.get("en"), 1000) });
    if (!message) return { error: "invalid" };
    await saveSetting("closedMessage", message, admin.id);
    return { ok: true };
  });
}

export async function saveExpiryAction(_prev: SettingsState, formData: FormData): Promise<SettingsState> {
  return run(async (admin) => {
    const minutes = Number(str(formData.get("minutes"), 6));
    if (!isValidExpiry(minutes)) return { error: "invalid" };
    await saveSetting("orderExpiryMinutes", minutes, admin.id);
    return { ok: true };
  });
}

/** New QRIS image (optional: keeps the current one) + merchant name + NMID. */
export async function saveQrisAction(_prev: SettingsState, formData: FormData): Promise<SettingsState> {
  return run(async (admin) => {
    const merchantName = str(formData.get("merchantName"), SETTING_LIMITS.merchantNameMax).trim();
    const nmid = str(formData.get("nmid"), 30)
      .trim()
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, "");
    if (!merchantName) return { error: "invalid" };

    const current = (await getFreshSettings()).qris;
    let image = { image: current.image, width: current.width, height: current.height };
    const file = formData.get("image");
    if (file instanceof File && file.size > 0) {
      const width = Number(str(formData.get("width"), 6));
      const height = Number(str(formData.get("height"), 6));
      if (
        !Number.isInteger(width) ||
        !Number.isInteger(height) ||
        width < 100 ||
        height < 100 ||
        width > 8000 ||
        height > 8000
      ) {
        return { error: "badImage" };
      }
      const saved = await saveQrisImage(file);
      if (!saved.ok) return { error: "badImage" };
      image = { image: `/payments/qris/${saved.file}`, width, height };
    }
    await saveSetting("qris", { ...image, merchantName, nmid }, admin.id);
    return { ok: true };
  });
}

/** Sold-out switches: the form sends the ids that are OFF (out of stock). */
export async function saveSoldOutAction(_prev: SettingsState, formData: FormData): Promise<SettingsState> {
  return run(async (admin) => {
    const soldOut = parseSoldOut(
      {
        robuxMethods: formData.getAll("robuxMethods").slice(0, 10),
        products: formData.getAll("products").slice(0, 200),
      },
      getAllCheckoutProducts().map((product) => product.slug),
    );
    await saveSetting("soldOut", soldOut, admin.id);
    return { ok: true };
  });
}

const RESETTABLE: readonly (keyof SiteSettings)[] = [
  "robuxRates",
  "orderExpiryMinutes",
  "qris",
  "soldOut",
  "robuxStock",
  "closedMessage",
];

/** Remove the override: back to the value in src/data/*. */
export async function resetSettingAction(_prev: SettingsState, formData: FormData): Promise<SettingsState> {
  return run(async () => {
    const field = str(formData.get("field"), 40) as keyof SiteSettings;
    if (!RESETTABLE.includes(field)) return { error: "invalid" };
    await resetSetting(field);
    return { ok: true };
  });
}
