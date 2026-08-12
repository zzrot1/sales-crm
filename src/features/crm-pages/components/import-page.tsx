"use client";

import styles from "./index.module.css";
import { useImportPage } from "../hooks/use-import-page";
import { ImportDropzone } from "./import/import-dropzone";
import { ImportError } from "./import/import-error";
import { ImportPreviewTable } from "./import/import-preview-table";
import { ImportSummary } from "./import/import-summary";

export function ImportPage() {
  const {
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
  } = useImportPage();

  return (
    <div className={styles.page}>
      <ImportDropzone
        fileInputRef={fileInputRef}
        isDragging={isDragging}
        statusMessage={status.message}
        onDraggingChange={setIsDragging}
        onFilesSelected={(files) => void handleFiles(files)}
      />

      <ImportSummary
        fileName={fileName}
        isImporting={isImporting}
        rowCount={rows.length}
        onImport={() => void handleImport()}
        onReset={resetImport}
      />

      <ImportError status={status} />

      <ImportPreviewTable rows={rows} />
    </div>
  );
}
