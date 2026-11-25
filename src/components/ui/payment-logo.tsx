import { getPaymentBrand } from "@/data/payment-brands";
import { cn } from "@/lib/utils";

/**
 * Logo of a bank / e-wallet on a small white plate (also in dark mode: the logos are drawn for
 * white). Without a logo: the name in the brand's colour. Decorative: the name is always next to it.
 */
export function PaymentLogo({
  name,
  brand,
  logo,
  className,
}: {
  name: string;
  brand?: string;
  logo: string | null;
  className?: string;
}) {
  const color = brand ? getPaymentBrand(brand)?.color : undefined;
  return (
    <span
      aria-hidden="true"
      className={cn(
        "flex h-9 w-16 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-coal/10 bg-snow p-1",
        className,
      )}
    >
      {logo ? (
        // Local SVG or our own upload: nothing for next/image to optimise.
        // eslint-disable-next-line @next/next/no-img-element
        <img src={logo} alt="" className="size-full min-h-0 min-w-0 object-contain" />
      ) : (
        <span
          className="max-w-full truncate text-[9px] leading-none font-extrabold tracking-tight text-coal"
          style={color ? { color } : undefined}
        >
          {name}
        </span>
      )}
    </span>
  );
}
