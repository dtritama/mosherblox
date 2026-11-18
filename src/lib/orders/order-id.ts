/** No 0/O/1/I so IDs are easy to read out and type. */
const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

/** Random, non-sequential order ID (MB-XXXXXXXX), so other buyers' orders can't be guessed. */
export function createOrderId() {
  const bytes = new Uint8Array(8);
  crypto.getRandomValues(bytes);
  return `MB-${Array.from(bytes, (byte) => ALPHABET[byte % ALPHABET.length]).join("")}`;
}

export function normalizeOrderId(value: string) {
  return value
    .toUpperCase()
    .replace(/[^A-Z0-9-]/g, "")
    .slice(0, 16);
}
