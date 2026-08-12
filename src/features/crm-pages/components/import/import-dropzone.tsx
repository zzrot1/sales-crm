import type { RefObject } from "react";
import { UploadCloud } from "lucide-react";

import styles from "../index.module.css";

export function ImportDropzone({
  fileInputRef,
  isDragging,
  statusMessage,
  onFilesSelected,
  onDraggingChange,
}: {
  fileInputRef: RefObject<HTMLInputElement | null>;
  isDragging: boolean;
  statusMessage: string;
  onFilesSelected: (files: FileList | null) => void;
  onDraggingChange: (isDragging: boolean) => void;
}) {
  return (
    <section
      className={`${styles.dropzone} ${isDragging ? styles.dropzoneActive : ""}`}
      onClick={() => fileInputRef.current?.click()}
      onDragEnter={(event) => {
        event.preventDefault();
        onDraggingChange(true);
      }}
      onDragOver={(event) => {
        event.preventDefault();
        onDraggingChange(true);
      }}
      onDragLeave={(event) => {
        event.preventDefault();
        onDraggingChange(false);
      }}
      onDrop={(event) => {
        event.preventDefault();
        onDraggingChange(false);
        onFilesSelected(event.dataTransfer.files);
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
        onChange={(event) => onFilesSelected(event.target.files)}
        ref={fileInputRef}
        type="file"
      />
      <div className={styles.dropIcon}>
        <UploadCloud size={24} />
      </div>
      <div className={styles.dropCopy}>
        <h2>Import Excel</h2>
        <p>{statusMessage}</p>
      </div>
      <span className={styles.secondaryButton}>Alege fisier</span>
    </section>
  );
}
