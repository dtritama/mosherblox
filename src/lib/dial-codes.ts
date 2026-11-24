/** Country calling codes (ISO 3166 → code), for the WhatsApp field. Pure data + small helpers. */
const RAW =
  "AF93 AL355 DZ213 AS1684 AD376 AO244 AI1264 AG1268 AR54 AM374 AW297 AU61 AT43 AZ994 BS1242 BH973 BD880 BB1246 BY375 BE32 BZ501 BJ229 BM1441 BT975 BO591 BA387 BW267 BR55 VG1284 BN673 BG359 BF226 BI257 KH855 CM237 CA1 CV238 KY1345 CF236 TD235 CL56 CN86 CO57 KM269 CG242 CD243 CK682 CR506 CI225 HR385 CU53 CW599 CY357 CZ420 DK45 DJ253 DM1767 DO1809 EC593 EG20 SV503 GQ240 ER291 EE372 SZ268 ET251 FO298 FJ679 FI358 FR33 GF594 PF689 GA241 GM220 GE995 DE49 GH233 GI350 GR30 GL299 GD1473 GP590 GU1671 GT502 GN224 GW245 GY592 HT509 HN504 HK852 HU36 IS354 IN91 ID62 IR98 IQ964 IE353 IL972 IT39 JM1876 JP81 JO962 KZ77 KE254 KI686 XK383 KW965 KG996 LA856 LV371 LB961 LS266 LR231 LY218 LI423 LT370 LU352 MO853 MG261 MW265 MY60 MV960 ML223 MT356 MH692 MQ596 MR222 MU230 MX52 FM691 MD373 MC377 MN976 ME382 MS1664 MA212 MZ258 MM95 NA264 NR674 NP977 NL31 NC687 NZ64 NI505 NE227 NG234 NU683 KP850 MK389 MP1670 NO47 OM968 PK92 PW680 PS970 PA507 PG675 PY595 PE51 PH63 PL48 PT351 PR1787 QA974 RE262 RO40 RU7 RW250 KN1869 LC1758 PM508 VC1784 WS685 SM378 ST239 SA966 SN221 RS381 SC248 SL232 SG65 SX1721 SK421 SI386 SB677 SO252 ZA27 KR82 SS211 ES34 LK94 SD249 SR597 SE46 CH41 SY963 TW886 TJ992 TZ255 TH66 TL670 TG228 TK690 TO676 TT1868 TN216 TR90 TM993 TC1649 TV688 UG256 UA380 AE971 GB44 US1 UY598 UZ998 VU678 VE58 VN84 WF681 YE967 ZM260 ZW263";

export interface DialCode {
  iso: string;
  code: string;
}

export const DIAL_CODES: readonly DialCode[] = RAW.split(" ").map((item) => ({
  iso: item.slice(0, 2),
  code: item.slice(2),
}));

/** Shown first in the picker: where most of the store's buyers are. */
export const COMMON_COUNTRIES = [
  "ID",
  "MY",
  "SG",
  "BN",
  "TL",
  "PH",
  "TH",
  "VN",
  "AU",
  "JP",
  "KR",
  "TW",
  "HK",
  "SA",
  "AE",
];

/** When a code is shared (+1), the country to show. */
const MAIN: Record<string, string> = { "1": "US" };

/** Longest matching code of a number written with "+": "+60123…" → Malaysia. */
export function detectCountry(value: string): DialCode | null {
  const digits = value.replace(/\D/g, "");
  if (!value.trim().startsWith("+") || !digits) return null;
  for (let length = 4; length > 0; length--) {
    const code = digits.slice(0, length);
    if (code.length < length) continue;
    const match = DIAL_CODES.find((item) => item.code === code && (!MAIN[code] || MAIN[code] === item.iso));
    if (match) return match;
  }
  return null;
}

/** Countries whose mobile numbers really keep a 0 after the country code. */
const KEEPS_ZERO = new Set(["39", "225", "242", "378"]);

/** "+60 012…" → "+6012…": the 0 people write at home is not part of the international number. */
export function stripTrunkZero(digits: string): string {
  const country = detectCountry(`+${digits}`);
  if (!country || KEEPS_ZERO.has(country.code)) return digits;
  const rest = digits.slice(country.code.length);
  return rest.startsWith("0") ? country.code + rest.slice(1) : digits;
}
