"use server";

import { asc, eq, sql } from "drizzle-orm";
import { updateTag } from "next/cache";
import { PAYMENT_LIMITS, parsePaymentMethod, type PaymentMethodError } from "@/lib/payment-methods";
import { requireAdmin } from "@/server/auth/admin";
import { getDb, schema } from "@/server/db";
import { isPaymentMethodId, lockPaymentMethods, PAYMENT_METHODS_TAG } from "@/server/payment-methods";
import { savePaymentLogo } from "@/server/payments/proof-storage";

/** /admin/payments actions. Owner only: these decide where buyers send their money. */

const { paymentMethods } = schema;

export interface PaymentMethodState {
  ok?: boolean;
  error?: "forbidden" | "invalid" | "badImage" | "duplicate" | "full" | "notFound" | "unavailable";
  fields?: Partial<Record<PaymentMethodError, true>>;
}

const str = (value: FormDataEntryValue | null, max = 100) => (typeof value === "string" ? value.slice(0, max) : "");

async function run(save: (adminId: string) => Promise<PaymentMethodState>): Promise<PaymentMethodState> {
  const admin = await requireAdmin();
  if (admin.role !== "owner") return { error: "forbidden" };
  try {
    const result = await save(admin.id);
    if (result.ok) updateTag(PAYMENT_METHODS_TAG);
    return result;
  } catch (error) {
    const cause = error instanceof Error && "cause" in error ? error.cause : error;
    if (typeof cause === "object" && cause !== null && "code" in cause && cause.code === "23505") {
      return { error: "duplicate" };
    }
    console.error("[admin] payment method change failed", error);
    return { error: "unavailable" };
  }
}

/** Add (no id) or edit. `logo`: optional new image; `removeLogo=1`: back to the brand's own logo. */
export async function savePaymentMethodAction(formData: FormData): Promise<PaymentMethodState> {
  return run(async (adminId) => {
    if (!(formData instanceof FormData)) return { error: "invalid" };
    const id = str(formData.get("id"));
    if (id && !isPaymentMethodId(id)) return { error: "notFound" };
    const parsed = parsePaymentMethod({
      brand: str(formData.get("brand")),
      kind: str(formData.get("kind")),
      name: str(formData.get("name")),
      number: str(formData.get("number")),
      holder: str(formData.get("holder")),
    });
    if (!parsed.ok) return { error: "invalid", fields: parsed.errors };

    let logo: { logoFile?: string | null } = formData.get("removeLogo") === "1" ? { logoFile: null } : {};
    const file = formData.get("logo");
    if (file instanceof File && file.size > 0) {
      const saved = await savePaymentLogo(file);
      if (!saved.ok) return { error: "badImage" };
      logo = { logoFile: saved.file };
    }
    const { number, holder, ...brand } = parsed.value;
    const values = {
      ...brand,
      accountNumber: number,
      accountHolder: holder,
      active: formData.get("active") === "1",
      updatedBy: adminId,
      ...logo,
    };
    return getDb().transaction(async (tx): Promise<PaymentMethodState> => {
      await lockPaymentMethods(tx);
      if (id) {
        const updated = await tx
          .update(paymentMethods)
          .set(values)
          .where(eq(paymentMethods.id, id))
          .returning({ id: paymentMethods.id });
        return updated.length > 0 ? { ok: true } : { error: "notFound" };
      }
      const existing = await tx.select({ position: paymentMethods.position }).from(paymentMethods);
      if (existing.length >= PAYMENT_LIMITS.max) return { error: "full" };
      await tx
        .insert(paymentMethods)
        .values({ ...values, position: Math.max(0, ...existing.map((row) => row.position)) + 1 });
      return { ok: true };
    });
  });
}

export async function setPaymentMethodActiveAction(id: string, active: boolean): Promise<PaymentMethodState> {
  return run(async (adminId) => {
    if (!isPaymentMethodId(String(id)) || typeof active !== "boolean") return { error: "invalid" };
    const updated = await getDb()
      .update(paymentMethods)
      .set({ active, updatedBy: adminId })
      .where(eq(paymentMethods.id, id))
      .returning({ id: paymentMethods.id });
    return updated.length > 0 ? { ok: true } : { error: "notFound" };
  });
}

/** Orders keep their own copy of the account, so deleting never touches them. */
export async function deletePaymentMethodAction(id: string): Promise<PaymentMethodState> {
  return run(async () => {
    if (!isPaymentMethodId(String(id))) return { error: "invalid" };
    await getDb().delete(paymentMethods).where(eq(paymentMethods.id, id));
    return { ok: true };
  });
}

export async function movePaymentMethodAction(id: string, direction: "up" | "down"): Promise<PaymentMethodState> {
  return run(async () => {
    if (!isPaymentMethodId(String(id)) || (direction !== "up" && direction !== "down")) return { error: "invalid" };
    return getDb().transaction(async (tx): Promise<PaymentMethodState> => {
      await lockPaymentMethods(tx);
      const rows = await tx
        .select({ id: paymentMethods.id })
        .from(paymentMethods)
        .orderBy(asc(paymentMethods.position), asc(paymentMethods.createdAt));
      const ids = rows.map((row) => row.id);
      const from = ids.indexOf(id);
      if (from < 0) return { error: "notFound" };
      const to = direction === "up" ? from - 1 : from + 1;
      if (to < 0 || to >= ids.length) return { ok: true };
      [ids[from], ids[to]] = [ids[to], ids[from]];
      for (const [index, rowId] of ids.entries()) {
        await tx
          .update(paymentMethods)
          // Not an edit: "terakhir diubah" stays as it was.
          .set({ position: index + 1, updatedAt: sql`${paymentMethods.updatedAt}` })
          .where(eq(paymentMethods.id, rowId));
      }
      return { ok: true };
    });
  });
}
