import { Download } from "lucide-react";
import type { ReactNode } from "react";

import styles from "../index.module.css";

type ReportSectionProps = {
  children: ReactNode;
  description: string;
  isExportDisabled?: boolean;
  onExport: () => void;
  title: string;
};

export function ReportSection({
  children,
  description,
  isExportDisabled,
  onExport,
  title,
}: ReportSectionProps) {
  return (
    <section className={`${styles.card} ${styles.reportSection}`}>
      <header className={styles.reportSectionHead}>
        <div>
          <h3 className={styles.cardTitle}>{title}</h3>
          <p className={styles.muted}>{description}</p>
        </div>
        <button
          aria-label={`Exporta "${title}" ca CSV`}
          className={styles.reportExportButton}
          disabled={isExportDisabled}
          onClick={onExport}
          type="button"
        >
          <Download aria-hidden="true" size={15} />
          CSV
        </button>
      </header>
      {children}
    </section>
  );
}

type ReportBarRowProps = {
  label: string;
  /** Latimea barei, 0–100. */
  width: number;
  value: string;
  detail?: string;
};

/** Un rand de grafic: eticheta, bara si valoarea scrisa, deci cifra nu depinde de culoare. */
export function ReportBarRow({ detail, label, value, width }: ReportBarRowProps) {
  return (
    <li className={styles.reportBarRow}>
      <span className={styles.reportBarLabel}>{label}</span>
      <span className={styles.reportBarTrack} aria-hidden="true">
        <span className={styles.reportBarFill} style={{ width: `${width}%` }} />
      </span>
      <span className={styles.reportBarValue}>
        {value}
        {detail ? <small>{detail}</small> : null}
      </span>
    </li>
  );
}

type ReportTableProps = {
  caption: string;
  headers: string[];
  rows: { key: string; cells: ReactNode[] }[];
};

/** Tabel real (`<table>`), ca cititoarele de ecran sa anunte randul si coloana. */
export function ReportTable({ caption, headers, rows }: ReportTableProps) {
  return (
    <div className={styles.reportTable}>
      <table className={styles.reportDataTable}>
        <caption className={styles.srOnly}>{caption}</caption>
        <thead>
          <tr>
            {headers.map((header) => (
              <th key={header} scope="col">
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.key}>
              {row.cells.map((cell, index) => (
                <td key={headers[index]}>{cell}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
