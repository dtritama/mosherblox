import "server-only";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

/**
 * The one database client for the app (server code only — importing it from a Client Component
 * is a build error). Lazy, so pages that never touch the database (and the build) don't need
 * DATABASE_URL. In dev the connection is kept on globalThis so hot reloads don't open new pools.
 */
type Db = ReturnType<typeof createDb>;

const globalForDb = globalThis as unknown as { mosherbloxDb?: Db };

function createDb() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set — copy .env.example to .env.local.");
  const client = postgres(url, { max: process.env.NODE_ENV === "production" ? 10 : 3 });
  return drizzle(client, { schema, casing: "snake_case" });
}

export function getDb(): Db {
  globalForDb.mosherbloxDb ??= createDb();
  return globalForDb.mosherbloxDb;
}

export { schema };
