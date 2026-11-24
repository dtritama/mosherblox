import { siteConfig } from "@/config/site";
import { locales, type Locale, type LocalizedText } from "@/i18n/config";
import type { Dictionary } from "@/i18n/dictionaries/id";
import { normalizeWhatsapp } from "@/lib/validation";

/**
 * Home page content the owner edits in /admin/content: banners, contact, FAQ and section texts.
 * Defaults stay in code (src/data/banners.ts, src/config/site.ts, the dictionaries); only edits are
 * stored. Pure: the admin editor and the server share the same validation.
 */

/* ---------------------------------------------- Types ---------------------------------------------- */

export interface BannerContent {
  id: string;
  /** "builtin:<id>" (src/data/banners.ts) or an uploaded file name (served by /banners/[file]). */
  image: string;
  alt: LocalizedText;
  /** "" = no link, "#section", "/page" (locale added automatically) or https://… */
  href: string;
  visible: boolean;
}

/** Empty string = channel hidden (WhatsApp is always there: Check Order's help button uses it). */
export interface ContactContent {
  /** 628… */
  whatsapp: string;
  discord: string;
  whatsappGroup: string;
}

export interface FaqItemContent {
  question: LocalizedText;
  answer: LocalizedText;
}

/** Edited texts by dictionary path ("hero.description"). Empty / missing = the default text. */
export type TextContent = Record<string, Partial<LocalizedText>>;

export interface SiteContent {
  /** null = not edited: use the defaults. */
  banners: BannerContent[] | null;
  contact: ContactContent;
  faq: FaqItemContent[] | null;
  texts: TextContent;
}

export const CONTENT_KEYS = {
  banners: "content.banners",
  contact: "content.contact",
  faq: "content.faq",
  texts: "content.texts",
} as const satisfies Record<keyof SiteContent, string>;

export const defaultContact: ContactContent = {
  whatsapp: siteConfig.contact.whatsapp.number,
  discord: siteConfig.contact.discord.url,
  whatsappGroup: siteConfig.contact.whatsappGroup.url,
};

export const defaultContent: SiteContent = { banners: null, contact: defaultContact, faq: null, texts: {} };

export const CONTENT_LIMITS = {
  banners: 8,
  alt: 250,
  href: 300,
  faqItems: 20,
  question: 200,
  answer: 1500,
  text: 400,
} as const;

/* ---------------------------------------------- Editable texts ---------------------------------------------- */

export interface TextField {
  path: string;
  label: string;
  multiline?: boolean;
}

export interface TextGroup {
  id: string;
  title: string;
  fields: TextField[];
}

const heading = (section: string): TextField[] => [
  { path: `${section}.titleStart`, label: "Judul" },
  { path: `${section}.titleHighlight`, label: "Judul (bagian hijau)" },
  { path: `${section}.description`, label: "Deskripsi", multiline: true },
];
const cards = (path: string, count: number, label: string): TextField[] =>
  Array.from({ length: count }, (_, i) => [
    { path: `${path}.${i}.title`, label: `${label} ${i + 1}: judul` },
    { path: `${path}.${i}.description`, label: `${label} ${i + 1}: isi`, multiline: true },
  ]).flat();

