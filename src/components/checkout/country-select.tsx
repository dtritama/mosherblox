"use client";

import { Check, ChevronDown, Search } from "lucide-react";
import { useEffect, useId, useMemo, useRef, useState, type KeyboardEvent } from "react";

import { intlLocales } from "@/i18n/config";
import { interpolate } from "@/i18n/format";
import { useI18n } from "@/i18n/i18n-provider";
import { COMMON_COUNTRIES, DIAL_CODES, type DialCode } from "@/lib/dial-codes";
import { cn } from "@/lib/utils";

const PANEL_WIDTH = 320;
const PANEL_MAX = 380;
const GAP = 8;

const plain = (text: string) =>
  text
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase();

/**
 * Country code dropdown with search. A native popover (top layer), so no card, dialog or overflow can
 * cut it off; Esc and a click outside close it. Under the field on wide screens, a centred sheet on phones.
 */
export function CountrySelect({ value, onSelect }: { value: DialCode; onSelect: (country: DialCode) => void }) {
  const { locale, dict } = useI18n();
  const t = dict.checkout.whatsapp;
  const buttonRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const id = useId();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);

  // Names come from the browser, and only once the list is opened.
  const countries = useMemo(() => {
    if (!open) return [];
    const names = new Intl.DisplayNames([intlLocales[locale]], { type: "region" });
    const all = DIAL_CODES.map((item) => ({ ...item, name: names.of(item.iso) ?? item.iso }));
    const common = COMMON_COUNTRIES.flatMap((iso) => all.filter((item) => item.iso === iso));
    const rest = all
      .filter((item) => !COMMON_COUNTRIES.includes(item.iso))
      .sort((a, b) => a.name.localeCompare(b.name, intlLocales[locale]));
    return [...common, ...rest];
  }, [open, locale]);

  const shown = useMemo(() => {
    const term = plain(query.trim());
    if (!term) return countries;
    const digits = term.replace(/\D/g, "");
    return countries.filter(
      (item) =>
        plain(item.name).includes(term) ||
        item.iso.toLowerCase() === term ||
        (digits !== "" && item.code.startsWith(digits)),
    );
  }, [countries, query]);

  // Keep the panel next to the field (or centred on phones) while it is open.
  useEffect(() => {
    const panel = panelRef.current;
    const anchor = buttonRef.current?.parentElement;
    if (!open || !panel || !anchor) return;
    const place = () => {
      const style = panel.style;
      if (window.innerWidth < 640) {
        style.left = "12px";
        style.width = `${window.innerWidth - 24}px`;
        style.top = "12dvh";
        style.maxHeight = "70dvh";
        return;
      }
      const rect = anchor.getBoundingClientRect();
      const below = window.innerHeight - rect.bottom - GAP * 2;
      const above = rect.top - GAP * 2;
      const up = below < 260 && above > below;
      const height = Math.min(PANEL_MAX, Math.max(200, up ? above : below));
      const width = Math.min(PANEL_WIDTH, window.innerWidth - GAP * 2);
      style.width = `${width}px`;
      style.maxHeight = `${height}px`;
      style.left = `${Math.max(GAP, Math.min(rect.left, window.innerWidth - width - GAP))}px`;
      style.top = `${up ? rect.top - GAP - Math.min(height, panel.offsetHeight || height) : rect.bottom + GAP}px`;
    };
    place();
    window.addEventListener("resize", place);
    window.addEventListener("scroll", place, true);
    return () => {
      window.removeEventListener("resize", place);
      window.removeEventListener("scroll", place, true);
    };
  }, [open, shown.length]);

  // Opened: show the chosen country. With a mouse/keyboard also start in the search box (on touch that
  // would open the on-screen keyboard over the list).
  useEffect(() => {
    if (!open) return;
    listRef.current?.querySelector('[aria-selected="true"]')?.scrollIntoView({ block: "nearest" });
    if (window.matchMedia("(pointer: fine)").matches) searchRef.current?.focus();
  }, [open]);

  useEffect(() => {
    if (open) listRef.current?.querySelector('[data-active="true"]')?.scrollIntoView({ block: "nearest" });
  }, [open, active]);

  const select = (country: DialCode) => {
    panelRef.current?.hidePopover();
    onSelect(country);
  };

  const onKeyDown = (event: KeyboardEvent) => {
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      const step = event.key === "ArrowDown" ? 1 : -1;
      setActive((index) => Math.max(0, Math.min(shown.length - 1, index + step)));
    } else if (event.key === "Enter") {
      event.preventDefault(); // never submits the order form
      if (shown[active]) select(shown[active]);
    } else if (event.key === "Tab") {
      panelRef.current?.hidePopover();
    }
  };

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        popoverTarget={`${id}-panel`}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={interpolate(t.countryButton, { country: value.iso, code: value.code })}
        className={cn(
          "flex shrink-0 items-center gap-1.5 rounded-l-[0.6rem] border-r-2 border-brand-100 px-3 text-sm font-semibold text-ink-900 transition-colors outline-none focus-visible:ring-2 focus-visible:ring-brand-400",
          open ? "bg-brand-100" : "bg-brand-50 hover:bg-brand-100",
        )}
      >
        <span className="text-xs font-bold text-brand-700">{value.iso}</span>+{value.code}
        <ChevronDown
          className={cn("size-4 text-ink-500 transition-transform", open && "rotate-180")}
          aria-hidden="true"
        />
      </button>

      <div
        ref={panelRef}
        id={`${id}-panel`}
        popover="auto"
        onToggle={(event) => {
          const opened = event.newState === "open";
          setOpen(opened);
          if (opened) {
            setQuery("");
            setActive(0);
          }
        }}
        onKeyDown={onKeyDown}
        className="fixed inset-auto m-0 flex-col overflow-hidden rounded-2xl border border-brand-200 bg-white p-0 text-ink-900 shadow-2xl backdrop:bg-coal/50 open:flex sm:backdrop:bg-transparent"
      >
        <div className="flex shrink-0 items-center gap-2 border-b border-brand-100 px-3">
          <Search className="size-4 shrink-0 text-ink-500" aria-hidden="true" />
          <input
            ref={searchRef}
            type="text"
            role="combobox"
            aria-label={t.countrySearch}
            aria-expanded={open}
            aria-controls={`${id}-list`}
            aria-activedescendant={shown[active] ? `${id}-${shown[active].iso}` : undefined}
            autoComplete="off"
            spellCheck={false}
            placeholder={t.countrySearch}
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setActive(0);
            }}
            className="h-12 min-w-0 flex-1 bg-transparent text-base outline-none placeholder:text-ink-300 sm:text-sm"
          />
        </div>
        <ul
          ref={listRef}
          id={`${id}-list`}
          role="listbox"
          aria-label={t.country}
          className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-1.5"
        >
          {shown.map((item, index) => {
            const selected = item.iso === value.iso;
            return (
              <li
                key={item.iso}
                id={`${id}-${item.iso}`}
                role="option"
                aria-selected={selected}
                data-active={index === active}
                onClick={() => select(item)}
                onPointerMove={(event) => event.pointerType === "mouse" && setActive(index)}
                className={cn(
                  "flex min-h-11 cursor-pointer items-center gap-3 rounded-xl px-3 py-2 text-sm",
                  index === active && "bg-brand-50",
                  selected && "font-semibold",
                  // A line under the common countries.
                  !query &&
                    index === COMMON_COUNTRIES.length &&
                    "relative mt-3 before:absolute before:inset-x-3 before:-top-1.5 before:h-px before:bg-brand-100",
                )}
              >
                <span
                  aria-hidden="true"
                  className={cn(
                    "grid h-6 w-9 shrink-0 place-items-center rounded-md text-[11px] font-bold",
                    selected ? "bg-brand-400 text-coal" : "bg-brand-100 text-brand-800",
                  )}
                >
                  {item.iso}
                </span>
                <span className="min-w-0 flex-1 break-words">{item.name}</span>
                <span className="shrink-0 text-ink-500 tabular-nums">+{item.code}</span>
                {selected ? <Check className="size-4 shrink-0 text-brand-600" aria-hidden="true" /> : null}
              </li>
            );
          })}
        </ul>
        {shown.length === 0 ? (
          <p role="status" className="px-4 pb-5 text-center text-sm text-ink-500">
            {t.countryEmpty}
          </p>
        ) : null}
      </div>
    </>
  );
}
