import { siteConfig } from "@/config/site";
import type { Dictionary } from "@/i18n/dictionaries/id";

export type ContactChannelId = "discord" | "whatsapp" | "whatsappGroup";

export interface ContactChannel {
  id: ContactChannelId;
  title: string;
  description: string;
  /** Short text shown under the title (handle / number). */
  detail?: string;
  href: string;
}

/** Single source for every contact link (FAQ cards + footer). */
export function getContactChannels(dict: Dictionary): ContactChannel[] {
  const { discord, whatsapp, whatsappGroup } = siteConfig.contact;
  const t = dict.contact;
  return [
    {
      id: "whatsapp",
      title: t.whatsapp.title,
      description: t.whatsapp.description,
      detail: whatsapp.display,
      // Opens a chat with a pre-filled greeting in the visitor's language.
      href: `https://wa.me/${whatsapp.number}?text=${encodeURIComponent(t.whatsappMessage)}`,
    },
    {
      id: "discord",
      title: t.discord.title,
      description: t.discord.description,
      detail: discord.display,
      href: discord.url,
    },
    {
      id: "whatsappGroup",
      title: t.whatsappGroup.title,
      description: t.whatsappGroup.description,
      href: whatsappGroup.url,
    },
  ];
}
