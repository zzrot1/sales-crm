import { useRef, useState } from "react";

import { importLeads } from "@/service-api/generated/endpoints/companies/companies";
import type { ImportLeadRow } from "@/service-api/generated/models";

import {
  chunkRows,
  getImportErrorMessage,
  idleImportMessage,
  importBatchSize,
  isImportFile,
  parseImportFile,
  toUsefulImportRow,
  type ImportStatus,
} from "../utils/import-helpers";

export function useImportPage() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [fileName, setFileName] = useState("");
  const [rows, setRows] = useState<ImportLeadRow[]>([]);
  const [status, setStatus] = useState<ImportStatus>({
    tone: "idle",
    message: idleImportMessage,
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
      message: idleImportMessage,
    });

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  return {
    fileInputRef,
    fileName,
    handleFiles,
    handleImport,
    isDragging,
    isImporting,
    resetImport,
    rows,
    setIsDragging,
    status,
  };
}
