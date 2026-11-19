/**
 * Reads a QRIS payload (EMVCo merchant-presented QR) so the admin can check an uploaded QRIS
 * before it goes live: checksum, static vs dynamic, merchant name, NMID.
 */

export interface QrisInfo {
  /** CRC-16/CCITT checksum (tag 63) matches: the code is complete and undamaged. */
  checksumOk: boolean;
  /** "11" = static (buyer types the amount) — what manual QRIS needs. "12" = dynamic. */
  isStatic: boolean;
  merchantName: string;
  merchantCity: string;
  /** National Merchant ID (tag 51, sub-tag 02), e.g. ID1026552374492. */
  nmid: string;
}

function readTlv(payload: string): Map<string, string> {
  const fields = new Map<string, string>();
  let i = 0;
  while (i + 4 <= payload.length) {
    const id = payload.slice(i, i + 2);
    const length = Number(payload.slice(i + 2, i + 4));
    if (!Number.isInteger(length)) break;
    fields.set(id, payload.slice(i + 4, i + 4 + length));
    i += 4 + length;
  }
  return fields;
}

function crc16(text: string) {
  let crc = 0xffff;
  for (let i = 0; i < text.length; i++) {
    crc ^= text.charCodeAt(i) << 8;
    for (let bit = 0; bit < 8; bit++) crc = crc & 0x8000 ? ((crc << 1) ^ 0x1021) & 0xffff : (crc << 1) & 0xffff;
  }
  return crc.toString(16).toUpperCase().padStart(4, "0");
}

/** null when the text is not a QRIS / EMV payload at all. */
export function parseQris(payload: string): QrisInfo | null {
  if (!payload.startsWith("000201")) return null;
  const fields = readTlv(payload);
  const crc = fields.get("63") ?? "";
  return {
    checksumOk: crc.length === 4 && crc16(payload.slice(0, -4)) === crc.toUpperCase(),
    isStatic: fields.get("01") === "11",
    merchantName: (fields.get("59") ?? "").trim(),
    merchantCity: (fields.get("60") ?? "").trim(),
    nmid: readTlv(fields.get("51") ?? "").get("02") ?? "",
  };
}
