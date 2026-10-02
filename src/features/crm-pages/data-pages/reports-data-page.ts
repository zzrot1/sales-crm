import { DataPage } from "orval-data-handler";

import type { SalesReportDto } from "@/service-api/generated/models";

import { outcomeByValue } from "../components/tasks/task-helpers";
import { dealStageLabels } from "../utils/deal-helpers";
import { formatLostReason, formatMonth, type CsvTable } from "../utils/report-helpers";

export type ReportExportId =
  | "wonByMonth"
  | "pipelineByStage"
  | "lostReasons"
  | "callOutcomes"
  | "wonDeals";

/**
 * Pagina de rapoarte, pe partea de date. Raspunsul e un singur obiect agregat pe
 * server, deci aici stau doar derivarile pentru grafice si exporturile CSV.
 */
export class ReportsDataPage extends DataPage<SalesReportDto> {
  get report(): SalesReportDto | undefined {
    return this.query.data;
  }

  /** Pe ecran e inca raportul perioadei anterioare, pana vine cel nou. */
  get isShowingPreviousPeriod() {
    return this.query.isPlaceholderData;
  }

  /** Serverul trimite cel mult 500 de deal-uri castigate; totalul e mereu complet. */
  get isWonDealsListCut() {
    const report = this.report;

    return Boolean(report && report.wonDeals.length < report.totals.wonCount);
  }

  getMaxMonthValue() {
    return Math.max(0, ...(this.report?.wonByMonth.map((row) => row.value) ?? []));
  }

  getMaxStageValue() {
    return Math.max(0, ...(this.report?.pipelineByStage.map((row) => row.value) ?? []));
  }

  getMaxOutcomeCount() {
    return Math.max(0, ...(this.report?.callOutcomes.map((row) => row.count) ?? []));
  }

  /** Tabelul exportat pentru o sectiune. Valorile raman numere, ca sa poata fi calculate in Excel. */
  getCsvTable(exportId: ReportExportId): CsvTable | null {
    const report = this.report;

    if (!report) {
      return null;
    }

    const suffix = `${report.period.from}_${report.period.to}`;

    switch (exportId) {
      case "wonByMonth":
        return {
          fileName: `deal-uri-castigate-pe-luna_${suffix}.csv`,
          headers: ["Luna", "Deal-uri castigate", "Valoare (EUR)"],
          rows: report.wonByMonth.map((row) => [formatMonth(row.month), row.count, row.value]),
        };
      case "pipelineByStage":
        return {
          fileName: `pipeline-activ_${report.period.to}.csv`,
          headers: ["Stage", "Deal-uri", "Valoare (EUR)"],
          rows: report.pipelineByStage.map((row) => [
            dealStageLabels[row.stage],
            row.count,
            row.value,
          ]),
        };
      case "lostReasons":
        return {
          fileName: `motive-pierdere_${suffix}.csv`,
          headers: ["Motiv", "Deal-uri", "Valoare (EUR)"],
          rows: report.lostReasons.map((row) => [
            formatLostReason(row.reason),
            row.count,
            row.value,
          ]),
        };
      case "callOutcomes":
        return {
          fileName: `rezultate-call-uri_${suffix}.csv`,
          headers: ["Rezultat", "Call-uri"],
          rows: report.callOutcomes.map((row) => [
            outcomeByValue[row.outcome]?.label ?? row.outcome,
            row.count,
          ]),
        };
      case "wonDeals":
        return {
          fileName: `deal-uri-castigate_${suffix}.csv`,
          headers: ["Deal", "Companie", "Data inchiderii", "Valoare (EUR)"],
          rows: report.wonDeals.map((deal) => [
            deal.title,
            deal.companyName,
            deal.closedOn,
            deal.value,
          ]),
        };
      default: {
        const unknownExport: never = exportId;

        console.warn(`Export necunoscut: ${String(unknownExport)}`);
        return null;
      }
    }
  }
}
