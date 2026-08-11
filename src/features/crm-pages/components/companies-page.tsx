"use client";

import {
  Building2,
  Edit3,
  ExternalLink,
  LoaderCircle,
} from "lucide-react";
import { useSearchParams } from "next/navigation";
import { type ComponentProps, useEffect, useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";

import { DataTable, type DataTableColumn } from "@/components/data-table";
import { SidePanel } from "@/components/side-panel/side-panel";
import {
  getGetCompaniesQueryKey,
  useGetCompanies,
} from "@/service-api/generated/endpoints/companies/companies";
import {
  getGetContactsQueryKey,
  useUpdateContact,
} from "@/service-api/generated/endpoints/contacts/contacts";
import {
  getGetTasksQueryKey,
  getGetTodaysTasksQueryKey,
} from "@/service-api/generated/endpoints/tasks/tasks";
import {
  type CompanyDtoStatus,
  GetCompaniesSortBy,
  GetCompaniesSortOrder,
  type CompanyListItemDto,
} from "@/service-api/generated/models";
import styles from "./index.module.css";

const pageSizeOptions = [10, 25, 50, 100];

const companyStatusLabels: Record<CompanyDtoStatus, string> = {
  CALLED_NO_ANSWER: "Sunat - fara raspuns",
  DEAL_IN_PROGRESS: "Deal in progres",
  FOLLOW_UP_LATER: "Follow-up",
  INTERESTED: "Interesat",
  LOST: "Pierdut",
  MEETING_REQUIRED: "Necesita meeting",
  MEETING_SCHEDULED: "Meeting programat",
  NEW: "Nou",
  NOT_INTERESTED: "Neinteresat",
  TO_CALL: "De sunat",
  WON: "Castigat",
};

const companyStatusTones: Record<CompanyDtoStatus, string> = {
  CALLED_NO_ANSWER: "statusToneYellow",
  DEAL_IN_PROGRESS: "statusToneBlue",
  FOLLOW_UP_LATER: "statusToneYellow",
  INTERESTED: "statusToneGreen",
  LOST: "statusToneRed",
  MEETING_REQUIRED: "statusToneBlue",
  MEETING_SCHEDULED: "statusToneBlue",
  NEW: "statusToneNeutral",
  NOT_INTERESTED: "statusToneRed",
  TO_CALL: "statusToneNeutral",
  WON: "statusToneGreen",
};

export function CompaniesPage() {
  const queryClient = useQueryClient();
  const searchParams = useSearchParams();
  const companySearchParam = searchParams.get("search") ?? "";
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(100);
  const [search, setSearch] = useState(companySearchParam);
  const [selectedCompany, setSelectedCompany] =
    useState<CompanyListItemDto | null>(null);
  const [editingCompany, setEditingCompany] =
    useState<CompanyListItemDto | null>(null);
  const [contactForm, setContactForm] = useState({
    email: "",
    jobTitle: "",
    phone: "",
  });

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

  useEffect(() => {
    setSearch(companySearchParam);
    setPage(1);
  }, [companySearchParam]);

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

  const openContactEditor = (company: CompanyListItemDto) => {
    setEditingCompany(company);
    setContactForm({
      email: company.primaryContactEmail ?? "",
      jobTitle: company.primaryContactJobTitle ?? "",
      phone: company.primaryContactPhone ?? "",
    });
  };

  const updateContactMutation = useUpdateContact({
    mutation: {
      onSuccess: async () => {
        await Promise.all([
          queryClient.invalidateQueries({ queryKey: getGetCompaniesQueryKey() }),
          queryClient.invalidateQueries({ queryKey: getGetContactsQueryKey() }),
          queryClient.invalidateQueries({ queryKey: getGetTodaysTasksQueryKey() }),
          queryClient.invalidateQueries({ queryKey: getGetTasksQueryKey() }),
        ]);

        setEditingCompany(null);
      },
    },
  });

  const saveContact = () => {
    if (!editingCompany?.primaryContactId) {
      return;
    }

    updateContactMutation.mutate({
      contactId: editingCompany.primaryContactId,
      data: {
        email: contactForm.email.trim(),
        jobTitle: contactForm.jobTitle.trim(),
        phone: contactForm.phone.trim(),
      },
    });
  };

  return (
    <div className={styles.page}>
      <section className={styles.tableCard}>
        <CompaniesDataTable
          companies={companies}
          isError={companiesQuery.isError}
          isFetching={companiesQuery.isFetching}
          isLoading={companiesQuery.isLoading}
          onEditCompany={openContactEditor}
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

      {editingCompany ? (
        <div
          className={styles.dialogOverlay}
          role="presentation"
          onMouseDown={() => {
            if (!updateContactMutation.isPending) setEditingCompany(null);
          }}
        >
          <section
            aria-labelledby="edit-contact-title"
            aria-modal="true"
            className={styles.dialog}
            role="dialog"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div className={styles.dialogHeader}>
              <div>
                <p className={styles.eyebrow}>Contact principal</p>
                <h3 className={styles.cardTitle} id="edit-contact-title">
                  Editeaza {editingCompany.name}
                </h3>
                <p className={styles.muted}>
                  Actualizeaza datele folosite in task-uri si in tabel.
                </p>
              </div>
              <button
                aria-label="Inchide dialogul"
                className={styles.iconButton}
                disabled={updateContactMutation.isPending}
                type="button"
                onClick={() => setEditingCompany(null)}
              >
                ×
              </button>
            </div>

            {!editingCompany.primaryContactId ? (
              <p className={styles.formError}>
                Compania nu are contact principal de editat.
              </p>
            ) : null}

            <label className={styles.dialogField}>
              <span>Email</span>
              <input
                value={contactForm.email}
                placeholder="contact@companie.ro"
                onChange={(event) =>
                  setContactForm((current) => ({
                    ...current,
                    email: event.target.value,
                  }))
                }
              />
            </label>

            <label className={styles.dialogField}>
              <span>Telefon</span>
              <input
                value={contactForm.phone}
                placeholder="+40..."
                onChange={(event) =>
                  setContactForm((current) => ({
                    ...current,
                    phone: event.target.value,
                  }))
                }
              />
            </label>

            <label className={styles.dialogField}>
              <span>Functie</span>
              <input
                value={contactForm.jobTitle}
                placeholder="CEO, Founder, Director..."
                onChange={(event) =>
                  setContactForm((current) => ({
                    ...current,
                    jobTitle: event.target.value,
                  }))
                }
              />
            </label>

            {updateContactMutation.isError ? (
              <p className={styles.formError}>
                Nu am putut salva contactul. Incearca din nou.
              </p>
            ) : null}

            <div className={styles.dialogActions}>
              <button
                className={styles.button}
                disabled={!editingCompany.primaryContactId || updateContactMutation.isPending}
                type="button"
                onClick={saveContact}
              >
                {updateContactMutation.isPending ? (
                  <LoaderCircle className={styles.spinner} size={16} />
                ) : null}
                Salveaza
              </button>
            </div>
          </section>
        </div>
      ) : null}
    </div>
  );
}

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
}: {
  companies: CompanyListItemDto[];
  isError: boolean;
  isFetching: boolean;
  isLoading: boolean;
  onEditCompany?: (company: CompanyListItemDto) => void;
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
        id: "status",
        header: "Status",
        cell: (company) => <CompanyStatusBadge status={company.status} />,
      },
      {
        canCollapse: true,
        id: "itTeam",
        header: "Echipa IT",
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

function CompanyStatusBadge({ status }: { status: CompanyDtoStatus }) {
  return (
    <span className={`${styles.status} ${styles[companyStatusTones[status]]}`}>
      {companyStatusLabels[status]}
    </span>
  );
}

function formatItTeam(value: boolean | null) {
  if (value === true) return "Da";
  if (value === false) return "Nu";
  return "Necunoscut";
}

function normalizeWebsiteUrl(value: string) {
  return /^https?:\/\//i.test(value) ? value : `https://${value}`;
}
