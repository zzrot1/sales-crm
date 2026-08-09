import {
  ArrowDownRight,
  ArrowUpRight,
  ChevronDown,
  Columns3,
  Plus,
} from "lucide-react";
import { SectionsDataTable } from "./sections-data-table";
import styles from "./index.module.css";

const stats = [
  {
    label: "Total Revenue",
    value: "$1,250.00",
    badge: "+12.5%",
    trend: "Trending up this month",
    detail: "Visitors for the last 6 months",
    positive: true,
  },
  {
    label: "New Customers",
    value: "1,234",
    badge: "-20%",
    trend: "Down 20% this period",
    detail: "Acquisition needs attention",
    positive: false,
  },
  {
    label: "Active Accounts",
    value: "45,678",
    badge: "+12.5%",
    trend: "Strong user retention",
    detail: "Engagement exceed targets",
    positive: true,
  },
  {
    label: "Growth Rate",
    value: "4.5%",
    badge: "+4.5%",
    trend: "Steady performance increase",
    detail: "Meets growth projections",
    positive: true,
  },
];

export function DashboardPage() {
  return (
    <div className={styles.dashboard}>
      <section className={styles.statsGrid}>
        {stats.map((stat) => (
          <article key={stat.label} className={styles.statCard}>
            <div className={styles.statHeader}>
              <span>{stat.label}</span>
              <span className={styles.badge}>
                {stat.positive ? <ArrowUpRight size={13} /> : <ArrowDownRight size={13} />}
                {stat.badge}
              </span>
            </div>
            <div className={styles.statValue}>{stat.value}</div>
            <div className={styles.statTrend}>
              {stat.trend}
              {stat.positive ? <ArrowUpRight size={15} /> : <ArrowDownRight size={15} />}
            </div>
            <p className={styles.statDetail}>{stat.detail}</p>
          </article>
        ))}
      </section>

      <section className={styles.chartCard}>
        <div className={styles.chartTop}>
          <div>
            <h2 className={styles.sectionTitle}>Total Visitors</h2>
            <p className={styles.sectionHint}>Total for the last 3 months</p>
          </div>
          <div className={styles.segmented}>
            <button type="button">Last 3 months</button>
            <button type="button">Last 30 days</button>
            <button className={styles.activeSegment} type="button">
              Last 7 days
            </button>
          </div>
        </div>

        <div className={styles.chart} aria-label="Total visitors chart">
          <svg preserveAspectRatio="none" viewBox="0 0 1000 260" role="img">
            <defs>
              <linearGradient id="visitor-fill" x1="0" x2="0" y1="0" y2="1">
                <stop offset="0%" stopColor="#f3f3f3" stopOpacity="0.72" />
                <stop offset="100%" stopColor="#f3f3f3" stopOpacity="0.06" />
              </linearGradient>
            </defs>
            <path
              d="M0 80 C130 215 240 210 360 140 C520 45 600 20 720 135 C840 250 910 205 1000 110 L1000 260 L0 260 Z"
              fill="url(#visitor-fill)"
            />
            <path
              d="M0 80 C130 215 240 210 360 140 C520 45 600 20 720 135 C840 250 910 205 1000 110"
              fill="none"
              stroke="#d7d7d7"
              strokeWidth="2"
            />
            <path
              d="M0 155 C155 245 265 230 430 175 C575 128 620 135 725 185 C840 240 920 225 1000 180"
              fill="none"
              stroke="#c9c9c9"
              strokeWidth="1.5"
            />
          </svg>
          <div className={styles.chartLabels}>
            {["Jun 24", "Jun 25", "Jun 26", "Jun 27", "Jun 28", "Jun 29", "Jun 30"].map(
              (label) => (
                <span key={label}>{label}</span>
              ),
            )}
          </div>
        </div>
      </section>

      <section className={styles.toolbar}>
        <div className={styles.tabs}>
          <button className={`${styles.pill} ${styles.pillActive}`} type="button">
            Outline
          </button>
          <button className={styles.pill} type="button">
            Past Performance <span className={styles.counter}>3</span>
          </button>
          <button className={styles.pill} type="button">
            Key Personnel <span className={styles.counter}>2</span>
          </button>
          <button className={styles.pill} type="button">
            Focus Documents
          </button>
        </div>
        <div className={styles.actions}>
          <button className={styles.action} type="button">
            <Columns3 size={14} /> Customize Columns <ChevronDown size={14} />
          </button>
          <button className={styles.action} type="button">
            <Plus size={14} /> Add Section
          </button>
        </div>
      </section>

      <SectionsDataTable />
    </div>
  );
}
