// Writes the sample orders (one per status) into the LOCAL development database, so the
// Check Order page can be tried right away. Safe to run again: it resets those four orders.
//   npm run db:seed
// Keep the IDs in sync with src/lib/orders/demo-orders.ts.
import nextEnv from "@next/env";
import postgres from "postgres";

nextEnv.loadEnvConfig(process.cwd());

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL is not set — copy .env.example to .env.local.");
  process.exit(1);
}
const host = new URL(url).hostname;
if (!["localhost", "127.0.0.1", "::1", "db"].includes(host)) {
  console.error(`Refusing to seed sample orders into a non-local database (${host}).`);
  process.exit(1);
}

const WHATSAPP = "6281234567890"; // 081234567890
// The pending sample gets a normal 30-minute payment window from now (run db:seed again later).
const payWindowEnd = new Date(Date.now() + 30 * 60_000);

const orders = [
  {
    id: "MB-PEND2026",
    status: "pending",
    kind: "robux",
    robux_method: "gamepass",
    robux_amount: 1000,
    product_name: "Robux",
    item_label: { id: "1.000 Robux · Via Gamepass", en: "1,000 Robux · Via Gamepass" },
    payment_method: "qris",
    subtotal: 115000,
    unique_code: 47,
    created_at: new Date().toISOString(),
  },
  {
    id: "MB-PROC2026",
    status: "processing",
    kind: "robux",
    robux_method: "send-username",
    robux_amount: 500,
    product_name: "Robux",
    item_label: { id: "500 Robux · Via Send Username", en: "500 Robux · Via Send Username" },
    payment_method: "qris",
    subtotal: 62500,
    unique_code: 112,
    created_at: "2026-11-03T14:05:00+07:00",
  },
  {
    id: "MB-DONE2026",
    status: "completed",
    kind: "product",
    product_slug: "blox-fruits",
    option_id: "blox-fruits-4",
    product_name: "Blox Fruits",
    item_label: { id: "Leopard Fruit", en: "Leopard Fruit" },
    payment_method: "qris",
    subtotal: 89000,
    unique_code: 238,
    created_at: "2026-11-01T10:15:00+07:00",
  },
  {
    id: "MB-FAIL2026",
    status: "failed",
    kind: "product",
    product_slug: "roblox-premium",
    option_id: "roblox-premium-1",
    product_name: "Roblox Premium",
    item_label: { id: "Premium 450 · 1 Bulan", en: "Premium 450 · 1 Month" },
    payment_method: "qris",
    subtotal: 62900,
    unique_code: 305,
    created_at: "2026-10-30T21:40:00+07:00",
  },
];

const sql = postgres(url, { max: 1, onnotice: () => {} });
try {
  await sql.begin(async (tx) => {
    const ids = orders.map((order) => order.id);
    await tx`DELETE FROM orders WHERE id IN ${tx(ids)}`; // events + payments cascade
    for (const order of orders) {
      const row = {
        product_slug: null,
        option_id: null,
        robux_method: null,
        robux_amount: null,
        ...order,
        account: "Builderman_01",
        whatsapp: WHATSAPP,
        fee: 0,
        total: order.subtotal + order.unique_code,
        expires_at: order.status === "pending" ? payWindowEnd : new Date(order.created_at),
        item_label: tx.json(order.item_label),
      };
      await tx`INSERT INTO orders ${tx(row)}`;
      const paymentStatus = { pending: "pending", processing: "confirmed", completed: "confirmed", failed: "rejected" };
      await tx`INSERT INTO payments ${tx({
        order_id: order.id,
        provider: "manual-qris",
        status: paymentStatus[order.status],
        amount: row.total,
        unique_code: order.unique_code,
      })}`;
      await tx`INSERT INTO order_events ${tx({ order_id: order.id, to_status: order.status, actor: "system", note: "Sample order (db:seed)" })}`;
    }
  });
  console.log(`Seeded ${orders.length} sample orders (WhatsApp 081234567890).`);
} finally {
  await sql.end();
}
