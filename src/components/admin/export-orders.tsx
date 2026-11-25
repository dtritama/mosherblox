"use client";

import { Download, FileSpreadsheet } from "lucide-react";
import { useId, useRef, useState, type ReactNode } from "react";

import { adminCopy } from "@/app/admin/copy";
import { Button } from "@/components/ui/button";
import { SelectMenu } from "@/components/ui/select-menu";
import type { CsvFormat } from "@/lib/csv";
import { EXPORT_PERIODS, type ExportPeriod } from "@/lib/export-period";

const t = adminCopy.export;
const STATUSES = ["all", "check", "preorder", "pending", "paid", "processing", "completed", "failed", "expired"] as const;
type Status = (typeof STATUSES)[number];
const STATUS_OPTIONS = STATUSES.map((value) => ({ value, label: adminCopy.filters[value] }));
const PERIOD_OPTIONS = EXPORT_PERIODS.map((value) => ({ value, label: t.periods[value] }));
const FORMAT_OPTIONS = (["semicolon", "comma"] as const).map((value) => ({ value, label: t.formats[value] }));
const control =
  "h-11 w-full min-w-0 rounded-xl border-2 border-brand-100 bg-white px-3 text-sm text-ink-900 outline-none hover:border-brand-300 focus:border-brand-500";

/** "Export CSV" on the order list: pick status, dates and spreadsheet app, then the file downloads. */
export function ExportOrders({ status, className }: { status: Status; className?: string }) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const id = useId();
  const [chosen, setChosen] = useState<Status>(status);
  const [format, setFormat] = useState<CsvFormat>("semicolon");
  const [period, setPeriod] = useState<ExportPeriod>("all");
  const [from, setFrom] = useState("");

  return (
    <>
      <Button
        variant="outline"
        aria-haspopup="dialog"
        className={className}
        onClick={() => {
          setChosen(status); // start on the tab being viewed
          dialogRef.current?.showModal();
        }}
      >
        <Download className="size-4" aria-hidden="true" />
        {t.open}
      </Button>

      <dialog
        ref={dialogRef}
        aria-labelledby={`${id}-title`}
        onClick={(event) => {
          if (event.target === event.currentTarget) event.currentTarget.close();
        }}
        className="m-auto w-[calc(100%-2rem)] max-w-md translate-y-0 rounded-[1.75rem] bg-white p-0 text-ink-900 opacity-100 shadow-2xl transition-[opacity,translate] duration-200 backdrop:bg-coal/50 dark:border dark:border-brand-100 dark:backdrop:bg-black/60 backdrop:backdrop-blur-sm starting:open:translate-y-3 starting:open:opacity-0"
      >
        {/* A plain GET form: the browser downloads the file and stays on this page. */}
        <form
          action="/admin/orders-export"
          className="p-6"
          onSubmit={() => setTimeout(() => dialogRef.current?.close())}
        >
          <span className="grid size-12 place-items-center rounded-2xl bg-brand-100 text-brand-700">
            <FileSpreadsheet className="size-6" aria-hidden="true" />
          </span>
          <h2 id={`${id}-title`} className="mt-4 text-xl font-bold">
            {t.title}
          </h2>
          <p className="mt-1.5 text-sm text-ink-700">{t.description}</p>

          <div className="mt-5 grid gap-4">
            <Field id={`${id}-status`} label={t.status}>
              <SelectMenu
                id={`${id}-status`}
                labelId={`${id}-status-label`}
                name="status"
                value={chosen}
                options={STATUS_OPTIONS}
                onChange={setChosen}
              />
            </Field>

            <Field id={`${id}-period`} label={t.period}>
              <SelectMenu
                id={`${id}-period`}
                labelId={`${id}-period-label`}
                name="period"
                value={period}
                options={PERIOD_OPTIONS}
                onChange={setPeriod}
              />
            </Field>

            {period === "custom" ? (
              <div className="grid gap-4 sm:grid-cols-2">
                <Field id={`${id}-from`} label={t.from}>
                  <input
                    id={`${id}-from`}
                    name="from"
                    type="date"
                    required
                    min="2020-01-01"
                    max="2099-12-31"
                    value={from}
                    onChange={(event) => setFrom(event.target.value)}
                    className={control}
                  />
                </Field>
                <Field id={`${id}-to`} label={t.to}>
                  <input
                    id={`${id}-to`}
                    name="to"
                    type="date"
                    required
                    min={from || "2020-01-01"}
                    max="2099-12-31"
                    className={control}
                  />
                </Field>
              </div>
            ) : null}

            <Field id={`${id}-format`} label={t.format}>
              <SelectMenu
                id={`${id}-format`}
                labelId={`${id}-format-label`}
                name="format"
                value={format}
                options={FORMAT_OPTIONS}
                onChange={setFormat}
              />
            </Field>
          </div>

          <p className="mt-4 text-xs text-ink-500">{t.privacy}</p>

          <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button variant="outline" onClick={() => dialogRef.current?.close()}>
              {t.cancel}
            </Button>
            <Button type="submit">
              <Download className="size-4" aria-hidden="true" />
              {t.submit}
            </Button>
          </div>
        </form>
      </dialog>
    </>
  );
}

function Field({ id, label, children }: { id: string; label: string; children: ReactNode }) {
  return (
    <div className="grid min-w-0 gap-1.5">
      <label id={`${id}-label`} htmlFor={id} className="text-sm font-semibold">
        {label}
      </label>
      {children}
    </div>
  );
}
