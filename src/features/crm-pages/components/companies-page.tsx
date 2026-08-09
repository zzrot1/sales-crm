"use client";

import {
  Building2,
  ExternalLink,
} from "lucide-react";
import { type ComponentProps, useMemo, useState } from "react";

import { DataTable, type DataTableColumn } from "@/components/data-table";
import { SidePanel } from "@/components/side-panel/side-panel";
import { useGetCompanies } from "@/service-api/generated/endpoints/companies/companies";
import {
  GetCompaniesSortBy,
  GetCompaniesSortOrder,
  type CompanyListItemDto,
} from "@/service-api/generated/models";
import styles from "./index.module.css";

const pageSizeOptions = [10, 25, 50, 100];

export function CompaniesPage() {
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(100);
  const [search, setSearch] = useState("");
  const [selectedCompany, setSelectedCompany] =
    useState<CompanyListItemDto | null>(null);

  const companiesQuery = useGetCompanies({
    page,
    limit,
    search: search.trim() || undefined,
    sortBy: GetCompaniesSortBy.createdAt,
    sortOrder: GetCompaniesSortOrder.desc,
  });

  const pageData = companiesQuery.data?.data;
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
    <div className={styles.page}>
      <section className={styles.tableCard}>
        <CompaniesDataTable
          companies={companies}
          isError={companiesQuery.isError}
          isFetching={companiesQuery.isFetching}
          isLoading={companiesQuery.isLoading}
          onSelectCompany={setSelectedCompany}
          selectedCompanyId={selectedCompany?.id ?? null}
          pagination={{
            isDisabled: companiesQuery.isFetching,
            onPageChange: goToPage,
            onPageSizeChange: handleLimitChange,
            page,
            pageSize: limit,
            pageSizeLabel: "Randuri pe pagina",
            pageSizeOptions,
            rowsLabel: `${total} compan${total === 1 ? "ie" : "ii"} in total`,
            total,
            totalPages,
          }}
          search={{
            onChange: handleSearchChange,
            placeholder: "Cauta companii...",
            value: search,
          }}
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

function CompaniesDataTable({
  companies,
  isError,
  isFetching,
  isLoading,
  onSelectCompany,
  pagination,
  search,
  selectedCompanyId,
}: {
  companies: CompanyListItemDto[];
  isError: boolean;
  isFetching: boolean;
  isLoading: boolean;
  onSelectCompany: (company: CompanyListItemDto) => void;
  pagination: ComponentProps<typeof DataTable<CompanyListItemDto>>["pagination"];
  search: ComponentProps<typeof DataTable<CompanyListItemDto>>["search"];
  selectedCompanyId: string | null;
}) {
  const columns = useMemo<DataTableColumn<CompanyListItemDto>[]>(
    () => [
      {
        id: "company",
        header: "Companie",
        cell: (company) => (
          <div className={styles.companyCell}>
            <span>{company.name}</span>
            {company.website ? <small>{company.website}</small> : null}
          </div>
        ),
      },
      {
        canCollapse: true,
        id: "industry",
        header: "Industrie",
        cell: (company) => fallback(company.industry),
      },
      {
        canCollapse: true,
        id: "contact",
        header: "Contact",
        cell: (company) => (
          <div className={styles.companyCell}>
            <span>{fallback(company.primaryContactName)}</span>
            {company.primaryContactJobTitle ? (
              <small>{company.primaryContactJobTitle}</small>
            ) : null}
          </div>
        ),
      },
      {
        canCollapse: true,
        id: "email",
        header: "Email",
        cell: (company) => fallback(company.primaryContactEmail),
      },
      {
        canCollapse: true,
        id: "phone",
        header: "Telefon",
        cell: (company) => fallback(company.primaryContactPhone),
      },
      {
        canCollapse: true,
        id: "itTeam",
        header: "Echipa IT",
        cell: (company) => (
          <span className={styles.status}>{formatItTeam(company.hasItTeam)}</span>
        ),
      },
    ],
    [],
  );

  return (
    <DataTable
      columns={columns}
      data={companies}
      emptyMessage="Nu exista companii importate inca."
      getRowId={(company) => company.id}
      hasCollapsedColumns
      hasFixedColumns
      hasPagination
      isError={isError}
      isLoading={isLoading}
      loadingMessage="Se incarca companiile..."
      minWidth="58rem"
      onRowClick={onSelectCompany}
      pagination={pagination}
      rowState={(company) =>
        selectedCompanyId === company.id
          ? "selected"
          : isFetching
            ? "muted"
            : undefined
      }
      search={search}
    />
  );
}

function CompanySidePanel({
  company,
  onOpenChange,
}: {
  company: CompanyListItemDto | null;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <SidePanel
      description={company?.industry ?? undefined}
      onOpenChange={onOpenChange}
      open={Boolean(company)}
      title={company?.name ?? "Companie"}
    >
      {company ? (
        <div className={styles.sidePanelContent}>
          <div className={styles.sidePanelIcon}>
            <Building2 size={20} />
          </div>

          <section className={styles.sidePanelSection}>
            <h3>Contact principal</h3>
            <div className={styles.detailsList}>
              <DetailRow
                label="Nume"
                value={fallback(company.primaryContactName)}
              />
              <DetailRow
                label="Functie"
                value={fallback(company.primaryContactJobTitle)}
              />
              <DetailRow
                label="Email"
                value={fallback(company.primaryContactEmail)}
              />
              <DetailRow
                label="Telefon"
                value={fallback(company.primaryContactPhone)}
              />
            </div>
          </section>

          <section className={styles.sidePanelSection}>
            <h3>Companie</h3>
            <div className={styles.detailsList}>
              <DetailRow label="Industrie" value={fallback(company.industry)} />
              <DetailRow
                label="Echipa IT"
                value={formatItTeam(company.hasItTeam)}
              />
              <DetailRow label="Website" value={fallback(company.website)} />
            </div>
          </section>

          {company.website ? (
            <a
              className={styles.panelLink}
              href={normalizeWebsiteUrl(company.website)}
              rel="noreferrer"
              target="_blank"
            >
              Deschide website <ExternalLink size={15} />
            </a>
          ) : null}

          <section className={styles.sidePanelSection}>
            <h3>Note</h3>
            <p className={styles.panelNotes}>
              {company.notes || "Nu exista note pentru aceasta companie."}
            </p>
          </section>
        </div>
      ) : null}
    </SidePanel>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className={styles.detailItem}>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function fallback(value?: string | null) {
  return value?.trim() || "-";
}

function formatItTeam(value: boolean | null) {
  if (value === true) return "Da";
  if (value === false) return "Nu";
  return "Necunoscut";
}

function normalizeWebsiteUrl(value: string) {
  return /^https?:\/\//i.test(value) ? value : `https://${value}`;
}
