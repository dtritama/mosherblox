import "server-only";
import { mkdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { orderConfig } from "@/data/orders";

/**
 * Transfer screenshots ("bukti transfer"). Stored on disk OUTSIDE public/, so they are never
 * served directly; the admin panel (step 5) shows them through a logged-in route.
 * Folder: UPLOAD_DIR (default ./storage/uploads) — a Docker volume in production.
 */

const uploadRoot = () => path.resolve(process.env.UPLOAD_DIR || "storage/uploads");

/** Real file type from the first bytes — the browser's MIME type and file name are not trusted. */
function sniffImage(bytes: Uint8Array): { ext: string; type: string } | null {
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
  // Random file name: never derived from anything the buyer sent.
  const relative = path.posix.join("proofs", month, `${orderId}-${crypto.randomUUID()}.${kind.ext}`);
  const absolute = path.join(uploadRoot(), relative);
  await mkdir(path.dirname(absolute), { recursive: true });
  await writeFile(absolute, bytes, { flag: "wx" });
  return { ok: true, path: relative };
}

/** Removes a saved proof again (when the database update that should reference it failed). */
export async function deleteProof(relative: string) {
  await rm(path.join(uploadRoot(), relative), { force: true });
}
