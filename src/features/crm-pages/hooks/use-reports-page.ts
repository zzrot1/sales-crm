"use client";

import { keepPreviousData } from "@tanstack/react-query";
import { useState } from "react";
import { useDataPage } from "orval-data-handler";

import { useToday } from "@/core/use-today";
import { useGetSalesReport } from "@/service-api/generated/endpoints/reports/reports";

import { ReportsDataPage, type ReportExportId } from "../data-pages/reports-data-page";
import {
  downloadCsv,
  fromIsoDate,
  getPeriodError,
  getPresetPeriod,
  type ReportPeriod,
  type ReportPresetId,
} from "../utils/report-helpers";

type Preset = Exclude<ReportPresetId, "custom">;

const DEFAULT_PRESET: Preset = "last6Months";

export function useReportsPage() {
  const today = useToday();
  const [preset, setPreset] = useState<ReportPresetId>(DEFAULT_PRESET);
  const [customPeriod, setCustomPeriod] = useState<ReportPeriod | null>(null);
  // Ce e scris in campurile de data. Pleaca la server doar cand formeaza o
  // perioada valida, nu la fiecare cifra tastata.
  const [draft, setDraft] = useState<ReportPeriod | null>(null);

  const period =
    preset === "custom"
      ? customPeriod
      : today
        ? getPresetPeriod(preset, fromIsoDate(today))
        : null;

  // Perioada schimbata pastreaza raportul vechi pe ecran pana vine cel nou,
  // in loc sa goleasca pagina la fiecare click.
  const reportsDataPage = useDataPage(
    ReportsDataPage,
    useGetSalesReport(period ?? undefined, {
      query: { enabled: period !== null, placeholderData: keepPreviousData },
    }),
  );

  const selectPreset = (nextPreset: Preset) => {
    setPreset(nextPreset);
    setDraft(null);
  };

  const changePeriod = (field: keyof ReportPeriod, value: string) => {
    const current = draft ?? period;

    if (!current) {
      return;
    }

    const next = { ...current, [field]: value };

    setDraft(next);

    if (!getPeriodError(next)) {
      setPreset("custom");
      setCustomPeriod(next);
    }
  };

  const exportCsv = (exportId: ReportExportId) => {
    const table = reportsDataPage.getCsvTable(exportId);

    if (table) {
      downloadCsv(table);
    }
  };

  return {
    changePeriod,
    exportCsv,
    fields: draft ?? period,
    periodError: draft ? getPeriodError(draft) : null,
    preset,
    report: reportsDataPage.report,
    reportsDataPage,
    selectPreset,
  };
}
