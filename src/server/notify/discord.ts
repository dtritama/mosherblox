import "server-only";
import { formatIDR } from "@/i18n/format";

/**
 * Discord webhook messages for the store team's private channel.
 * Only what the team needs to act — no WhatsApp numbers or other buyer data leave our server.
 * The full details are one click away in the admin panel.
 */

export interface OrderSummary {
  id: string;
  item: string;
  productName: string;
  total: number;
  hasProof: boolean;
}

const WEBHOOK = /^https:\/\/(?:canary\.|ptb\.)?(?:discord|discordapp)\.com\/api\/webhooks\/\d+\/[\w-]+$/;

export function discordWebhookUrl(): string | null {
  const url = process.env.DISCORD_WEBHOOK_URL?.trim();
  if (!url) return null;
  if (!WEBHOOK.test(url)) {
    console.error("[notify] DISCORD_WEBHOOK_URL is not a Discord webhook URL — ignoring it");
    return null;
  }
  return url;
}

const adminUrl = (orderId: string) =>
  `${(process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(/\/$/, "")}/admin/orders/${orderId}`;

const LIME = 0xa5e34a;
const PINK = 0xf04f82;

export function paymentClaimedMessage(order: OrderSummary) {
  return {
    username: "MOSHERBLOX",
    // Never ping @everyone/@here, whatever ends up in the text.
    allowed_mentions: { parse: [] },
    embeds: [
      {
        title: `Pembeli bilang sudah bayar · ${order.id}`,
        description: `Cek mutasi GoPay merchant: harus ada uang masuk **tepat ${formatIDR(order.total)}**.`,
        url: adminUrl(order.id),
        color: PINK,
        fields: [
          { name: "Item", value: `${order.item} (${order.productName})`, inline: true },
          { name: "Total", value: formatIDR(order.total), inline: true },
          { name: "Bukti transfer", value: order.hasProof ? "Ada" : "Tidak ada", inline: true },
        ],
      },
    ],
  };
}

export function newOrderMessage(order: OrderSummary) {
  return {
    username: "MOSHERBLOX",
    allowed_mentions: { parse: [] },
    embeds: [
      {
        title: `Pesanan baru · ${order.id}`,
        description: "Menunggu pembayaran.",
        url: adminUrl(order.id),
        color: LIME,
        fields: [
          { name: "Item", value: `${order.item} (${order.productName})`, inline: true },
          { name: "Total", value: formatIDR(order.total), inline: true },
        ],
      },
    ],
  };
}

/** Posts a message. Throws on failure so the job is retried (429 / 5xx / network). */
export async function postToDiscord(url: string, body: object) {
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(10_000),
  });
  if (!response.ok) {
    throw new Error(`Discord webhook answered ${response.status} ${response.statusText}`);
  }
}
