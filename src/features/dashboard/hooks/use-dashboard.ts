"use client";

import { keepPreviousData } from "@tanstack/react-query";
import { useState } from "react";

import { useToday } from "@/core/use-today";
import {
  useGetActivity,
  useGetSalesReport,
} from "@/service-api/generated/endpoints/reports/reports";

import {
  activityRanges,
  getLastDaysPeriod,
  getMonthToDatePeriods,
  type ActivityMetric,
  type ActivityRangeId,
} from "../utils/dashboard-helpers";

/**
 * Datele dashboard-ului: luna curenta fata de aceeasi bucata din luna trecuta
 * (pentru KPI-uri) si activitatea pe zile sau saptamani (pentru grafic). Toate
 * cererile asteapta ziua de azi a browserului, deci nu pleaca de pe server.
 */
export function useDashboard() {
  const today = useToday();
  const [rangeId, setRangeId] = useState<ActivityRangeId>("30d");
  const [metric, setMetric] = useState<ActivityMetric>("wonValue");

  const months = today ? getMonthToDatePeriods(today) : null;
  const range = activityRanges.find((option) => option.id === rangeId) ?? activityRanges[0];
  const activityPeriod = today ? getLastDaysPeriod(today, range.days) : null;

  const currentMonth = useGetSalesReport(months?.current, {
    query: { enabled: months !== null },
  });
  const previousMonth = useGetSalesReport(months?.previous, {
    query: { enabled: months !== null },
  });
  const activity = useGetActivity(
    activityPeriod ? { ...activityPeriod, granularity: range.granularity } : undefined,
    { query: { enabled: activityPeriod !== null, placeholderData: keepPreviousData } },
  );

  return {
    activity,
    currentMonth,
    metric,
    previousMonth,
    rangeId,
    setMetric,
    setRangeId,
  };
}
