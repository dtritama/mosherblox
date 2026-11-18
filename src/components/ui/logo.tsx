import Image from "next/image";

import logoImage from "@/assets/logo-mosherblox.png";
import { siteConfig } from "@/config/site";
import { cn } from "@/lib/utils";

interface LogoProps {
  className?: string;
  /** Load immediately (use for the logo that's visible on first paint, e.g. the navbar). */
  eager?: boolean;
  /** Rendered height in CSS pixels — used to pick the right image size. */
  height?: number;
}

/**
 * The official MOSHERBLOX sticker logo (transparent PNG).
 * A static import gives Next.js the dimensions, so there is no layout shift,
 * and next/image serves a correctly sized WebP/AVIF for each screen density.
 */
export function Logo({ className, eager = false, height = 40 }: LogoProps) {
  const width = Math.round((logoImage.width / logoImage.height) * height);
  return (
    <Image
      src={logoImage}
      alt={siteConfig.name}
      width={width}
      height={height}
      sizes={`${width}px`}
      loading={eager ? "eager" : "lazy"}
      draggable={false}
      className={cn("shrink-0 select-none", className)}
      // Pin both dimensions to whole pixels (overrides Tailwind's `img { height: auto }` reset),
      // so the rendered size always matches the width/height attributes — no layout shift, no distortion.
      style={{ width, height }}
    />
  );
}
