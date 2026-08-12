import {
  CheckCircle2,
  FileSpreadsheet,
  LoaderCircle,
  X,
} from "lucide-react";

import styles from "../index.module.css";

export function ImportSummary({
  fileName,
  isImporting,
  rowCount,
  onImport,
  onReset,
}: {
  fileName: string;
  isImporting: boolean;
  rowCount: number;
  onImport: () => void;
  onReset: () => void;
}) {
  if (!fileName) {
    return null;
  }

  return (
    <section className={styles.importSummary}>
      <div className={styles.fileMeta}>
        <FileSpreadsheet size={18} />
        <div>
          <p className={styles.cardTitle}>{fileName}</p>
          <p className={styles.muted}>{rowCount} randuri detectate</p>
        </div>
      </div>
      <div className={styles.importActions}>
        <button className={styles.ghostButton} onClick={onReset} type="button">
          <X size={15} /> Sterge
        </button>
        <button
          className={styles.button}
          disabled={isImporting || !rowCount}
          onClick={onImport}
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
  );
}
