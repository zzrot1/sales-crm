import { AlertCircle } from "lucide-react";

import type { ImportStatus } from "../../utils/import-helpers";
import styles from "../index.module.css";

export function ImportError({ status }: { status: ImportStatus }) {
  if (status.tone !== "error") {
    return null;
  }

  return (
    <p className={styles.importError}>
      <AlertCircle size={16} /> {status.message}
    </p>
  );
}
