"use client";

import styles from "./index.module.css";
import { CompaniesDataTable } from "./companies/companies-data-table";
import { CompanySidePanel } from "./companies/company-side-panel";
import { EditContactDialog } from "./companies/edit-contact-dialog";
import { useCompaniesPage } from "../hooks/use-companies-page";
import { pageSizeOptions } from "../utils/company-helpers";

export { CompaniesDataTable } from "./companies/companies-data-table";

export function CompaniesPage() {
  const {
    closeContactEditor,
    companies,
    companiesQuery,
    contactForm,
    editingCompany,
    goToPage,
    handleLimitChange,
    handleSearchChange,
    limit,
    openContactEditor,
    page,
    saveContact,
    search,
    selectedCompany,
    setContactForm,
    setSelectedCompany,
    total,
    totalPages,
    updateContactMutation,
  } = useCompaniesPage();

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
        <EditContactDialog
          company={editingCompany}
          contactForm={contactForm}
          isError={updateContactMutation.isError}
          isSaving={updateContactMutation.isPending}
          onClose={closeContactEditor}
          onFormChange={setContactForm}
          onSave={saveContact}
        />
      ) : null}
    </div>
  );
}
