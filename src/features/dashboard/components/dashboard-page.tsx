"use client";

import { ArrowDownRight, ArrowRight, ArrowUpRight } from "lucide-react";
import { useMemo, useState } from "react";

import { CompaniesDataTable } from "@/features/crm-pages/components/companies/companies-data-table";
import { formatMoney, formatPercent } from "@/features/crm-pages/utils/report-helpers";
import { useGetCompanies } from "@/service-api/generated/endpoints/companies/companies";
import {
  GetCompaniesSortBy,
  GetCompaniesSortOrder,
  type CompanyListItemDto,
} from "@/service-api/generated/models";
import crmStyles from "@/features/crm-pages/components/index.module.css";

import { useDashboard } from "../hooks/use-dashboard";
import {
  activityMetrics,
  activityRanges,
  getPercentTrend,
  getPointsTrend,
  type Trend,
} from "../utils/dashboard-helpers";
import { ActivityChart } from "./activity-chart";
import styles from "./index.module.css";

type Stat = {
  label: string;
  value: string;
  trend: Trend | null;
  /** Ce inseamna trendul, sau de ce lipseste. */
  trendText: string;
  detail: string;
};

const trendIcons = {
  down: ArrowDownRight,
  flat: ArrowRight,
  up: ArrowUpRight,
};

function StatCard({ stat }: { stat: Stat }) {
  const TrendIcon = stat.trend ? trendIcons[stat.trend.direction] : null;

  return (
    <article className={styles.statCard}>
      <div className={styles.statHeader}>
        <span>{stat.label}</span>
        {stat.trend && TrendIcon ? (
          <span className={styles.badge}>
            <TrendIcon aria-hidden="true" size={13} />
            {stat.trend.label}
          </span>
        ) : null}
      </div>
      <div className={styles.statValue}>{stat.value}</div>
      <div className={styles.statTrend}>{stat.trendText}</div>
      <p className={styles.statDetail}>{stat.detail}</p>
    </article>
  );
}

