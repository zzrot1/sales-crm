"use client";

import {
  AlertCircle,
  CheckCircle2,
  FileSpreadsheet,
  LoaderCircle,
  UploadCloud,
  X,
} from "lucide-react";
import { useRef, useState } from "react";
import * as XLSX from "xlsx";

import { importLeads } from "@/service-api/generated/endpoints/companies/companies";
import type { ImportLeadRow } from "@/service-api/generated/models";
import styles from "./index.module.css";

type ImportStatus =
  | { tone: "idle"; message: string }
  | { tone: "success"; message: string }
  | { tone: "error"; message: string };

const previewColumns = [
  { label: "Companie", key: "companyName" },
  { label: "Contact", key: "contactName" },
  { label: "Email", key: "email" },
  { label: "Telefon", key: "phone" },
  { label: "Prioritate", key: "priority" },
] as const;

const importBatchSize = 100;

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

export function ImportPage() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [fileName, setFileName] = useState("");
  const [rows, setRows] = useState<ImportLeadRow[]>([]);
  const [status, setStatus] = useState<ImportStatus>({
    tone: "idle",
    message: "Trage aici un Excel sau CSV, ori alege fisierul manual.",
  });

  const handleFiles = async (files: FileList | null) => {
    const file = files?.[0];

    if (!file) {
      return;
    }

    if (!isImportFile(file)) {
      setStatus({
        tone: "error",
        message: "Te rog incarca un fisier Excel (.xlsx/.xls) sau CSV.",
      });
      return;
    }

    try {
      const parsedRows = await parseImportFile(file);
      setRows(parsedRows);
      setFileName(file.name);
      setStatus({
        tone: "success",
        message: `${parsedRows.length} randuri pregatite pentru import.`,
      });
    } catch (error) {
      setRows([]);
      setFileName(file.name);
      setStatus({
        tone: "error",
        message:
          error instanceof Error
            ? error.message
            : "Fisierul nu a putut fi citit.",
      });
    }
  };

  const handleImport = async () => {
    if (!rows.length) {
      setStatus({
        tone: "error",
        message: "Incarca un fisier inainte de import.",
      });
      return;
    }

    setIsImporting(true);

    try {
      let imported = 0;
      let skipped = 0;
      const errors: Array<{ index: number; message: string }> = [];
      const batches = chunkRows(rows.map(toUsefulImportRow), importBatchSize);

      for (const [batchIndex, batch] of batches.entries()) {
        setStatus({
          tone: "idle",
          message: `Import batch ${batchIndex + 1} din ${batches.length}...`,
        });

        const response = await importLeads({ rows: batch });
        imported += response.data.imported;
        skipped += response.data.skipped;

        response.data.errors?.forEach((error) => {
          const sourceRow = batch[error.index]?.sourceRow;
          errors.push({
            index:
              typeof sourceRow === "number"
                ? sourceRow - 1
                : batchIndex * importBatchSize + error.index,
            message: error.message,
          });
        });
      }

      if (errors.length) {
        setStatus({
          tone: "error",
          message: `${imported} importate, ${skipped} sarite. Erori: ${errors
            .slice(0, 3)
            .map((error) => `Rand ${error.index + 1}: ${error.message}`)
            .join(" | ")}`,
        });
        return;
      }

      setStatus({
        tone: "success",
        message: `${imported} importate, ${skipped} sarite in ${batches.length} batch-uri.`,
      });
    } catch (error) {
      setStatus({
        tone: "error",
        message: await getImportErrorMessage(error),
      });
    } finally {
      setIsImporting(false);
    }
  };

  const resetImport = () => {
    setRows([]);
    setFileName("");
    setStatus({
      tone: "idle",
      message: "Trage aici un Excel sau CSV, ori alege fisierul manual.",
    });

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  return (
    <div className={styles.page}>
      <section
        className={`${styles.dropzone} ${isDragging ? styles.dropzoneActive : ""}`}
        onClick={() => fileInputRef.current?.click()}
        onDragEnter={(event) => {
          event.preventDefault();
          setIsDragging(true);
        }}
        onDragOver={(event) => {
          event.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={(event) => {
          event.preventDefault();
          setIsDragging(false);
        }}
        onDrop={(event) => {
          event.preventDefault();
          setIsDragging(false);
          void handleFiles(event.dataTransfer.files);
        }}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            fileInputRef.current?.click();
          }
        }}
        role="button"
        tabIndex={0}
      >
        <input
          accept=".xlsx,.xls,.csv,text/csv,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
          className={styles.fileInput}
          onChange={(event) => void handleFiles(event.target.files)}
          ref={fileInputRef}
          type="file"
        />
        <div className={styles.dropIcon}>
          <UploadCloud size={24} />
        </div>
        <div className={styles.dropCopy}>
          <h2>Import Excel</h2>
          <p>{status.message}</p>
        </div>
        <span className={styles.secondaryButton}>Alege fisier</span>
      </section>

      {fileName ? (
        <section className={styles.importSummary}>
          <div className={styles.fileMeta}>
            <FileSpreadsheet size={18} />
            <div>
              <p className={styles.cardTitle}>{fileName}</p>
              <p className={styles.muted}>{rows.length} randuri detectate</p>
            </div>
          </div>
          <div className={styles.importActions}>
            <button
              className={styles.ghostButton}
              onClick={resetImport}
              type="button"
            >
              <X size={15} /> Sterge
            </button>
            <button
              className={styles.button}
              disabled={isImporting || !rows.length}
              onClick={() => void handleImport()}
              type="button"
            >
              {isImporting ? (
                <LoaderCircle className={styles.spinner} size={16} />
              ) : (
                <CheckCircle2 size={16} />
              )}
              Importa
            </button>
          </div>
        </section>
      ) : null}

      {status.tone === "error" ? (
        <p className={styles.importError}>
          <AlertCircle size={16} /> {status.message}
        </p>
      ) : null}

      {rows.length ? (
        <section className={styles.tableCard}>
          <div className={`${styles.tableHead} ${styles.importTable}`}>
            {previewColumns.map((column) => (
              <span key={column.key}>{column.label}</span>
            ))}
          </div>
          {rows.slice(0, 8).map((row, index) => (
            <div
              className={`${styles.tableRow} ${styles.importTable}`}
              key={index}
            >
              {previewColumns.map((column) => (
                <span key={column.key}>{String(row[column.key] ?? "-")}</span>
              ))}
            </div>
          ))}
        </section>
      ) : null}
    </div>
  );
}

function isImportFile(file: File) {
  const fileName = file.name.toLowerCase();

  return (
    file.type === "text/csv" ||
    fileName.endsWith(".csv") ||
    fileName.endsWith(".txt") ||
    fileName.endsWith(".xlsx") ||
    fileName.endsWith(".xls")
  );
}

async function parseImportFile(file: File): Promise<ImportLeadRow[]> {
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

function chunkRows(rows: ImportLeadRow[], batchSize: number) {
  const batches: ImportLeadRow[][] = [];

  for (let index = 0; index < rows.length; index += batchSize) {
    batches.push(rows.slice(index, index + batchSize));
  }

  return batches;
}

function toUsefulImportRow(row: ImportLeadRow): ImportLeadRow {
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

async function getImportErrorMessage(error: unknown) {
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
