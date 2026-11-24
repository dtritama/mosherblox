"use client";

import { Check, ChevronDown } from "lucide-react";
import { useEffect, useRef, useState, type KeyboardEvent } from "react";

import { cn } from "@/lib/utils";

const GAP = 6;
const MAX_HEIGHT = 380;

export interface SelectOption<T extends string> {
  value: T;
  label: string;
}

/**
 * Select in the store's own look. The list is a native popover (top layer), so a dialog or card never
 * cuts it off; Esc and a click outside close only the list. Focus stays on the field (arrow keys,
 * Home / End, first letters, Enter). `name` adds a hidden input for plain forms.
 */
export function SelectMenu<T extends string>({
  id,
  labelId,
  name,
  value,
  options,
  onChange,
}: {
  id: string;
  /** The label's id; also give the label htmlFor={id}. */
  labelId: string;
  name?: string;
  value: T;
  options: readonly SelectOption<T>[];
  onChange: (value: T) => void;
}) {
  const buttonRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLUListElement>(null);
  const typed = useRef({ text: "", at: 0 });
  const [open, setOpen] = useState(false);
  const selectedIndex = Math.max(
    0,
    options.findIndex((option) => option.value === value),
  );
  const [active, setActive] = useState(selectedIndex);

  // Same width as the field; below it, or above when there is no room.
  useEffect(() => {
    const panel = panelRef.current;
    const button = buttonRef.current;
    if (!open || !panel || !button) return;
    const place = () => {
      const rect = button.getBoundingClientRect();
      const below = window.innerHeight - rect.bottom - GAP * 2;
      const above = rect.top - GAP * 2;
      const wanted = Math.min(MAX_HEIGHT, panel.scrollHeight + 2);
      const up = below < wanted && above > below;
      const height = Math.min(wanted, up ? above : below);
      panel.style.left = `${rect.left}px`;
      panel.style.width = `${rect.width}px`;
      panel.style.maxHeight = `${height}px`;
      panel.style.top = `${up ? rect.top - GAP - height : rect.bottom + GAP}px`;
    };
    place();
    window.addEventListener("resize", place);
    window.addEventListener("scroll", place, true);
    return () => {
      window.removeEventListener("resize", place);
      window.removeEventListener("scroll", place, true);
    };
  }, [open]);

  useEffect(() => {
    if (open) panelRef.current?.querySelector('[data-active="true"]')?.scrollIntoView({ block: "nearest" });
  }, [open, active]);

  const pick = (index: number) => {
    panelRef.current?.hidePopover();
    const option = options[index];
    if (option) onChange(option.value);
  };

  const onKeyDown = (event: KeyboardEvent) => {
    const last = options.length - 1;
    const moves: Record<string, number> = {
      ArrowDown: open ? Math.min(last, active + 1) : selectedIndex,
      ArrowUp: open ? Math.max(0, active - 1) : selectedIndex,
      Home: 0,
      End: last,
    };
    const move = moves[event.key];
    if (event.metaKey || event.ctrlKey) return;
    if (move !== undefined) {
      event.preventDefault();
      panelRef.current?.showPopover();
      setActive(move);
    } else if (event.key === "Enter" || event.key === " ") {
      event.preventDefault(); // never submits the form
      if (open) pick(active);
      else panelRef.current?.showPopover();
    } else if (event.key === "Tab") {
      panelRef.current?.hidePopover();
    } else if (event.key.length === 1 && !event.altKey) {
      const now = event.timeStamp;
      const text = (now - typed.current.at < 700 ? typed.current.text : "") + event.key.toLowerCase();
      typed.current = { text, at: now };
      const found = options.findIndex((option) => option.label.toLowerCase().startsWith(text));
      if (found < 0) return;
      panelRef.current?.showPopover();
      setActive(found);
    }
  };

  return (
    <>
      {name ? <input type="hidden" name={name} value={value} /> : null}
      <button
        ref={buttonRef}
        id={id}
        type="button"
        role="combobox"
        popoverTarget={`${id}-list`}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={`${id}-list`}
        aria-labelledby={labelId}
        aria-activedescendant={open ? `${id}-${active}` : undefined}
        onKeyDown={onKeyDown}
        // Firefox clicks a button on Space key-up; the key is already handled above.
        onKeyUp={(event) => event.key === " " && event.preventDefault()}
        className={cn(
          "flex h-11 w-full min-w-0 items-center justify-between gap-2 rounded-xl border-2 bg-white px-3.5 text-left text-sm text-ink-900 transition-colors outline-none focus-visible:border-brand-500",
          open ? "border-brand-500" : "border-brand-100 hover:border-brand-300",
        )}
      >
        <span className="truncate">{options[selectedIndex]?.label}</span>
        <ChevronDown
          className={cn("size-4 shrink-0 text-ink-500 transition-transform", open && "rotate-180")}
          aria-hidden="true"
        />
      </button>

      <ul
        ref={panelRef}
        id={`${id}-list`}
        popover="auto"
        role="listbox"
        aria-labelledby={labelId}
        onBeforeToggle={(event) => event.newState === "open" && setActive(selectedIndex)}
        onToggle={(event) => setOpen(event.newState === "open")}
        className="fixed inset-auto m-0 overflow-y-auto overscroll-contain rounded-2xl border border-brand-200 bg-white p-1.5 text-ink-900 shadow-2xl"
      >
        {options.map((option, index) => {
          const selected = option.value === value;
          return (
            <li
              key={option.value}
              id={`${id}-${index}`}
              role="option"
              aria-selected={selected}
              data-active={index === active}
              // Keeps focus on the field.
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => pick(index)}
              onPointerMove={(event) => event.pointerType === "mouse" && setActive(index)}
              className={cn(
                "flex min-h-11 cursor-pointer items-center justify-between gap-3 rounded-xl px-3 py-2 text-sm",
                index === active && "bg-brand-50",
                selected && "bg-brand-100 font-semibold",
              )}
            >
              <span className="min-w-0 break-words">{option.label}</span>
              {selected ? <Check className="size-4 shrink-0 text-brand-700" aria-hidden="true" /> : null}
            </li>
          );
        })}
      </ul>
    </>
  );
}
