import type {
  ReportsActivityGranularityDto,
  ReportsPeriodDto,
} from "@/service-api/generated/models";

import { fromIsoDate, toIsoDate } from "@/features/crm-pages/utils/report-helpers";

export type ActivityRangeId = "7d" | "30d" | "3m";
export type ActivityMetric = "wonValue" | "callCount";

export const activityRanges: {
  id: ActivityRangeId;
  label: string;
  days: number;
  granularity: ReportsActivityGranularityDto;
}[] = [
  { id: "3m", label: "Ultimele 3 luni", days: 91, granularity: "week" },
  { id: "30d", label: "Ultimele 30 de zile", days: 30, granularity: "day" },
  { id: "7d", label: "Ultimele 7 zile", days: 7, granularity: "day" },
];

export const activityMetrics: { id: ActivityMetric; label: string }[] = [
  { id: "wonValue", label: "Valoare castigata" },
  { id: "callCount", label: "Call-uri inchise" },
];

function addDays(day: string, days: number) {
  const date = fromIsoDate(day);

  date.setDate(date.getDate() + days);

  return toIsoDate(date);
}

/** Ultimele `days` zile, inclusiv azi. */
export function getLastDaysPeriod(today: string, days: number): ReportsPeriodDto {
  return { from: addDays(today, -(days - 1)), to: today };
}

/**
 * Luna curenta pana azi si aceeasi bucata din luna trecuta (1–15 sept. fata de
 * 1–15 aug.), ca o luna abia inceputa sa nu para mereu in scadere.
 */
export function getMonthToDatePeriods(today: string) {
  const date = fromIsoDate(today);
  const year = date.getFullYear();
  const month = date.getMonth();
  const lastDayOfPreviousMonth = new Date(year, month, 0).getDate();

  return {
    current: { from: toIsoDate(new Date(year, month, 1)), to: today },
    previous: {
      from: toIsoDate(new Date(year, month - 1, 1)),
      to: toIsoDate(
        new Date(year, month - 1, Math.min(date.getDate(), lastDayOfPreviousMonth)),
      ),
    },
  };
}

export type Trend = {
  direction: "up" | "down" | "flat";
  label: string;
};

const percentFormatter = new Intl.NumberFormat("ro-RO", {
  maximumFractionDigits: 0,
  signDisplay: "exceptZero",
  style: "percent",
});

/** Schimbarea procentuala. Fara baza (luna trecuta 0) nu exista procent. */
export function getPercentTrend(current: number, previous: number): Trend | null {
  if (previous === 0) {
    return null;
  }

  const change = (current - previous) / previous;

  return {
    direction: change > 0 ? "up" : change < 0 ? "down" : "flat",
    label: percentFormatter.format(change),
  };
}

/** Diferenta intre doua rate (0–1), in puncte procentuale. */
export function getPointsTrend(current: number | null, previous: number | null): Trend | null {
  if (current === null || previous === null) {
    return null;
  }

  const points = Math.round((current - previous) * 100);

  return {
    direction: points > 0 ? "up" : points < 0 ? "down" : "flat",
    label: `${points > 0 ? "+" : ""}${points} pp`,
  };
}

const dayFormatter = new Intl.DateTimeFormat("ro-RO", { day: "numeric", month: "short" });
const weekdayFormatter = new Intl.DateTimeFormat("ro-RO", {
  day: "numeric",
  month: "short",
  weekday: "long",
});

/** Eticheta de pe axa: `7 sept.` */
export function formatBucketTick(start: string) {
  return dayFormatter.format(fromIsoDate(start));
}

/** Titlul din tooltip: `luni, 7 sept.` sau `7 sept. – 13 sept.` */
export function formatBucketTitle(start: string, granularity: ReportsActivityGranularityDto) {
  if (granularity === "day") {
    return weekdayFormatter.format(fromIsoDate(start));
  }

  return `${dayFormatter.format(fromIsoDate(start))} – ${dayFormatter.format(
    fromIsoDate(addDays(start, 6)),
  )}`;
}

/** Un capat rotund al axei Y (1, 2, 5 x 10^n), ca liniile ghid sa aiba valori citibile. */
export function getNiceMax(value: number) {
  if (value <= 0) {
    return 1;
  }

  const magnitude = 10 ** Math.floor(Math.log10(value));
  const step = [1, 2, 5, 10].find((candidate) => candidate * magnitude >= value) ?? 10;

  return step * magnitude;
}
