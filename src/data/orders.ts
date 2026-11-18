/**
 * Order rules the store owner may want to change. PLACEHOLDERS until the client confirms
 * (open question: expiry 30 or 60 minutes). Later these move to the admin settings page.
 */
export const orderConfig = {
  /** Unpaid orders expire after this many minutes (the countdown on the payment screen). */
  expiryMinutes: 30,
  /**
   * Extra minutes after the countdown in which "Saya sudah bayar" is still accepted, for a buyer
   * who paid right at the end. The order only expires after this.
   */
  paymentGraceMinutes: 10,
  /**
   * Each order gets a random unique code from 1 to this value added to its total
   * (Rp 120.000 → Rp 120.047) so a manual QRIS transfer can be matched to the right order.
   */
  uniqueCodeMax: 499,
  /** Optional transfer screenshot: max size and allowed types. */
  proofMaxBytes: 4 * 1024 * 1024,
  proofTypes: ["image/jpeg", "image/png", "image/webp"],
} as const;
