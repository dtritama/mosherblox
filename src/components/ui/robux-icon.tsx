import { Coins, type LucideProps } from "lucide-react";

/**
 * The one place the Robux icon comes from — every Robux mention on the site uses this.
 * To use the official Robux icon, put the file in src/assets/ and render it here
 * (e.g. an inline SVG or next/image); nothing else needs to change.
 */
export function RobuxIcon(props: LucideProps) {
  return <Coins {...props} />;
}
