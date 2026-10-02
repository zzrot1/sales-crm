export type ReportPresetId = "thisMonth" | "last3Months" | "last6Months" | "thisYear" | "custom";

export type ReportPeriod = {
  from: string;
  to: string;
};

export const reportPresets: { id: Exclude<ReportPresetId, "custom">; label: string }[] = [
  { id: "thisMonth", label: "Luna curenta" },
  { id: "last3Months", label: "Ultimele 3 luni" },
  { id: "last6Months", label: "Ultimele 6 luni" },
  { id: "thisYear", label: "Anul curent" },
];

/** Aceeasi limita ca pe server: mai devreme e o greseala de tastare, nu date. */
export const MIN_REPORT_DATE = "2000-01-01";

/** Tot ca pe server: un raport acopera cel mult 3 ani. */
const MAX_PERIOD_DAYS = 3 * 366;

const DAY_MS = 24 * 60 * 60 * 1000;

/** `YYYY-MM-DD` in ora locala — `toISOString` ar muta ziua dupa fusul orar. */
export function toIsoDate(date: Date) {
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${date.getFullYear()}-${month}-${day}`;
}

/** `YYYY-MM-DD` -> `Date` la miezul noptii, ora locala. */
export function fromIsoDate(value: string) {
  const [year, month, day] = value.split("-").map(Number);

  return new Date(year, month - 1, day);
}

export function getPresetPeriod(
  preset: Exclude<ReportPresetId, "custom">,
  today = new Date(),
): ReportPeriod {
  const monthsBack = { last3Months: 2, last6Months: 5, thisMonth: 0, thisYear: 0 }[preset];
  const from =
    preset === "thisYear"
      ? new Date(today.getFullYear(), 0, 1)
      : new Date(today.getFullYear(), today.getMonth() - monthsBack, 1);

  return { from: toIsoDate(from), to: toIsoDate(today) };
}

/**
 * De ce perioada nu poate fi ceruta, sau `null` daca e buna. Un camp de tip
 * `date` trece prin valori ca `0002-03-01` cat timp scrii anul; acelea nu pleaca
 * la server.
 */
export function getPeriodError({ from, to }: ReportPeriod) {
  if (!from || !to) {
    return "Alege ambele date.";
  }

  if (from < MIN_REPORT_DATE || to < MIN_REPORT_DATE) {
    return `Datele incep de la ${formatReportDate(MIN_REPORT_DATE)}.`;
  }

  if (from > to) {
    return "Data de inceput e dupa data de sfarsit.";
  }

  if ((fromIsoDate(to).getTime() - fromIsoDate(from).getTime()) / DAY_MS > MAX_PERIOD_DAYS) {
    return "Perioada poate avea cel mult 3 ani.";
  }

  return null;
}

const moneyFormatter = new Intl.NumberFormat("ro-RO", {
  currency: "EUR",
  maximumFractionDigits: 0,
  style: "currency",
});

const percentFormatter = new Intl.NumberFormat("ro-RO", {
  maximumFractionDigits: 0,
  style: "percent",
});

const monthFormatter = new Intl.DateTimeFormat("ro-RO", {
  month: "short",
  year: "numeric",
});

const dateFormatter = new Intl.DateTimeFormat("ro-RO", {
  day: "numeric",
  month: "short",
  year: "numeric",
});

export function formatMoney(value: number) {
  return moneyFormatter.format(value);
}

export function formatPercent(value: number | null) {
  return value === null ? "—" : percentFormatter.format(value);
}

/** `2026-07` -> `iul. 2026` */
export function formatMonth(month: string) {
  return monthFormatter.format(fromIsoDate(`${month}-01`));
}

/** `2026-07-14` -> `14 iul. 2026` */
export function formatReportDate(value: string) {
  return dateFormatter.format(fromIsoDate(value));
}

/** Motivul afisat cand deal-ul a fost pierdut fara unul. */
export function formatLostReason(reason: string | null) {
  return reason ?? "Fara motiv specificat";
}

/** Latimea unei bare, in procente din cea mai mare valoare. O valoare nenula ramane vizibila. */
export function barWidth(value: number, max: number) {
  if (max <= 0 || value <= 0) {
    return 0;
  }

  return Math.max((value / max) * 100, 2);
}

export type CsvTable = {
  fileName: string;
  headers: string[];
  rows: (string | number | null)[][];
};

/**
 * Excel-ul cu setari romanesti foloseste `;` intre coloane si virgula la zecimale.
 * Cu `,` intre coloane, fisierul s-ar deschide pe o singura coloana.
 */
const CSV_SEPARATOR = ";";

/** Un text care incepe asa e citit de Excel ca formula (`=HYPERLINK(...)`). */
const FORMULA_PREFIX = /^[=+\-@\t\r]/;

function escapeCsvCell(value: string | number | null) {
  if (value === null) {
    return "";
  }

  if (typeof value === "number") {
    return String(value).replace(".", ",");
  }

  // Textul introdus de utilizatori (titluri, companii, motive) nu devine formula.
  const text = FORMULA_PREFIX.test(value) ? `'${value}` : value;

  return /[";\r\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

export function toCsv({ headers, rows }: Pick<CsvTable, "headers" | "rows">) {
  return [headers, ...rows]
    .map((row) => row.map(escapeCsvCell).join(CSV_SEPARATOR))
    .join("\r\n");
}

/** Descarca tabelul ca fisier CSV. BOM-ul face ca Excel sa citeasca diacriticele corect. */
export function downloadCsv(table: CsvTable) {
  const blob = new Blob(["﻿", toCsv(table)], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = table.fileName;
  link.click();
  // Dupa ce browserul a pornit descarcarea; Safari are nevoie de cateva momente.
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}
