import { Plus } from "lucide-react";
import styles from "./index.module.css";

const columns = [
  {
    stage: "NEW",
    deals: [["Greenline Retail", "6.200 EUR"], ["Pilot Desk", "4.800 EUR"]],
  },
  {
    stage: "QUALIFIED",
    deals: [["Northstar Logistics", "28.000 EUR"]],
  },
  {
    stage: "PROPOSAL",
    deals: [["Atlas Medical", "14.500 EUR"], ["Vista Foods", "9.700 EUR"]],
  },
  {
    stage: "WON",
    deals: [["CorePay", "31.000 EUR"]],
  },
  {
    stage: "LOST",
    deals: [["Blue Harbor", "7.500 EUR"]],
  },
];

export function DealsPage() {
  return (
    <div className={styles.page}>
      <section className={styles.hero}>
        <div>
          <p className={styles.eyebrow}>Pipeline</p>
          <h2 className={styles.title}>Deal-uri</h2>
          <p className={styles.description}>
            Kanban pe stage pentru NEW, QUALIFIED, PROPOSAL, WON si LOST.
          </p>
        </div>
        <button className={styles.button} type="button">
          <Plus size={16} /> Deal
        </button>
      </section>

      <section className={styles.kanban} aria-label="Deal-uri pe stage">
        {columns.map((column) => (
          <div className={styles.column} key={column.stage}>
            <div className={styles.columnHeader}>
              <span>{column.stage}</span>
              <span>{column.deals.length}</span>
            </div>
            {column.deals.map(([name, value]) => (
              <article className={styles.dealCard} key={name}>
                <span className={styles.dealName}>{name}</span>
                <span className={styles.muted}>{value}</span>
              </article>
            ))}
          </div>
        ))}
      </section>
    </div>
  );
}
