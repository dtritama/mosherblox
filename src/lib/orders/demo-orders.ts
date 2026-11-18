import type { Order } from "@/lib/orders/types";

/** WhatsApp number shared by the sample orders below (shown as a hint on the Check Order page). */
export const DEMO_WHATSAPP = "081234567890";

/** One sample order per status so the Check Order page can be tried before the backend exists. */
export const demoOrders: readonly Order[] = [
  {
    id: "MB-PEND2026",
    status: "pending",
    createdAt: "2026-11-03T19:20:00+07:00",
    product: "Robux · Gamepass",
    item: { id: "1.000 Robux", en: "1,000 Robux" },
    account: "Builderman_01",
    whatsapp: "6281234567890",
    payment: "QRIS",
    total: 115000,
  },
  {
    id: "MB-PROC2026",
    status: "processing",
    createdAt: "2026-11-03T14:05:00+07:00",
    product: "Robux · Send Username",
    item: { id: "500 Robux", en: "500 Robux" },
    account: "Builderman_01",
    whatsapp: "6281234567890",
    payment: "GoPay",
    total: 62500,
  },
  {
    id: "MB-DONE2026",
    status: "completed",
    createdAt: "2026-11-01T10:15:00+07:00",
    product: "Blox Fruits",
    item: { id: "Leopard Fruit", en: "Leopard Fruit" },
    account: "Builderman_01",
    whatsapp: "6281234567890",
    payment: "DANA",
    total: 89000,
  },
  {
    id: "MB-FAIL2026",
    status: "failed",
    createdAt: "2026-10-30T21:40:00+07:00",
    product: "Roblox Premium",
    item: { id: "Premium 450 · 1 Bulan", en: "Premium 450 · 1 Month" },
    account: "builder@example.com",
    whatsapp: "6281234567890",
    payment: "BCA Virtual Account",
    total: 65400,
  },
];
