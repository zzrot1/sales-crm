"use client";

import { useReportsPage } from "../hooks/use-reports-page";
import { outcomeByValue } from "./tasks/task-helpers";
import { dealStageLabels } from "../utils/deal-helpers";
import {
  barWidth,
  formatLostReason,
  formatMoney,
  formatMonth,
  formatPercent,
  formatReportDate,
  MIN_REPORT_DATE,
  reportPresets,
} from "../utils/report-helpers";
import { ReportBarRow, ReportSection, ReportTable } from "./reports/report-section";
import styles from "./index.module.css";

export function ReportsPage() {
  const {
    changePeriod,
    exportCsv,
    fields,
    periodError,
    preset,
    report,
    reportsDataPage,
    selectPreset,
  } = useReportsPage();

  const totals = report?.totals;
  const isRefreshing = reportsDataPage.isFetching || reportsDataPage.isShowingPreviousPeriod;
  const isExportDisabled = !report || isRefreshing;
  const periodLabel = report
    ? `${formatReportDate(report.period.from)} – ${formatReportDate(report.period.to)}`
    : "";

  const stats = totals
    ? [
        {
          label: "Castigat in perioada",
          value: formatMoney(totals.wonValue),
          detail: `${totals.wonCount} deal-uri · medie ${
            totals.averageWonValue === null ? "—" : formatMoney(totals.averageWonValue)
          }`,
        },
        {
          label: "Rata de castig",
          value: formatPercent(totals.winRate),
          detail: `${totals.wonCount} castigate din ${totals.wonCount + totals.lostCount} inchise`,
        },
        {
          label: "Pierdut in perioada",
          value: formatMoney(totals.lostValue),
          detail: `${totals.lostCount} deal-uri`,
        },
        {
          label: "Pipeline activ acum",
          value: formatMoney(totals.openValue),
          detail: `${totals.openCount} deal-uri deschise`,
        },
      ]
    : [];

  return (
    <div className={styles.page}>
      <section className={styles.hero}>
        <div>
          <p className={styles.eyebrow}>Export</p>
          <h2 className={styles.title}>Rapoarte</h2>
          <p className={styles.description}>
            Deal-urile tale castigate si pierdute in perioada aleasa, pipeline-ul activ si
            rezultatele call-urilor. Fiecare raport se exporta separat in CSV.
          </p>
        </div>
      </section>

      <section className={styles.reportFilters} aria-label="Perioada raportului">
        <div className={styles.reportPresets} role="group" aria-label="Perioade rapide">
          {reportPresets.map((option) => (
            <button
              aria-pressed={preset === option.id}
              className={preset === option.id ? styles.reportPresetActive : undefined}
              key={option.id}
              onClick={() => selectPreset(option.id)}
              type="button"
            >
              {option.label}
            </button>
          ))}
        </div>

        <label className={styles.dealFilterField}>
          <span>De la</span>
          <input
            aria-invalid={Boolean(periodError)}
            disabled={!fields}
            min={MIN_REPORT_DATE}
            type="date"
            value={fields?.from ?? ""}
            onChange={(event) => changePeriod("from", event.target.value)}
          />
        </label>

        <label className={styles.dealFilterField}>
          <span>Pana la</span>
          <input
            aria-invalid={Boolean(periodError)}
            disabled={!fields}
            min={MIN_REPORT_DATE}
            type="date"
            value={fields?.to ?? ""}
            onChange={(event) => changePeriod("to", event.target.value)}
          />
        </label>

        {periodError ? (
          <p className={`${styles.formError} ${styles.reportPeriodError}`} role="alert">
            {periodError}
          </p>
        ) : null}
      </section>

      {reportsDataPage.isError ? (
        // Fara cifrele perioadei anterioare: ar parea ca apartin perioadei alese acum.
        <p className={styles.formError} role="alert">
          Nu am putut incarca raportul pentru perioada aleasa. Incearca din nou.
        </p>
      ) : null}

      {!report && !reportsDataPage.isError ? (
        <p className={styles.muted} role="status">
          Se incarca raportul...
        </p>
      ) : null}

      {report && totals && !reportsDataPage.isError ? (
        <div
          aria-busy={isRefreshing}
          className={`${styles.reportsBody} ${isRefreshing ? styles.reportsRefreshing : ""}`}
        >
          <p className={styles.muted} role="status">
            {isRefreshing
              ? `Se actualizeaza raportul. Afisat acum: ${periodLabel}.`
              : `Raport pentru ${periodLabel}.`}
          </p>

          <section className={styles.reportStats}>
            {stats.map((stat) => (
              <article className={styles.card} key={stat.label}>
                <p className={styles.eyebrow}>{stat.label}</p>
                <div className={styles.statValue}>{stat.value}</div>
                <p className={styles.muted}>{stat.detail}</p>
              </article>
            ))}
          </section>

          <div className={styles.reportGrid}>
            <ReportSection
              description="Valoarea deal-urilor castigate, pe luna in care au trecut in Won."
              isExportDisabled={isExportDisabled}
              onExport={() => exportCsv("wonByMonth")}
              title="Deal-uri castigate pe luna"
            >
              <ul className={styles.reportBars}>
                {report.wonByMonth.map((row) => (
                  <ReportBarRow
                    detail={`${row.count} deal-uri`}
                    key={row.month}
                    label={formatMonth(row.month)}
                    value={formatMoney(row.value)}
                    width={barWidth(row.value, reportsDataPage.getMaxMonthValue())}
                  />
                ))}
              </ul>
            </ReportSection>

            <ReportSection
              description="Deal-urile deschise in acest moment, indiferent de perioada aleasa."
              isExportDisabled={isExportDisabled}
              onExport={() => exportCsv("pipelineByStage")}
              title="Pipeline activ pe stage"
            >
              <ul className={styles.reportBars}>
                {report.pipelineByStage.map((row) => (
                  <ReportBarRow
                    detail={`${row.count} deal-uri`}
                    key={row.stage}
                    label={dealStageLabels[row.stage]}
                    value={formatMoney(row.value)}
                    width={barWidth(row.value, reportsDataPage.getMaxStageValue())}
                  />
                ))}
              </ul>
            </ReportSection>

            <ReportSection
              description="Call-urile inchise de tine in perioada, dupa rezultat."
              isExportDisabled={isExportDisabled}
              onExport={() => exportCsv("callOutcomes")}
              title="Rezultatele call-urilor"
            >
              <ul className={styles.reportBars}>
                {report.callOutcomes.map((row) => (
                  <ReportBarRow
                    key={row.outcome}
                    label={outcomeByValue[row.outcome]?.label ?? row.outcome}
                    value={String(row.count)}
                    width={barWidth(row.count, reportsDataPage.getMaxOutcomeCount())}
                  />
                ))}
              </ul>
            </ReportSection>

            <ReportSection
              description="De ce s-au pierdut deal-urile inchise in perioada (cele mai dese 20)."
              isExportDisabled={isExportDisabled || report.lostReasons.length === 0}
              onExport={() => exportCsv("lostReasons")}
              title="Motive de pierdere"
            >
              {report.lostReasons.length ? (
                <ReportTable
                  caption="Motive de pierdere"
                  headers={["Motiv", "Deal-uri", "Valoare"]}
                  rows={report.lostReasons.map((row) => ({
                    key: row.reason ?? "",
                    cells: [formatLostReason(row.reason), row.count, formatMoney(row.value)],
                  }))}
                />
              ) : (
                <p className={styles.kanbanEmpty}>Niciun deal pierdut in perioada aleasa.</p>
              )}
            </ReportSection>
          </div>

          <ReportSection
            description="Lista completa, pentru facturare sau raportare catre management."
            isExportDisabled={isExportDisabled || report.wonDeals.length === 0}
            onExport={() => exportCsv("wonDeals")}
            title="Deal-uri castigate"
          >
            {report.wonDeals.length ? (
              <>
                {reportsDataPage.isWonDealsListCut ? (
                  <p className={styles.muted}>
                    Sunt afisate cele mai recente {report.wonDeals.length} din{" "}
                    {totals.wonCount} deal-uri. Alege o perioada mai scurta pentru lista
                    completa.
                  </p>
                ) : null}
                <ReportTable
                  caption="Deal-uri castigate"
                  headers={["Deal", "Companie", "Inchis la", "Valoare"]}
                  rows={report.wonDeals.map((deal) => ({
                    key: deal.id,
                    cells: [
                      deal.title,
                      deal.companyName,
                      formatReportDate(deal.closedOn),
                      formatMoney(deal.value),
                    ],
                  }))}
                />
              </>
            ) : (
              <p className={styles.kanbanEmpty}>
                Niciun deal castigat in perioada aleasa. Alege o perioada mai lunga sau
                muta un deal in coloana Won.
              </p>
            )}
          </ReportSection>
        </div>
      ) : null}
    </div>
  );
}