/** Texts with {placeholders} (prices, limits) are left out on purpose: they follow the real numbers. */
export const TEXT_GROUPS: TextGroup[] = [
  {
    id: "hero",
    title: "Bagian paling atas",
    fields: [
      { path: "hero.headline", label: "Judul besar" },
      { path: "hero.highlight", label: "Judul (bagian hijau)" },
      { path: "hero.description", label: "Deskripsi", multiline: true },
    ],
  },
  {
    id: "robuxTeaser",
    title: "Robux",
    fields: [
      ...heading("robuxTeaser"),
      { path: "robuxTeaser.howTitle", label: "Judul cara kerja" },
      ...cards("robuxTeaser.steps", 3, "Langkah"),
      { path: "robuxTeaser.cta.title", label: "Kartu ajakan: judul" },
      { path: "robuxTeaser.cta.description", label: "Kartu ajakan: isi", multiline: true },
      { path: "robuxTeaser.cta.button", label: "Kartu ajakan: tombol" },
    ],
  },
  { id: "shop", title: "Toko", fields: heading("shop") },
  { id: "deals", title: "Flash deal", fields: heading("deals") },
  {
    id: "features",
    title: "Kenapa MOSHERBLOX",
    fields: [
      ...heading("features"),
      ...cards("features.items", 4, "Keunggulan"),
      { path: "features.checklist.0", label: "Centang 1" },
      { path: "features.checklist.1", label: "Centang 2" },
      { path: "features.checklist.2", label: "Centang 3" },
      { path: "features.waysToPayDescription", label: "Keterangan metode pembayaran" },
    ],
  },
  {
    id: "how",
    title: "Cara kerja",
    fields: [...heading("how").slice(0, 2), ...cards("how.steps", 4, "Langkah")],
  },
  { id: "leaderboard", title: "Leaderboard", fields: heading("leaderboard") },
  { id: "reviews", title: "Ulasan", fields: heading("reviews") },
  { id: "faq", title: "Judul FAQ", fields: heading("faq") },
  {
    id: "contact",
    title: "Label kontak",
    fields: [
      { path: "contact.whatsapp.title", label: "WhatsApp" },
      { path: "contact.discord.title", label: "Discord" },
      { path: "contact.whatsappGroup.title", label: "Grup WhatsApp" },
      { path: "contact.whatsappGroup.description", label: "Grup WhatsApp: keterangan" },
      { path: "contact.whatsappMessage", label: "Pesan otomatis WhatsApp", multiline: true },
    ],
  },
  {
    id: "footer",
    title: "Bagian bawah (footer)",
    fields: [
      { path: "cta.eyebrow", label: "Kartu ajakan: teks kecil" },
      { path: "cta.title", label: "Kartu ajakan: judul" },
      { path: "cta.description", label: "Kartu ajakan: isi", multiline: true },
      { path: "cta.primary", label: "Kartu ajakan: tombol" },
      { path: "footer.description", label: "Tentang toko", multiline: true },
      { path: "footer.hours", label: "Jam buka" },
    ],
  },
];

const TEXT_PATHS = new Set(TEXT_GROUPS.flatMap((group) => group.fields.map((field) => field.path)));

/** Current text at a path; the hero headline (a list of animated words) reads as one sentence. */
export function readText(dict: Dictionary, path: string): string {
  const value = path
    .split(".")
    .reduce<unknown>((node, key) => (node as Record<string, unknown> | undefined)?.[key], dict);
  return Array.isArray(value) ? value.join(" ") : typeof value === "string" ? value : "";
}

/** The dictionary with the owner's edits laid over it (a copy: the original is never changed). */
export function applyContent(dict: Dictionary, content: SiteContent, locale: Locale): Dictionary {
  const entries = Object.entries(content.texts).filter(([path, text]) => TEXT_PATHS.has(path) && text[locale]);
  if (entries.length === 0 && !content.faq) return dict;
  const copy = structuredClone(dict) as unknown as Record<string, unknown>;
  for (const [path, text] of entries) {
    const keys = path.split(".");
    const last = keys.pop()!;
    const parent = keys.reduce<Record<string, unknown>>(
      (node, key) => (node?.[key] ?? {}) as Record<string, unknown>,
      copy,
    );
    if (Array.isArray(parent[last])) parent[last] = text[locale]!.split(" ");
    else if (typeof parent[last] === "string") parent[last] = text[locale];
  }
  if (content.faq) {
    (copy.faq as Record<string, unknown>).items = content.faq.map((item) => ({
      question: item.question[locale] || item.question.id,
      answer: item.answer[locale] || item.answer.id,
    }));
  }
  return copy as unknown as Dictionary;
}

/* ---------------------------------------------- Validation ---------------------------------------------- */

export type ContentError =
  | "tooMany"
  | "bannerImage"
  | "bannerAlt"
  | "bannerLink"
  | "faqEmpty"
  | "whatsapp"
  | "discord"
  | "whatsappGroup"
  | "invalid";

export type Parsed<T> = { ok: true; value: T } | { ok: false; error: ContentError; index?: number };

const fail = (error: ContentError, index?: number) => ({ ok: false as const, error, index });
const record = (value: unknown) =>
  typeof value === "object" && value !== null ? (value as Record<string, unknown>) : {};

/** One paragraph of plain text (React escapes it; there is no HTML in content). */
const clean = (value: unknown, max: number) =>
  typeof value === "string" ? value.replace(/\s+/g, " ").trim().slice(0, max) : "";

const localized = (value: unknown, max: number): LocalizedText => {
  const v = record(value);
  return { id: clean(v.id, max), en: clean(v.en, max) };
};

/** Uploaded banner file name (a random UUID we created). */
export const BANNER_FILE = /^[0-9a-f-]{36}\.(jpg|png|webp)$/;
const BUILTIN = /^builtin:[a-z0-9-]{1,40}$/;

