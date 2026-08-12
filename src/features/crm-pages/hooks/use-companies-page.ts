import { useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";

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
  GetCompaniesSortBy,
  GetCompaniesSortOrder,
  type CompanyListItemDto,
} from "@/service-api/generated/models";

import type { ContactForm } from "../components/companies/edit-contact-dialog";

export function useCompaniesPage() {
  const queryClient = useQueryClient();
  const searchParams = useSearchParams();
  const companySearchParam = searchParams.get("search") ?? "";
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(100);
  const [searchState, setSearchState] = useState({
    source: companySearchParam,
    value: companySearchParam,
  });
  const [selectedCompany, setSelectedCompany] =
    useState<CompanyListItemDto | null>(null);
  const [editingCompany, setEditingCompany] =
    useState<CompanyListItemDto | null>(null);
  const [contactForm, setContactForm] = useState<ContactForm>({
    email: "",
    jobTitle: "",
    phone: "",
  });
  const search =
    searchState.source === companySearchParam
      ? searchState.value
      : companySearchParam;

  if (searchState.source !== companySearchParam) {
    setSearchState({
      source: companySearchParam,
      value: companySearchParam,
    });

    if (page !== 1) {
      setPage(1);
    }
  }

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
    setSearchState({
      source: companySearchParam,
      value,
    });
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

  const closeContactEditor = () => {
    if (!updateContactMutation.isPending) {
      setEditingCompany(null);
    }
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
  };
}
