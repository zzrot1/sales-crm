import { type ComponentProps, useMemo } from "react";
import { Edit3 } from "lucide-react";

import { DataTable, type DataTableColumn } from "@/components/data-table";
import { CompanyStatusDto, type CompanyListItemDto } from "@/service-api/generated/models";

import styles from "../index.module.css";
import {
  companyStatusLabels,
  fallback,
  formatItTeam,
} from "../../utils/company-helpers";
import { CompanyStatusBadge } from "./company-status-badge";

type CompaniesDataTableProps = {
  companies: CompanyListItemDto[];
  isError: boolean;
  isFetching: boolean;
  isLoading: boolean;
  onEditCompany?: (company: CompanyListItemDto) => void;
  onSelectCompany: (company: CompanyListItemDto) => void;
  pagination: ComponentProps<typeof DataTable<CompanyListItemDto>>["pagination"];
  search: ComponentProps<typeof DataTable<CompanyListItemDto>>["search"];
  selectedCompanyId: string | null;
};

export function CompaniesDataTable({
  companies,
  isError,
  isFetching,
  isLoading,
  onEditCompany,
  onSelectCompany,
  pagination,
  search,
  selectedCompanyId,
}: CompaniesDataTableProps) {
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
        filter: {
          getValue: (company) => company.industry,
          placeholder: "Toate industriile",
          type: "select",
        },
        cell: (company) => fallback(company.industry),
      },
      {
        canCollapse: true,
        id: "contact",
        header: "Contact",
        filter: {
          getValue: (company) =>
            [company.primaryContactName, company.primaryContactJobTitle]
              .filter(Boolean)
              .join(" "),
          placeholder: "Cauta contact...",
        },
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
        filter: {
          getValue: (company) => company.primaryContactEmail,
          placeholder: "Cauta email...",
        },
        cell: (company) => fallback(company.primaryContactEmail),
      },
      {
        canCollapse: true,
        id: "phone",
        header: "Telefon",
        filter: {
          getValue: (company) => company.primaryContactPhone,
          placeholder: "Cauta telefon...",
        },
        cell: (company) => fallback(company.primaryContactPhone),
      },
      {
        canCollapse: true,
        id: "status",
        header: "Status",
        filter: {
          getValue: (company) => company.status,
          options: Object.values(CompanyStatusDto).map((status) => ({
            label: companyStatusLabels[status],
            value: status,
          })),
          placeholder: "Toate statusurile",
          type: "select",
        },
        cell: (company) => <CompanyStatusBadge status={company.status} />,
      },
      {
        canCollapse: true,
        id: "itTeam",
        header: "Echipa IT",
        filter: {
          getValue: (company) => formatItTeam(company.hasItTeam),
          options: [
            { label: "Da", value: "Da" },
            { label: "Nu", value: "Nu" },
            { label: "Necunoscut", value: "Necunoscut" },
          ],
          placeholder: "Toate",
          type: "select",
        },
        cell: (company) => (
          <span className={styles.status}>{formatItTeam(company.hasItTeam)}</span>
        ),
      },
      {
        id: "actions",
        header: "Actiune",
        minWidth: 86,
        width: 92,
        cell: (company) => (
          <button
            aria-label={`Editeaza contactul pentru ${company.name}`}
            className={styles.tableIconButton}
            disabled={!company.primaryContactId || !onEditCompany}
            title={
              company.primaryContactId && onEditCompany
                ? "Editeaza contact"
                : "Compania nu are contact principal"
            }
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              onEditCompany?.(company);
            }}
          >
            <Edit3 size={15} />
          </button>
        ),
      },
    ],
    [onEditCompany],
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
      minWidth="64rem"
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
