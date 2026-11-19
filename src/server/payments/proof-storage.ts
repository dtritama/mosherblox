import "server-only";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { orderConfig } from "@/data/orders";

/**
 * Uploaded images, stored on disk OUTSIDE public/ in UPLOAD_DIR (default ./storage/uploads,
 * a Docker volume in production):
 * - proofs/  transfer screenshots ("bukti transfer"), shown to admins only via a logged-in route
 * - qris/    the store's QRIS uploaded in /admin/settings, served publicly via /payments/qris/[file]
 */

// The upload folder is only known at runtime: tell Turbopack not to trace it into the build.
const uploadRoot = () => path.resolve(/*turbopackIgnore: true*/ process.env.UPLOAD_DIR || "storage/uploads");

/** Real file type from the first bytes — the browser's MIME type and file name are not trusted. */
export function sniffImage(bytes: Uint8Array): { ext: string; type: string } | null {
  const startsWith = (...sig: number[]) => sig.every((byte, i) => bytes[i] === byte);
  if (startsWith(0xff, 0xd8, 0xff)) return { ext: "jpg", type: "image/jpeg" };
  if (startsWith(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a)) return { ext: "png", type: "image/png" };
  const riff = startsWith(0x52, 0x49, 0x46, 0x46);
  const webp = bytes[8] === 0x57 && bytes[9] === 0x45 && bytes[10] === 0x42 && bytes[11] === 0x50;
  if (riff && webp) return { ext: "webp", type: "image/webp" };
  return null;
}

export type ProofError = "tooBig" | "notImage";

/** Validates and saves a proof image. Returns the path relative to UPLOAD_DIR. */
export async function saveProof(
  file: File,
  orderId: string,
): Promise<{ ok: true; path: string } | { ok: false; error: ProofError }> {
  if (file.size === 0 || file.size > orderConfig.proofMaxBytes) return { ok: false, error: "tooBig" };
  const bytes = new Uint8Array(await file.arrayBuffer());
  const kind = sniffImage(bytes);
  if (!kind || !(orderConfig.proofTypes as readonly string[]).includes(kind.type)) {
    return { ok: false, error: "notImage" };
  }
  const month = new Date().toISOString().slice(0, 7); // 2026-11
  // Order ID (already reduced to A–Z, 0–9 and "-") + a random UUID: the buyer's file name is never used.
  const relative = path.posix.join("proofs", month, `${orderId}-${crypto.randomUUID()}.${kind.ext}`);
  const absolute = path.join(/*turbopackIgnore: true*/ uploadRoot(), relative);
  await mkdir(path.dirname(absolute), { recursive: true });
  await writeFile(absolute, bytes, { flag: "wx" });
  return { ok: true, path: relative };
}

/** Removes a saved proof again (when the database update that should reference it failed). */
export async function deleteProof(relative: string) {
  await rm(path.join(/*turbopackIgnore: true*/ uploadRoot(), relative), { force: true });
}

const contentTypes: Record<string, string> = { jpg: "image/jpeg", png: "image/png", webp: "image/webp" };

/**
 * Reads a stored proof for the admin proof route. The path comes from our own database, but it is
 * still resolved and checked to stay inside UPLOAD_DIR.
 */
export async function readProof(relative: string): Promise<{ bytes: Uint8Array<ArrayBuffer>; type: string } | null> {
  const root = uploadRoot();
  const absolute = path.resolve(/*turbopackIgnore: true*/ root, relative);
  const type = contentTypes[path.extname(absolute).slice(1).toLowerCase()];
  if (!type || !absolute.startsWith(root + path.sep)) return null;
  try {
    return { bytes: Uint8Array.from(await readFile(absolute)), type };
  } catch {
    return null;
  }
}

/** QRIS file names we create: a UUID + image extension. Anything else is refused by the public route. */
export const QRIS_FILE = /^[0-9a-f-]{36}\.(jpg|png|webp)$/;

/** Saves a new QRIS image (admin settings). Returns the file name inside qris/. */
export async function saveQrisImage(
  file: File,
): Promise<{ ok: true; file: string } | { ok: false; error: ProofError }> {
  if (file.size === 0 || file.size > orderConfig.proofMaxBytes) return { ok: false, error: "tooBig" };
  const bytes = new Uint8Array(await file.arrayBuffer());
  const kind = sniffImage(bytes);
  if (!kind) return { ok: false, error: "notImage" };
  const name = `${crypto.randomUUID()}.${kind.ext}`;
  const absolute = path.join(/*turbopackIgnore: true*/ uploadRoot(), "qris", name);
  await mkdir(path.dirname(absolute), { recursive: true });
  await writeFile(absolute, bytes, { flag: "wx" });
  return { ok: true, file: name };
}

export async function readQrisImage(file: string) {
  return QRIS_FILE.test(file) ? readProof(`qris/${file}`) : null;
}
