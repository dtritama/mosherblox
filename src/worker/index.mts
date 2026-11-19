/**
 * MOSHERBLOX background worker — a separate Node process next to the web app.
 *   dev:   npm run worker            (reads .env.local like Next.js does)
 *   prod:  npm run worker:build  →  node --conditions=react-server dist/worker.mjs
 *
 * Jobs (pg-boss, stored in Postgres):
 * - orders.expire   every minute: expire unpaid orders past their payment window
 * - notify.discord  team pings (buyer pressed "Saya sudah bayar", optional new orders)
 *
 * It reuses the app's server code, which is marked `server-only`; running Node with the
 * `react-server` condition makes that marker a no-op outside Next.js.
 */
import nextEnv from "@next/env";

nextEnv.loadEnvConfig(process.cwd(), process.env.NODE_ENV !== "production");

const { PgBoss } = await import("pg-boss");
const { QUEUES, QUEUE_OPTIONS } = await import("@/server/jobs/queue");
const { expireOverdueOrders, getOrderSummary } = await import("@/server/orders/service");
const { discordWebhookUrl, newOrderMessage, paymentClaimedMessage, postToDiscord } =
  await import("@/server/notify/discord");
type NotifyJob = import("@/server/jobs/queue").NotifyJob;

const log = (...args: unknown[]) => console.log(new Date().toISOString(), "[worker]", ...args);

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL is not set — copy .env.example to .env.local.");
  process.exit(1);
}

const boss = new PgBoss({ connectionString: url, max: 4 });
boss.on("error", (error) => console.error(new Date().toISOString(), "[worker] pg-boss error", error));
await boss.start();
for (const [name, options] of Object.entries(QUEUE_OPTIONS)) await boss.createQueue(name, options);

// --- orders.expire ---------------------------------------------------------------------------
await boss.schedule(QUEUES.expireOrders, "* * * * *", null, { tz: "Asia/Jakarta" });
await boss.work(QUEUES.expireOrders, async () => {
  const expired = await expireOverdueOrders();
  if (expired > 0) log(`expired ${expired} unpaid order(s)`);
});

// --- notify.discord --------------------------------------------------------------------------
const webhook = discordWebhookUrl();
if (!webhook) log("DISCORD_WEBHOOK_URL not set: team notifications are skipped");

await boss.work<NotifyJob>(QUEUES.notify, async ([job]) => {
  if (!webhook) return;
  const order = await getOrderSummary(job.data.orderId);
  if (!order) return; // deleted meanwhile: nothing to say
  // The order may have moved on since the job was queued (e.g. an admin already handled it).
  if (job.data.kind === "paymentClaimed" && !(order.status === "pending" && order.paymentStatus === "submitted"))
    return;
  const message = job.data.kind === "paymentClaimed" ? paymentClaimedMessage(order) : newOrderMessage(order);
  await postToDiscord(webhook, message); // throws → pg-boss retries with backoff
  log(`notified Discord: ${job.data.kind} ${order.id}`);
});

log("running — jobs: " + Object.values(QUEUES).join(", "));

async function shutdown(signal: string) {
  log(`${signal}: finishing current jobs…`);
  await boss.stop({ graceful: true, timeout: 20_000 });
  process.exit(0);
}
process.on("SIGINT", () => void shutdown("SIGINT"));
process.on("SIGTERM", () => void shutdown("SIGTERM"));
