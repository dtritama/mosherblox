import type { OrderStatus } from "@/lib/orders/types";

/**
 * Sample orders written into the development database by `npm run db:seed`
 * (scripts/seed-dev.mjs — keep the two lists in sync). The Check Order page lists them as
 * quick-try buttons in development only; they never exist in production.
 */
export const DEMO_WHATSAPP = "081234567890";

export const demoOrders: readonly { id: string; status: OrderStatus }[] = [
  { id: "MB-PEND2026", status: "pending" },
  { id: "MB-PROC2026", status: "processing" },
  { id: "MB-DONE2026", status: "completed" },
  { id: "MB-FAIL2026", status: "failed" },
];

export const SHOW_DEMO_ORDERS = process.env.NODE_ENV !== "production";
