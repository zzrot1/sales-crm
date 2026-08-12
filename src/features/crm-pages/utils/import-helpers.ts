import * as XLSX from "xlsx";

import type { ImportLeadRow } from "@/service-api/generated/models";

export type ImportStatus =
  | { tone: "idle"; message: string }
  | { tone: "success"; message: string }
  | { tone: "error"; message: string };

export const idleImportMessage =
  "Trage aici un Excel sau CSV, ori alege fisierul manual.";

export const importBatchSize = 100;

export const previewColumns = [
  { label: "Companie", key: "companyName" },
  { label: "Contact", key: "contactName" },
  { label: "Email", key: "email" },
  { label: "Telefon", key: "phone" },
  { label: "Prioritate", key: "priority" },
] as const;

const headerMap: Record<string, keyof ImportLeadRow> = {
  "canal principal": "channel",
  canal: "channel",
  channel: "channel",
  companie: "companyName",
  company: "companyName",
  "company name": "companyName",
  "denumire companie": "companyName",
  firma: "companyName",
  "nume companie": "companyName",
  organization: "companyName",
  organisation: "companyName",
  email: "email",
  "echipa it": "hasItTeam",
  functie: "jobTitle",
  "functie contact": "jobTitle",
  "job title": "jobTitle",
  position: "jobTitle",
  role: "jobTitle",
  title: "jobTitle",
  industrie: "industry",
  industry: "industry",
  linkedin: "linkedinUrl",
  "linkedin url": "linkedinUrl",
  note: "notes",
  notes: "notes",
  contact: "contactName",
  "contact name": "contactName",
  "full name": "contactName",
  name: "contactName",
  nume: "contactName",
  "nume contact": "contactName",
  "persoana contact": "contactName",
  "pachet principal": "packageName",
  pachet: "packageName",
  package: "packageName",
  "pain point": "painPoint",
  prioritate: "priority",
  priority: "priority",
  "rand sursa": "sourceRow",
  row: "sourceRow",
  "source row": "sourceRow",
  "status contact": "contactStatus",
  status: "contactStatus",
  "contact status": "contactStatus",
  telefon: "phone",
  phone: "phone",
  "phone number": "phone",
  tel: "phone",
  website: "website",
};

const allowedImportFields = new Set<keyof ImportLeadRow>([
  "companyName",
  "contactName",
  "jobTitle",
  "email",
  "phone",
  "industry",
  "website",
  "linkedinUrl",
  "painPoint",
  "hasItTeam",
  "packageName",
  "channel",
  "priority",
  "notes",
  "sourceRow",
  "contactStatus",
]);

export function isImportFile(file: File) {
  const fileName = file.name.toLowerCase();

  return (
    file.type === "text/csv" ||
    fileName.endsWith(".csv") ||
    fileName.endsWith(".txt") ||
    fileName.endsWith(".xlsx") ||
    fileName.endsWith(".xls")
  );
}

export async function parseImportFile(file: File): Promise<ImportLeadRow[]> {
  const fileName = file.name.toLowerCase();

  if (fileName.endsWith(".xlsx") || fileName.endsWith(".xls")) {
    return parseRowsMatrix(parseExcelMatrix(await file.arrayBuffer()));
  }

  return parseRowsMatrix(parseCsvMatrix(await file.text()));
}

function parseExcelMatrix(fileBuffer: ArrayBuffer) {
  const workbook = XLSX.read(fileBuffer, { type: "array" });
  const firstSheetName = workbook.SheetNames[0];

  if (!firstSheetName) {
    throw new Error("Fisierul Excel nu contine niciun sheet.");
  }

  const worksheet = workbook.Sheets[firstSheetName];
  return XLSX.utils.sheet_to_json<string[]>(worksheet, {
    header: 1,
    defval: "",
    raw: false,
  });
}

function parseRowsMatrix(matrix: string[][]): ImportLeadRow[] {
  const [headers, ...records] = matrix.filter((row) =>
    row.some((cell) => String(cell).trim().length > 0),
  );

  if (!headers?.length) {
    throw new Error("Fisierul nu contine header.");
  }

  const mappedRows = records
    .map((record, index) => mapCsvRow(headers, record, index + 2))
    .filter(hasRowPayload);

  if (!mappedRows.length) {
    throw new Error("Fisierul nu contine randuri importabile.");
  }

  const rows = mappedRows.filter((row) => Boolean(row.companyName));

  if (!rows.length) {
    throw new Error(
      "Nu am gasit coloana pentru companie. Foloseste un header precum Companie, Company Name, Nume companie sau Firma.",
    );
  }

  return rows;
}

function hasRowPayload(row: ImportLeadRow) {
  return Object.entries(row).some(
    ([key, value]) => key !== "sourceRow" && Boolean(value),
  );
}

