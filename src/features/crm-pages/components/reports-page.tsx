import styles from "./index.module.css";

const reports = [
  ["Deal-uri castigate", "Iulie", "43.000 EUR", "CSV"],
  ["Pipeline activ", "August", "62.900 EUR", "CSV"],
  ["Conversie pe stage", "Q3", "31%", "CSV"],
];

export function ReportsPage() {
  return (
    <div className={styles.page}>
      <section className={styles.hero}>
        <div>
          <p className={styles.eyebrow}>Export</p>
          <h2 className={styles.title}>Rapoarte</h2>
          <p className={styles.description}>
            Rapoarte simple pentru export CSV cu deal-urile castigate lunar si
            pipeline-ul activ.
          </p>
        </div>
      </section>

      <section className={styles.tableCard}>
        <div className={`${styles.tableHead} ${styles.reportsTable}`}>
          <span>Raport</span>
          <span>Perioada</span>
          <span>Valoare</span>
          <span>Export</span>
        </div>
        {reports.map(([name, period, value, exportType]) => (
          <div className={`${styles.tableRow} ${styles.reportsTable}`} key={name}>
            <span>{name}</span>
            <span>{period}</span>
            <span>{value}</span>
            <span>{exportType}</span>
          </div>
        ))}
      </section>
    </div>
  );
}