export function DashboardPage() {
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(100);
  const [search, setSearch] = useState("");
  const [selectedCompany, setSelectedCompany] =
    useState<CompanyListItemDto | null>(null);
  const { activity, currentMonth, metric, previousMonth, rangeId, setMetric, setRangeId } =
    useDashboard();

  const companiesQuery = useGetCompanies({
    page,
    limit,
    search: search.trim() || undefined,
    sortBy: GetCompaniesSortBy.createdAt,
    sortOrder: GetCompaniesSortOrder.desc,
  });

  const pageData = companiesQuery.data;
  const companies = useMemo(() => pageData?.data ?? [], [pageData?.data]);
  const total = pageData?.total ?? 0;
  const totalPages = Math.max(pageData?.totalPages ?? 1, 1);

  const goToPage = (nextPage: number) => {
    setPage(Math.min(Math.max(nextPage, 1), totalPages));
  };

  const handleLimitChange = (nextLimit: number) => {
    setLimit(nextLimit);
    setPage(1);
  };

  const handleSearchChange = (value: string) => {
    setSearch(value);
    setPage(1);
  };

  const current = currentMonth.data?.totals;
  const previous = previousMonth.data?.totals;
  const comparedTo = "fata de aceeasi perioada din luna trecuta";
  const stats: Stat[] =
    current && previous
      ? [
          {
            label: "Castigat luna aceasta",
            value: formatMoney(current.wonValue),
            trend: getPercentTrend(current.wonValue, previous.wonValue),
            trendText: previous.wonValue ? comparedTo : "Luna trecuta: nimic castigat",
            detail: `Luna trecuta: ${formatMoney(previous.wonValue)}`,
          },
          {
            label: "Deal-uri castigate",
            value: String(current.wonCount),
            trend: getPercentTrend(current.wonCount, previous.wonCount),
            trendText: previous.wonCount ? comparedTo : "Luna trecuta: niciun deal",
            detail: `Medie pe deal: ${
              current.averageWonValue === null ? "—" : formatMoney(current.averageWonValue)
            }`,
          },
          {
            label: "Rata de castig",
            value: formatPercent(current.winRate),
            trend: getPointsTrend(current.winRate, previous.winRate),
            trendText:
              current.winRate === null
                ? "Niciun deal inchis luna aceasta"
                : previous.winRate === null
                  ? "Luna trecuta: niciun deal inchis"
                  : comparedTo,
            detail: `${current.wonCount} castigate din ${
              current.wonCount + current.lostCount
            } inchise`,
          },
          {
            label: "Pipeline activ",
            value: formatMoney(current.openValue),
            trend: null,
            trendText: "Situatia de acum",
            detail: `${current.openCount} deal-uri deschise`,
          },
        ]
      : [];
  const isStatsError = currentMonth.isError || previousMonth.isError;

  const range = activityRanges.find((option) => option.id === rangeId) ?? activityRanges[0];
  const metricLabel =
    activityMetrics.find((option) => option.id === metric)?.label ?? activityMetrics[0].label;

  return (
    <div className={styles.dashboard}>
      {isStatsError ? (
        <p className={crmStyles.formError} role="alert">
          Nu am putut incarca indicatorii lunii.
        </p>
      ) : stats.length ? (
        <section className={styles.statsGrid} aria-label="Indicatorii lunii">
          {stats.map((stat) => (
            <StatCard key={stat.label} stat={stat} />
          ))}
        </section>
      ) : (
        <section className={styles.statsGrid} aria-busy="true" aria-label="Indicatorii lunii">
          {[0, 1, 2, 3].map((index) => (
            <div className={`${styles.statCard} ${styles.statSkeleton}`} key={index} />
          ))}
        </section>
      )}

      <section className={styles.chartCard}>
        <div className={styles.chartTop}>
          <div>
            <h2 className={styles.sectionTitle}>{metricLabel}</h2>
            <p className={styles.sectionHint}>
              {range.label}, pe {range.granularity === "day" ? "zile" : "saptamani"}
            </p>
          </div>
          <div className={styles.chartControls}>
            <div className={styles.segmented} role="group" aria-label="Ce arata graficul">
              {activityMetrics.map((option) => (
                <button
                  aria-pressed={metric === option.id}
                  className={metric === option.id ? styles.activeSegment : undefined}
                  key={option.id}
                  onClick={() => setMetric(option.id)}
                  type="button"
                >
                  {option.label}
                </button>
              ))}
            </div>
            <div className={styles.segmented} role="group" aria-label="Perioada graficului">
              {activityRanges.map((option) => (
                <button
                  aria-pressed={rangeId === option.id}
                  className={rangeId === option.id ? styles.activeSegment : undefined}
                  key={option.id}
                  onClick={() => setRangeId(option.id)}
                  type="button"
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {activity.isError ? (
          <p className={crmStyles.formError} role="alert">
            Nu am putut incarca activitatea.
          </p>
        ) : activity.data ? (
          <div
            aria-busy={activity.isFetching}
            className={activity.isPlaceholderData ? styles.chartRefreshing : undefined}
          >
            <ActivityChart
              buckets={activity.data.buckets}
              granularity={activity.data.granularity}
              metric={metric}
            />
          </div>
        ) : (
          <div className={styles.chartSkeleton} aria-busy="true" />
        )}
      </section>

      <section className={`${crmStyles.tableCard} ${styles.dashboardCompaniesTable}`}>
        <CompaniesDataTable
          companies={companies}
          isError={companiesQuery.isError}
          isFetching={companiesQuery.isFetching}
          isLoading={companiesQuery.isLoading}
          onSelectCompany={setSelectedCompany}
          pagination={{
            isDisabled: companiesQuery.isFetching,
            onPageChange: goToPage,
            onPageSizeChange: handleLimitChange,
            page,
            pageSize: limit,
            pageSizeLabel: "Randuri pe pagina",
            pageSizeOptions: [10, 25, 50, 100],
            rowsLabel: `${total} compan${total === 1 ? "ie" : "ii"} in total`,
            total,
            totalPages,
          }}
          search={{
            onChange: handleSearchChange,
            placeholder: "Cauta companii...",
            value: search,
          }}
          selectedCompanyId={selectedCompany?.id ?? null}
        />
      </section>
    </div>
  );
}