export function chunkRows(rows: ImportLeadRow[], batchSize: number) {
  const batches: ImportLeadRow[][] = [];

  for (let index = 0; index < rows.length; index += batchSize) {
    batches.push(rows.slice(index, index + batchSize));
  }

  return batches;
}

export function toUsefulImportRow(row: ImportLeadRow): ImportLeadRow {
  return Array.from(allowedImportFields).reduce<ImportLeadRow>((payload, key) => {
    const value = row[key];

    if (value !== undefined && value !== null && value !== "") {
      payload[key] = value as never;
    }

    return payload;
  }, {});
}

function mapCsvRow(
  headers: string[],
  record: string[],
  sourceRow: number,
): ImportLeadRow {
  const row: ImportLeadRow = { sourceRow };

  headers.forEach((header, index) => {
    const value = record[index]?.trim();

    if (!value) {
      return;
    }

    const normalizedHeader = normalizeHeader(header);
    const targetKey = headerMap[normalizedHeader];

    if (targetKey) {
      setMappedField(row, targetKey, parseFieldValue(targetKey, value));
      return;
    }

    const directKey = header as keyof ImportLeadRow;

    if (allowedImportFields.has(directKey)) {
      setMappedField(row, directKey, parseFieldValue(directKey, value));
    }
  });

  return row;
}

function setMappedField(
  row: ImportLeadRow,
  key: keyof ImportLeadRow,
  value: string | number | boolean,
) {
  if (!allowedImportFields.has(key)) {
    return;
  }

  row[key] = value as never;
}

function parseFieldValue(key: keyof ImportLeadRow, value: string) {
  if (key === "hasItTeam") {
    const normalizedValue = normalizeHeader(value);
    if (["da", "yes", "true", "1"].includes(normalizedValue)) {
      return true;
    }
    if (["nu", "no", "false", "0"].includes(normalizedValue)) {
      return false;
    }
  }

  if (key === "sourceRow") {
    const numberValue = Number(value);
    return Number.isFinite(numberValue) ? numberValue : value;
  }

  return value;
}

function normalizeHeader(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^\w\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function parseCsvMatrix(csvText: string) {
  const delimiter = detectDelimiter(csvText);
  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentCell = "";
  let inQuotes = false;

  for (let index = 0; index < csvText.length; index += 1) {
    const char = csvText[index];
    const nextChar = csvText[index + 1];

    if (char === '"' && inQuotes && nextChar === '"') {
      currentCell += '"';
      index += 1;
      continue;
    }

    if (char === '"') {
      inQuotes = !inQuotes;
      continue;
    }

    if (char === delimiter && !inQuotes) {
      currentRow.push(currentCell);
      currentCell = "";
      continue;
    }

    if ((char === "\n" || char === "\r") && !inQuotes) {
      if (char === "\r" && nextChar === "\n") {
        index += 1;
      }

      currentRow.push(currentCell);
      rows.push(currentRow);
      currentRow = [];
      currentCell = "";
      continue;
    }

    currentCell += char;
  }

  currentRow.push(currentCell);
  rows.push(currentRow);

  return rows;
}

function detectDelimiter(csvText: string) {
  const firstLine = csvText.split(/\r?\n/, 1)[0] ?? "";
  const delimiters = [",", ";", "\t"];

  return delimiters.reduce((bestDelimiter, delimiter) => {
    const bestCount = countDelimiter(firstLine, bestDelimiter);
    const currentCount = countDelimiter(firstLine, delimiter);
    return currentCount > bestCount ? delimiter : bestDelimiter;
  }, ",");
}

function countDelimiter(line: string, delimiter: string) {
  let count = 0;
  let inQuotes = false;

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];

    if (char === '"') {
      inQuotes = !inQuotes;
      continue;
    }

    if (char === delimiter && !inQuotes) {
      count += 1;
    }
  }

  return count;
}

export async function getImportErrorMessage(error: unknown) {
  if (hasJsonResponse(error)) {
    try {
      const body = await error.response.json();
      const errors = Array.isArray(body?.errors) ? body.errors : [];

      if (errors.length) {
        return errors
          .slice(0, 3)
          .map(
            (item: { index?: number; message?: string }) =>
              `Rand ${(item.index ?? 0) + 1}: ${item.message ?? "eroare import"}`,
          )
          .join(" | ");
      }
    } catch {
      return "Importul a esuat. Verifica formatul fisierului.";
    }
  }

  return "Importul a esuat. Verifica formatul fisierului.";
}

function hasJsonResponse(error: unknown): error is { response: Response } {
  return (
    typeof error === "object" &&
    error !== null &&
    "response" in error &&
    error.response instanceof Response
  );
}
