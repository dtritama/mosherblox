import "server-only";
import { formatIDR, formatNumber } from "@/i18n/format";

/**
 * Discord webhook messages for the store team's private channel.
 * What the team needs to act: the Roblox account to deliver to (with avatar), what was bought and
 * the exact amount to find in the bank history. No WhatsApp number or other contact data leaves
 * our server; the full details are one click away in the admin panel.
 */

export interface OrderSummary {
  id: string;
  kind: "robux" | "product";
  item: string;
  productName: string;
  robuxAmount: number | null;
  robuxMethod: "send-username" | "gamepass" | null;
  /** Roblox username (or email for voucher products). */
  account: string;
  robloxUserId: number | null;
  robloxDisplayName: string | null;
  /** Price + fee, before the unique code. */
  subtotal: number;
  uniqueCode: number;
  total: number;
  createdAt: string;
  hasProof: boolean;
  /** Bank / e-wallet the buyer transfers to; null = QRIS. */
  paymentName: string | null;
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

const snowflakes = (value: string | undefined) =>
  (value ?? "")
    .split(",")
    .map((id) => id.trim())
    .filter((id) => /^\d{15,21}$/.test(id))
    .slice(0, 10);

export interface Mentions {
  users: string[];
  roles: string[];
}

/**
 * Who the "Saya sudah bayar" ping tags: DISCORD_MENTION_ROLE_IDS (roles) and/or
 * DISCORD_MENTION_USER_IDS (people), both comma-separated snowflakes.
 */
export function mentionTargets(): Mentions {
  return {
    users: snowflakes(process.env.DISCORD_MENTION_USER_IDS),
    roles: snowflakes(process.env.DISCORD_MENTION_ROLE_IDS),
  };
}

/** Text from buyers/catalog shown in Discord markdown: escape anything that would format it. */
const md = (text: string) => text.replace(/[\\*_~`|>[\]()#-]/g, (c) => `\\${c}`);

const METHOD_LABEL = { "send-username": "Send Username", gamepass: "Via Gamepass" } as const;

/** The order card both pings share: Roblox avatar, account, what was bought, money, proof. */
function orderEmbed(
  order: OrderSummary,
  options: { heading: string; description: string; color: number; avatarUrl: string | null },
) {
  const isRobux = order.kind === "robux" && order.robuxAmount !== null;
  const robux = isRobux ? `${formatNumber(order.robuxAmount!, "id")} Robux` : null;
  const account = order.robloxDisplayName
    ? `**${md(order.robloxDisplayName)}** (@${md(order.account)})${order.robloxUserId ? `\nID ${order.robloxUserId}` : ""}`
    : `**${md(order.account)}**`;
  const fields = [
    { name: "Akun Roblox", value: account, inline: true },
    isRobux
      ? {
          name: "Jumlah",
          value: `**${robux}**\n${METHOD_LABEL[order.robuxMethod ?? "send-username"]}`,
          inline: true,
        }
      : { name: "Item", value: `**${md(order.item)}**\n${md(order.productName)}`, inline: true },
    {
      name: "Total bayar",
      value: `**${formatIDR(order.total)}**\n${formatIDR(order.subtotal)} + kode unik ${order.uniqueCode}`,
      inline: true,
    },
    { name: "Bayar lewat", value: order.paymentName ? md(order.paymentName) : "QRIS", inline: true },
    { name: "Bukti transfer", value: order.hasProof ? "Ada, lihat di admin" : "Tidak ada", inline: true },
    { name: "Pesanan", value: `\`${order.id}\``, inline: true },
  ];
  return {
    author: { name: options.heading },
    title: isRobux
      ? `${robux} untuk ${order.robloxDisplayName ?? order.account}`
      : `${order.item} · ${order.productName}`,
    url: adminUrl(order.id),
    description: options.description,
    color: options.color,
    ...(options.avatarUrl ? { thumbnail: { url: options.avatarUrl } } : {}),
    fields,
    footer: { text: "MOSHERBLOX · klik judul untuk membuka pesanan di admin" },
    timestamp: order.createdAt,
  };
}

/** The ping that needs action: tags the configured people (and nobody else). */
export function paymentClaimedMessage(
  order: OrderSummary,
  avatarUrl: string | null = null,
  mentions: Mentions = mentionTargets(),
) {
  return {
    username: "MOSHERBLOX",
    // Mentions appear only in `content` (embeds never notify anyone).
    content: [
      ...mentions.roles.map((id) => `<@&${id}>`),
      ...mentions.users.map((id) => `<@${id}>`),
      `Pembayaran perlu dicek: \`${order.id}\``,
    ].join(" "),
    // Only these roles/users may be pinged — never @everyone/@here, whatever ends up in the text.
    allowed_mentions: { parse: [], roles: mentions.roles, users: mentions.users },
    embeds: [
      orderEmbed(order, {
        heading: "Pembeli bilang sudah bayar",
        description: `Cek mutasi ${order.paymentName ? md(order.paymentName) : "GoPay merchant (QRIS)"}: harus ada uang masuk **tepat ${formatIDR(order.total)}**.`,
        color: PINK,
        avatarUrl,
      }),
    ],
  };
}

export function newOrderMessage(order: OrderSummary, avatarUrl: string | null = null) {
  return {
    username: "MOSHERBLOX",
    allowed_mentions: { parse: [] },
    embeds: [
      orderEmbed(order, {
        heading: "Pesanan baru",
        description: "Menunggu pembayaran dari pembeli.",
        color: LIME,
        avatarUrl,
      }),
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
