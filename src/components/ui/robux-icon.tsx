import { useId, type ComponentProps } from "react";

/**
 * The official Robux symbol — every Robux mention on the site uses this one component.
 * Shape: "Robux 2019 Logo gold.svg" from Wikimedia Commons (public domain as simple geometry;
 * Robux is a Roblox Corporation trademark, used here only to label Robux amounts).
 * https://commons.wikimedia.org/wiki/File:Robux_2019_Logo_gold.svg
 *
 * - tone "gold" (default): Roblox's own gold gradient.
 * - tone "ink": one solid colour (currentColor), for icons inside lime buttons and panels,
 *   where the gold would lose contrast.
 */
export function RobuxIcon({ tone = "gold", ...props }: ComponentProps<"svg"> & { tone?: "gold" | "ink" }) {
  // Unique per instance: the same page renders many icons (and hidden <Activity> pages stay mounted).
  const gradientId = `robux-gold-${useId().replace(/[^a-zA-Z0-9_-]/g, "")}`;
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 26.1" {...props}>
      {tone === "gold" ? (
        <defs>
          {/* Same gradient as the original file, with its transform worked out (top → bottom). */}
          <linearGradient id={gradientId} x1="12" y1="1.155" x2="12" y2="26.47" gradientUnits="userSpaceOnUse">
            <stop offset="0" stopColor="#eedfa2" />
            <stop offset="0.59" stopColor="#a9935a" />
            <stop offset="1" stopColor="#fee3a5" />
          </linearGradient>
        </defs>
      ) : null}
      <path
        fill={tone === "gold" ? `url(#${gradientId})` : "currentColor"}
        d="M21.4,4.62A5.2,5.2,0,0,1,24,9.12V17a5.19,5.19,0,0,1-2.6,4.5l-6.8,3.93a5.19,5.19,0,0,1-5.2,0L2.6,21.48A5.19,5.19,0,0,1,0,17V9.12a5.2,5.2,0,0,1,2.6-4.5L9.4.7a5.19,5.19,0,0,1,5.2,0ZM10.31,2.48,3.69,6.31A3.35,3.35,0,0,0,2,9.23v7.65A3.36,3.36,0,0,0,3.69,19.8l6.62,3.83a3.4,3.4,0,0,0,3.38,0l6.62-3.83A3.36,3.36,0,0,0,22,16.88V9.23a3.35,3.35,0,0,0-1.69-2.92L13.69,2.48a3.4,3.4,0,0,0-3.38,0Zm3.08,2.14,5.22,3A2.78,2.78,0,0,1,20,10v6a2.76,2.76,0,0,1-1.39,2.4l-5.22,3a2.76,2.76,0,0,1-2.78,0l-5.22-3A2.76,2.76,0,0,1,4,16.07V10A2.78,2.78,0,0,1,5.39,7.63l5.22-3a2.76,2.76,0,0,1,2.78,0ZM9,16.05h6v-6H9Z"
      />
    </svg>
  );
}
