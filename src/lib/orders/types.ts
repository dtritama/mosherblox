import type { LocalizedText } from "@/i18n/config";

export type OrderStatus = "pending" | "processing" | "completed" | "failed";

export interface Order {
  /** Random, hard-to-guess ID (e.g. MB-7F3K9Q2A). */
  id: string;
  status: OrderStatus;
  /** ISO 8601 timestamp. */
  createdAt: string;
  product: string;
  item: LocalizedText;
  /** Roblox username or email (for vouchers). */
  account: string;
  /** Normalised Indonesian number: 628xxxxxxxxx. Used together with the ID to look an order up. */
  whatsapp: string;
  payment: string;
  total: number;
}

export type NewOrder = Omit<Order, "id" | "status" | "createdAt">;
