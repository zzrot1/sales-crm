import type { ImportLeadRow } from "@/service-api/generated/models";

import { previewColumns } from "../../utils/import-helpers";
import styles from "../index.module.css";

export function ImportPreviewTable({ rows }: { rows: ImportLeadRow[] }) {
  if (!rows.length) {
    return null;
  }

  return (
    <section className={styles.tableCard}>
      <div className={`${styles.tableHead} ${styles.importTable}`}>
        {previewColumns.map((column) => (
          <span key={column.key}>{column.label}</span>
        ))}
      </div>
      {rows.slice(0, 8).map((row, index) => (
        <div className={`${styles.tableRow} ${styles.importTable}`} key={index}>
          {previewColumns.map((column) => (
            <span key={column.key}>{String(row[column.key] ?? "-")}</span>
          ))}
        </div>
      ))}
    </section>
  );
}
