import "server-only";
import { and, asc, eq, sql } from "drizzle-orm";
import { cacheLife, cacheTag } from "next/cache";
import { getCheckoutPaymentMethod } from "@/data/payments";
import { getPaymentBrand } from "@/data/payment-brands";
import type { AdminPaymentMethod, PaymentOption, PayTo } from "@/lib/payment-methods";
import { getDb, schema } from "@/server/db";
import type { PaymentMethodRow } from "@/server/db/schema";

/** Bank / e-wallet accounts buyers can transfer to (/admin/payments), next to the QRIS. */

const { paymentMethods, admins } = schema;
export const PAYMENT_METHODS_TAG = "payment-methods";
const UUID = /^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$/;
export const isPaymentMethodId = (id: string) => UUID.test(id);

/** Own upload first, then the brand's logo. */
const toPayTo = (row: PaymentMethodRow): PayTo => ({
  brand: row.brand,
  kind: row.kind,
  name: row.name,
  number: row.accountNumber,
  holder: row.accountHolder,
  logo: row.logoFile ? `/payments/logo/${row.logoFile}` : (getPaymentBrand(row.brand)?.logo ?? null),
});

const order = [asc(paymentMethods.position), asc(paymentMethods.createdAt)];

/** Active methods for the checkout (no account numbers). Cached; a database problem → QRIS only. */
export async function getPaymentOptions(): Promise<PaymentOption[]> {
  "use cache";
  cacheTag(PAYMENT_METHODS_TAG);
  cacheLife("minutes");
  try {
    const rows = await getDb()
      .select()
      .from(paymentMethods)
      .where(eq(paymentMethods.active, true))
      .orderBy(...order);
    return rows.map((row) => {
      const { brand, kind, name, logo } = toPayTo(row);
      return { id: row.id, brand, kind, name, logo };
    });
  } catch (error) {
    console.warn("[payments] QRIS only:", error instanceof Error ? error.message : error);
    return [];
  }
}

export interface CheckoutPayment {
  /** Stored on the order ("qris" or the brand id). */
  method: string;
  fee: number;
  /** null = the store's QRIS. */
  payTo: PayTo | null;
}

/** What a checkout choice means right now, read fresh. null = not offered (any more). */
export async function resolveCheckoutPayment(id: string): Promise<CheckoutPayment | null> {
  const builtIn = getCheckoutPaymentMethod(id);
  if (builtIn) return { method: builtIn.id, fee: builtIn.fee, payTo: null };
  if (!isPaymentMethodId(id)) return null;
  const [row] = await getDb()
    .select()
    .from(paymentMethods)
    .where(and(eq(paymentMethods.id, id), eq(paymentMethods.active, true)))
    .limit(1);
  return row ? { method: row.brand, fee: 0, payTo: toPayTo(row) } : null;
}

export async function listPaymentMethods(): Promise<AdminPaymentMethod[]> {
  const rows = await getDb()
    .select({ method: paymentMethods, by: admins.name })
    .from(paymentMethods)
    .leftJoin(admins, eq(admins.id, paymentMethods.updatedBy))
    .orderBy(...order);
  return rows.map(({ method, by }) => ({
    id: method.id,
    ...toPayTo(method),
    active: method.active,
    updatedAt: method.updatedAt.toISOString(),
    updatedBy: by,
  }));
}

/** One change to the list at a time (limit, order), whoever saves. */
export async function lockPaymentMethods(tx: Parameters<Parameters<ReturnType<typeof getDb>["transaction"]>[0]>[0]) {
  await tx.execute(sql`SELECT pg_advisory_xact_lock(hashtext('payment_methods'))`);
}
