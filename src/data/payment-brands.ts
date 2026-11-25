/**
 * Indonesian banks and e-wallets the owner can add in /admin/payments. Logos are local SVGs
 * (Wikimedia Commons, public domain / CC0 shapes, trademarks of their owners). Without a logo, the
 * name is shown as a badge in `color`; the owner can upload one per payment method.
 */
export type PaymentKind = "ewallet" | "bank";

export interface PaymentBrand {
  id: string;
  name: string;
  kind: PaymentKind;
  logo: string | null;
  /** Badge colour when there is no logo. Must be readable with white text. */
  color: string;
}

const logo = (id: string) => `/payments/logos/${id}.svg`;

export const QRIS_LOGO = logo("qris");

export const paymentBrands: readonly PaymentBrand[] = [
  { id: "gopay", name: "GoPay", kind: "ewallet", logo: logo("gopay"), color: "#00708c" },
  { id: "dana", name: "DANA", kind: "ewallet", logo: null, color: "#0b6fc4" },
  { id: "ovo", name: "OVO", kind: "ewallet", logo: logo("ovo"), color: "#4c2a86" },
  { id: "shopeepay", name: "ShopeePay", kind: "ewallet", logo: null, color: "#c9371c" },
  { id: "linkaja", name: "LinkAja", kind: "ewallet", logo: logo("linkaja"), color: "#c8161d" },
  { id: "seabank", name: "SeaBank", kind: "bank", logo: logo("seabank"), color: "#b8501a" },
  { id: "bca", name: "BCA", kind: "bank", logo: logo("bca"), color: "#005baa" },
  { id: "bri", name: "BRI", kind: "bank", logo: logo("bri"), color: "#00529c" },
  { id: "mandiri", name: "Mandiri", kind: "bank", logo: logo("mandiri"), color: "#003a70" },
  { id: "bni", name: "BNI", kind: "bank", logo: logo("bni"), color: "#006885" },
  { id: "bsi", name: "BSI", kind: "bank", logo: logo("bsi"), color: "#007a72" },
  { id: "jago", name: "Bank Jago", kind: "bank", logo: logo("jago"), color: "#8a5a00" },
  { id: "cimb", name: "CIMB Niaga", kind: "bank", logo: logo("cimb"), color: "#7b0d14" },
  { id: "permata", name: "Permata Bank", kind: "bank", logo: logo("permata"), color: "#1f4fc4" },
];

/** Any other bank / e-wallet: the owner types its name. */
export const OTHER_BRAND = "other";

export const getPaymentBrand = (id: string) => paymentBrands.find((brand) => brand.id === id);
