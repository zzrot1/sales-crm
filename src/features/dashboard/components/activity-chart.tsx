"use client";

import { useState, type KeyboardEvent, type MouseEvent } from "react";

import type {
  ReportsActivityBucketDto,
  ReportsActivityGranularityDto,
} from "@/service-api/generated/models";
import { formatMoney } from "@/features/crm-pages/utils/report-helpers";

import {
  formatBucketTick,
  formatBucketTitle,
  getNiceMax,
  type ActivityMetric,
} from "../utils/dashboard-helpers";
import styles from "./index.module.css";

type ActivityChartProps = {
  buckets: ReportsActivityBucketDto[];
  granularity: ReportsActivityGranularityDto;
  metric: ActivityMetric;
};

/** Cel mult atatea etichete pe axa X; restul coloanelor raman fara, ca sa nu se suprapuna. */
const MAX_TICKS = 7;

function formatMetric(metric: ActivityMetric, value: number) {
  return metric === "wonValue" ? formatMoney(value) : `${value} call-uri`;
}

/** Valoarea scrisa langa liniile ghid: fara unitate la call-uri, ca sa ramana scurta. */
function formatAxisValue(metric: ActivityMetric, value: number) {
  return metric === "wonValue" ? formatMoney(value) : String(value);
}

/**
 * Coloane pe zi sau pe saptamana, pentru o singura serie. Valoarea exacta apare
 * la hover; tabelul ascuns vizual o da si cititoarelor de ecran.
 */
export function ActivityChart({ buckets, granularity, metric }: ActivityChartProps) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const values = buckets.map((bucket) => bucket[metric]);
  const max = getNiceMax(Math.max(0, ...values));
  // Call-urile sunt numere intregi: linia din mijloc apare doar cand pica pe un intreg.
  const gridRatios = metric === "callCount" && max % 2 !== 0 ? [1, 0] : [1, 0.5, 0];
  const tickStep = Math.ceil(buckets.length / MAX_TICKS);
  const active = activeIndex === null ? null : buckets[activeIndex];
  const isEmpty = values.every((value) => value === 0);

  // Coloana de sub mouse, din pozitie: toata suprafata graficului e zona de hover.
  const handleMouseMove = (event: MouseEvent<HTMLDivElement>) => {
    const { left, width } = event.currentTarget.getBoundingClientRect();
    const index = Math.floor(((event.clientX - left) / width) * buckets.length);

    setActiveIndex(Math.min(Math.max(index, 0), buckets.length - 1));
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const step = { ArrowLeft: -1, ArrowRight: 1 }[event.key];

    if (!step) {
      return;
    }

    event.preventDefault();
    setActiveIndex((current) => {
      // Prima apasare porneste de la capatul spre care merge sageata.
      const from = current ?? (step > 0 ? -1 : buckets.length);

      return Math.min(Math.max(from + step, 0), buckets.length - 1);
    });
  };

  return (
    <div className={styles.activityChart}>
      <div
        aria-label="Grafic de activitate. Foloseste sagetile stanga si dreapta pentru valori."
        className={styles.activityPlot}
        onBlur={() => setActiveIndex(null)}
        onKeyDown={handleKeyDown}
        onMouseLeave={() => setActiveIndex(null)}
        onMouseMove={handleMouseMove}
        role="group"
        tabIndex={0}
      >
        {gridRatios.map((ratio) => (
          <div
            aria-hidden="true"
            className={styles.activityGridLine}
            key={ratio}
            style={{ bottom: `${ratio * 100}%` }}
          >
            <span>{formatAxisValue(metric, max * ratio)}</span>
          </div>
        ))}

        <div aria-hidden="true" className={styles.activityColumns}>
          {buckets.map((bucket, index) => (
            <div
              className={styles.activityColumn}
              data-active={activeIndex === index || undefined}
              key={bucket.start}
            >
              <span
                className={styles.activityBar}
                style={{ height: `${(bucket[metric] / max) * 100}%` }}
              />
            </div>
          ))}
        </div>

        {active && activeIndex !== null ? (
          <div
            aria-live="polite"
            className={styles.activityTooltip}
            style={{ left: `${((activeIndex + 0.5) / buckets.length) * 100}%` }}
          >
            <strong>{formatBucketTitle(active.start, granularity)}</strong>
            <span>{formatMetric(metric, active[metric])}</span>
            {metric === "wonValue" ? <small>{active.wonCount} deal-uri castigate</small> : null}
          </div>
        ) : null}

        {isEmpty ? (
          <p className={styles.activityEmpty}>
            {metric === "wonValue"
              ? "Niciun deal castigat in aceasta perioada."
              : "Niciun call inchis in aceasta perioada."}
          </p>
        ) : null}
      </div>

      <div
        aria-hidden="true"
        className={styles.activityTicks}
        style={{ gridTemplateColumns: `repeat(${buckets.length}, minmax(0, 1fr))` }}
      >
        {buckets.map((bucket, index) => (
          <span key={bucket.start}>
            {index % tickStep === 0 ? formatBucketTick(bucket.start) : ""}
          </span>
        ))}
      </div>

      <table className={styles.srOnly}>
        <caption>
          {metric === "wonValue" ? "Valoare castigata" : "Call-uri inchise"}, pe{" "}
          {granularity === "day" ? "zi" : "saptamana"}
        </caption>
        <thead>
          <tr>
            <th scope="col">{granularity === "day" ? "Zi" : "Saptamana"}</th>
            <th scope="col">Valoare</th>
          </tr>
        </thead>
        <tbody>
          {buckets.map((bucket) => (
            <tr key={bucket.start}>
              <td>{formatBucketTitle(bucket.start, granularity)}</td>
              <td>{formatMetric(metric, bucket[metric])}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
