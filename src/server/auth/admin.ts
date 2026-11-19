import "server-only";
import { createHash, randomBytes } from "node:crypto";
import { and, eq, gt, isNull, lt } from "drizzle-orm";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { getDb, schema } from "@/server/db";
import { clientIp } from "@/server/rate-limit";
import { DUMMY_HASH, verifyPassword } from "@/server/auth/password-hash.mjs";

/**
 * Admin authentication — the Data Access Layer for the admin panel. Every admin page, server
 * action and route handler calls `requireAdmin()` (or `getAdmin()`) itself: hiding a button is
 * not a security boundary.
 */

const { admins, adminSessions } = schema;

const isProd = process.env.NODE_ENV === "production";
/** `__Host-` makes the browser refuse the cookie unless it is Secure, path=/ and host-only. */
const COOKIE = isProd ? "__Host-mb_admin" : "mb_admin";
const SESSION_HOURS = 12;

export interface AdminUser {
  id: string;
  name: string;
  email: string;
  role: "owner" | "staff";
}

const hashToken = (token: string) => createHash("sha256").update(token).digest("hex");

/** Checks email + password. Same work for unknown emails, so timing doesn't reveal accounts. */
export async function checkCredentials(email: string, password: string): Promise<AdminUser | null> {
  const [admin] = await getDb().select().from(admins).where(eq(admins.email, email.trim().toLowerCase())).limit(1);
  const ok = await verifyPassword(password, admin?.passwordHash ?? DUMMY_HASH);
  if (!admin || !ok || admin.disabledAt) return null;
  return { id: admin.id, name: admin.name, email: admin.email, role: admin.role };
}

export async function startSession(adminId: string) {
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + SESSION_HOURS * 3_600_000);
  const db = getDb();
  await db.insert(adminSessions).values({
    id: hashToken(token),
    adminId,
    expiresAt,
    ip: await clientIp(),
    userAgent: (await headers()).get("user-agent")?.slice(0, 300) ?? null,
  });
  await db.update(admins).set({ lastLoginAt: new Date() }).where(eq(admins.id, adminId));
  // Housekeeping: forget expired sessions.
  await db.delete(adminSessions).where(lt(adminSessions.expiresAt, new Date()));

  (await cookies()).set(COOKIE, token, {
    httpOnly: true,
    secure: isProd,
    sameSite: "lax",
    path: "/",
    expires: expiresAt,
  });
}

export async function endSession() {
  const jar = await cookies();
  const token = jar.get(COOKIE)?.value;
  if (token)
    await getDb()
      .delete(adminSessions)
      .where(eq(adminSessions.id, hashToken(token)));
  jar.delete(COOKIE);
}

/** The logged-in admin, or null. */
export async function getAdmin(): Promise<AdminUser | null> {
  // Session checks compare against the current time: always run at request time, never prerendered.
  await connection();
  const token = (await cookies()).get(COOKIE)?.value;
  if (!token || token.length > 100) return null;
  const [row] = await getDb()
    .select({ id: admins.id, name: admins.name, email: admins.email, role: admins.role })
    .from(adminSessions)
    .innerJoin(admins, eq(admins.id, adminSessions.adminId))
    .where(
      and(eq(adminSessions.id, hashToken(token)), gt(adminSessions.expiresAt, new Date()), isNull(admins.disabledAt)),
    )
    .limit(1);
  return row ?? null;
}

/** The logged-in admin; otherwise redirects to the login page. */
export async function requireAdmin(): Promise<AdminUser> {
  const admin = await getAdmin();
  if (!admin) redirect("/admin/login");
  return admin;
}
