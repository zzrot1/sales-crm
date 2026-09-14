"use client";

import { useState } from "react";

import { useListState } from "@/core/list-state";
import { usePermissions } from "@/core/permissions";
import { useGetCompanies } from "@/service-api/generated/endpoints/companies/companies";
import { useUpdateContact } from "@/service-api/generated/endpoints/contacts/contacts";
import {
  GetCompaniesSortBy,
  GetCompaniesSortOrder,
  type CompanyListItemDto,
} from "@/service-api/generated/models";

import type { ContactForm } from "../components/companies/edit-contact-dialog";

export function useCompaniesPage() {
  const list = useListState({ limit: 100, searchParam: "search" });
  const { can } = usePermissions();
  const [selectedCompany, setSelectedCompany] =
    useState<CompanyListItemDto | null>(null);
  const [editingCompany, setEditingCompany] =
    useState<CompanyListItemDto | null>(null);
  const [contactForm, setContactForm] = useState<ContactForm>({
    email: "",
    jobTitle: "",
    phone: "",
  });

  const companiesQuery = useGetCompanies({
    limit: list.limit,
    page: list.page,
    search: list.searchParamValue,
    sortBy: GetCompaniesSortBy.createdAt,
    sortOrder: GetCompaniesSortOrder.desc,
  });

  const companies = companiesQuery.data?.data ?? [];
  const total = companiesQuery.data?.total ?? 0;
  const totalPages = Math.max(companiesQuery.data?.totalPages ?? 1, 1);

  // Cache-ul si toast-ul de eroare vin din politica globala (core/cache).
  // Aici raman doar lucrurile specifice paginii.
  const updateContactMutation = useUpdateContact({
    mutation: {
      meta: { successMessage: "Contactul a fost salvat." },
      onSuccess: () => setEditingCompany(null),
    },
  });

  const openContactEditor = (company: CompanyListItemDto) => {
    setEditingCompany(company);
    setContactForm({
      email: company.primaryContactEmail ?? "",
      jobTitle: company.primaryContactJobTitle ?? "",
      phone: company.primaryContactPhone ?? "",
    });
  };

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

  return {
    closeContactEditor: () => {
      if (!updateContactMutation.isPending) {
        setEditingCompany(null);
      }
    },
    companies,
    companiesQuery,
    contactForm,
    editingCompany,
    goToPage: (page: number) =>
      list.setPage(Math.min(Math.max(page, 1), totalPages)),
    handleLimitChange: list.setLimit,
    handleSearchChange: list.setSearch,
    limit: list.limit,
    openContactEditor: can("update", "contacts") ? openContactEditor : undefined,
    page: list.page,
    saveContact,
    search: list.search,
    selectedCompany,
    setContactForm,
    setSelectedCompany,
    total,
    totalPages,
    updateContactMutation,
  };
}
