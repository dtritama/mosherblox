export type CsvValue = string | number | null;

/** Excel with Indonesian settings splits columns on ";" (the comma is its decimal sign). */
export const CSV_SEPARATORS = { semicolon: ";", comma: "," } as const;
export type CsvFormat = keyof typeof CSV_SEPARATORS;

function cell(value: CsvValue, separator: string): string {
  if (value === null) return "";
  if (typeof value === "number") return String(value);
  // One order = one line.
  let text = value.replace(/[\r\n\t]+/g, " ").trim();
  // Buyers choose their own names: a spreadsheet must never run one as a formula (also full-width signs).
  if (/^[=+\-@＝＋－＠]/.test(text)) text = `'${text}`;
  return text.includes(separator) || text.includes('"') ? `"${text.replaceAll('"', '""')}"` : text;
}

/** UTF-8 with a BOM, so Excel reads names with special letters correctly. */
export function toCsv(rows: CsvValue[][], format: CsvFormat): string {
  const separator = CSV_SEPARATORS[format];
  return `﻿${rows.map((row) => row.map((value) => cell(value, separator)).join(separator)).join("\r\n")}\r\n`;
}
