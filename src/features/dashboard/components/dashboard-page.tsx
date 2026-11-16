"use client";

import { useMemo, useState } from "react";

import { CompaniesDataTable } from "@/features/crm-pages/components/companies/companies-data-table";
import { CompanySegmentFilters } from "@/features/crm-pages/components/companies/company-segment-filters";
import { CompanySidePanel } from "@/features/crm-pages/components/companies/company-side-panel";
import crmStyles from "@/features/crm-pages/components/index.module.css";
import { useCompanySegments } from "@/features/crm-pages/hooks/use-company-segments";
import { useGetCompanies } from "@/service-api/generated/endpoints/companies/companies";
import {
  GetCompaniesSortBy,
  GetCompaniesSortOrder,
  type CompanyListItemDto,
} from "@/service-api/generated/models";

import styles from "./index.module.css";

/**
 * Lista de lucru pentru apeluri: companiile, impartite dupa marime si dupa
 * sunate / nesunate, cu cifrele ANAF pe fiecare rand. Indicatorii de vanzari
 * (castigat, rata de castig, grafic) stau pe pagina de rapoarte.
 */
export function DashboardPage() {
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(100);
  const [search, setSearch] = useState("");
  const [selectedCompany, setSelectedCompany] =
    useState<CompanyListItemDto | null>(null);
  const segments = useCompanySegments(() => setPage(1));

  const companiesQuery = useGetCompanies({
    page,
    limit,
    search: search.trim() || undefined,
    ...segments.params,
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

  return (
    <div className={styles.dashboard}>
      <section className={`${crmStyles.tableCard} ${styles.dashboardCompaniesTable}`}>
        <CompanySegmentFilters segments={segments} />
        <CompaniesDataTable
          companies={companies}
          emptyMessage={segments.emptyMessage}
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

      <CompanySidePanel
        company={selectedCompany}
        onOpenChange={(open) => {
          if (!open) setSelectedCompany(null);
        }}
      />
    </div>
  );
}
