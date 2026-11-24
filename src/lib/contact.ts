import type { Dictionary } from "@/i18n/dictionaries/id";
import type { ContactContent } from "@/lib/site-content";

export type ContactChannelId = "discord" | "whatsapp" | "whatsappGroup";

export interface ContactChannel {
  id: ContactChannelId;
  title: string;
  description: string;
  /** Short text shown under the title (handle / number). */
  detail?: string;
  href: string;
}

/** 6281211980741 → 0812-1198-0741 */
export function formatLocalWhatsapp(number: string) {
  const local = `0${number.replace(/^62/, "")}`;
  return [local.slice(0, 4), local.slice(4, 8), local.slice(8)].filter(Boolean).join("-");
}

/** Single source for every contact link (FAQ cards + footer). Channels left empty are hidden. */
export function getContactChannels(dict: Dictionary, contact: ContactContent): ContactChannel[] {
  const { discord, whatsapp, whatsappGroup } = contact;
  const t = dict.contact;
  const channels: ContactChannel[] = [
    {
      id: "whatsapp",
      title: t.whatsapp.title,
      description: t.whatsapp.description,
      detail: formatLocalWhatsapp(whatsapp),
      // Opens a chat with a pre-filled greeting in the visitor's language.
      href: `https://wa.me/${whatsapp}?text=${encodeURIComponent(t.whatsappMessage)}`,
    },
    {
      id: "discord",
      title: t.discord.title,
      description: t.discord.description,
      detail: discord.replace(/^https:\/\/(www\.)?/, ""),
      href: discord,
    },
    {
      id: "whatsappGroup",
      title: t.whatsappGroup.title,
      description: t.whatsappGroup.description,
      href: whatsappGroup,
    },
  ];
  return channels.filter((channel) => channel.href);
}
