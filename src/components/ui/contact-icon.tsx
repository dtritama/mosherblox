import { MessageCircle, Users, type LucideProps } from "lucide-react";
import { siDiscord } from "simple-icons";

import type { ContactChannelId } from "@/lib/contact";
import { cn } from "@/lib/utils";

/** Official Discord mark from Simple Icons (CC0). Only this one icon is bundled (tree-shaken). */
function DiscordIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" className={cn("shrink-0", className)}>
      <path d={siDiscord.path} />
    </svg>
  );
}

export function ContactIcon({ id, className, ...props }: { id: ContactChannelId } & LucideProps) {
  switch (id) {
    case "discord":
      return <DiscordIcon className={className} />;
    case "whatsappGroup":
      return <Users aria-hidden="true" className={className} {...props} />;
    case "whatsapp":
    default:
      return <MessageCircle aria-hidden="true" className={className} {...props} />;
  }
}