export function isBannerHref(href: string) {
  if (href === "" || /^#[a-z][a-z0-9-]*$/i.test(href) || /^\/(?!\/)[a-z0-9/_-]*(#[a-z0-9-]+)?$/i.test(href))
    return true;
  return isHttps(href);
}

function isHttps(value: string, hosts?: readonly string[]) {
  try {
    const url = new URL(value);
    return url.protocol === "https:" && !url.username && (!hosts || hosts.includes(url.hostname.replace(/^www\./, "")));
  } catch {
    return false;
  }
}

export function parseBanners(input: unknown): Parsed<BannerContent[]> {
  if (!Array.isArray(input)) return fail("invalid");
  if (input.length > CONTENT_LIMITS.banners) return fail("tooMany");
  const seen = new Set<string>();
  const value: BannerContent[] = [];
  for (const [index, raw] of input.entries()) {
    const item = record(raw);
    const id = typeof item.id === "string" && /^[a-z0-9-]{1,64}$/i.test(item.id) ? item.id : "";
    if (!id || seen.has(id)) return fail("invalid", index);
    seen.add(id);
    const image = typeof item.image === "string" ? item.image : "";
    if (!BANNER_FILE.test(image) && !BUILTIN.test(image)) return fail("bannerImage", index);
    const alt = localized(item.alt, CONTENT_LIMITS.alt);
    if (!alt.id) return fail("bannerAlt", index);
    const href = clean(item.href, CONTENT_LIMITS.href);
    if (!isBannerHref(href)) return fail("bannerLink", index);
    value.push({ id, image, alt, href, visible: item.visible !== false });
  }
  return { ok: true, value };
}

export function parseContact(input: unknown): Parsed<ContactContent> {
  const item = record(input);
  const whatsapp = normalizeWhatsapp(clean(item.whatsapp, 30));
  if (!whatsapp) return fail("whatsapp");
  const discord = clean(item.discord, 200);
  if (discord && !isHttps(discord, ["discord.gg", "discord.com"])) return fail("discord");
  const whatsappGroup = clean(item.whatsappGroup, 200);
  if (whatsappGroup && !isHttps(whatsappGroup, ["chat.whatsapp.com"])) return fail("whatsappGroup");
  return { ok: true, value: { whatsapp, discord, whatsappGroup } };
}

export function parseFaq(input: unknown): Parsed<FaqItemContent[]> {
  if (!Array.isArray(input)) return fail("invalid");
  if (input.length > CONTENT_LIMITS.faqItems) return fail("tooMany");
  const value: FaqItemContent[] = [];
  for (const [index, raw] of input.entries()) {
    const question = localized(record(raw).question, CONTENT_LIMITS.question);
    const answer = localized(record(raw).answer, CONTENT_LIMITS.answer);
    if (!question.id || !answer.id) return fail("faqEmpty", index);
    value.push({ question, answer });
  }
  return { ok: true, value };
}

/** Keeps known paths with non-empty text. `defaults` drops texts that equal the built-in one. */
export function parseTexts(input: unknown, defaults?: Record<Locale, Dictionary>): Parsed<TextContent> {
  const value: TextContent = {};
  for (const [path, raw] of Object.entries(record(input))) {
    if (!TEXT_PATHS.has(path)) continue;
    const text = localized(raw, CONTENT_LIMITS.text);
    const edited: Partial<LocalizedText> = {};
    for (const locale of locales) {
      if (text[locale] && (!defaults || text[locale] !== readText(defaults[locale], path)))
        edited[locale] = text[locale];
    }
    if (Object.keys(edited).length > 0) value[path] = edited;
  }
  return { ok: true, value };
}

/** Stored values over the defaults; anything malformed is ignored (never breaks the shop). */
export function mergeContent(stored: Partial<Record<keyof SiteContent, unknown>>): SiteContent {
  const pick = <T>(value: unknown, parse: (input: unknown) => Parsed<T>, fallback: T): T => {
    if (value === undefined) return fallback;
    const parsed = parse(value);
    return parsed.ok ? parsed.value : fallback;
  };
  return {
    banners: pick<BannerContent[] | null>(stored.banners, parseBanners, null),
    contact: pick(stored.contact, parseContact, defaultContact),
    faq: pick<FaqItemContent[] | null>(stored.faq, parseFaq, null),
    texts: pick(stored.texts, parseTexts, {}),
  };
}
