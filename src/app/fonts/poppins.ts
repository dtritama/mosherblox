import localFont from "next/font/local";

// Poppins is self-hosted (SIL OFL, see ./OFL.txt): no request to Google at build or run time.
// Shared by the site's root layout and the admin panel's root layout.
export const poppins = localFont({
  src: [
    { path: "./poppins-latin-400-normal.woff2", weight: "400", style: "normal" },
    { path: "./poppins-latin-500-normal.woff2", weight: "500", style: "normal" },
    { path: "./poppins-latin-600-normal.woff2", weight: "600", style: "normal" },
    { path: "./poppins-latin-700-normal.woff2", weight: "700", style: "normal" },
    { path: "./poppins-latin-800-normal.woff2", weight: "800", style: "normal" },
  ],
  display: "swap",
  variable: "--font-poppins",
  fallback: ["ui-sans-serif", "system-ui", "sans-serif"],
});
