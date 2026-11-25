import "server-only";
import { PgBoss } from "pg-boss";

/**
 * Background jobs (pg-boss, stored in the same Postgres in its own `pgboss` schema).
 * The web app only *sends* jobs; the worker process (`npm run worker`, src/worker) runs them and
 * owns the schedules. Sending never throws: a lost notification must not break an order.
 */

export const QUEUES = {
  /** Every minute: expire unpaid orders past their payment window. */
  expireOrders: "orders.expire",
  /** A Discord message to the store team, or a vouch in the buyers' channel. Data: NotifyJob. */
  notify: "notify.discord",
} as const;

export type NotifyJob = { kind: "paymentClaimed" | "newOrder" | "orderCompleted"; orderId: string };

export const QUEUE_OPTIONS = {
  [QUEUES.expireOrders]: { retryLimit: 0, expireInSeconds: 120 },
  // Discord can be down or rate-limit us: retry with backoff for about an hour.
  [QUEUES.notify]: { retryLimit: 8, retryDelay: 15, retryBackoff: true, expireInSeconds: 60 },
} as const;

type Boss = InstanceType<typeof PgBoss>;
const globalForBoss = globalThis as unknown as { mosherbloxBoss?: Promise<Boss> };

/** Send-only client for the web app: no schedules or maintenance (the worker does those). */
function getSender(): Promise<Boss> {
  globalForBoss.mosherbloxBoss ??= (async () => {
    const url = process.env.DATABASE_URL;
    if (!url) throw new Error("DATABASE_URL is not set");
    const boss = new PgBoss({ connectionString: url, max: 2, supervise: false, schedule: false });
    boss.on("error", (error) => console.error("[jobs] pg-boss error", error));
    await boss.start();
    for (const [name, options] of Object.entries(QUEUE_OPTIONS)) await boss.createQueue(name, options);
    return boss;
  })().catch((error) => {
    globalForBoss.mosherbloxBoss = undefined; // try again next time
    throw error;
  });
  return globalForBoss.mosherbloxBoss;
}

export async function enqueue(name: (typeof QUEUES)[keyof typeof QUEUES], data: object) {
  try {
    const boss = await getSender();
    await boss.send(name, data);
  } catch (error) {
    console.error(`[jobs] could not queue ${name}`, error);
  }
}

/** Ping the store team about an order (no-op if Discord isn't configured; see the worker). */
export function notifyTeam(job: NotifyJob) {
  return enqueue(QUEUES.notify, job);
}
