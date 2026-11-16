"use client";

import { useState } from "react";

import { useGetCompanies } from "@/service-api/generated/endpoints/companies/companies";

import { useCuiDiscovery } from "./use-cui-discovery";
import {
  getEmptyCompaniesMessage,
  type CalledFilter,
  type CompanySizeFilter,
} from "../utils/intelligence-helpers";

/**
 * Segmentele tabelului de companii: marime (implicit firmele mici) si
 * sunate / nesunate. `params` se da mai departe lui `useGetCompanies`.
 *
 * `onChange` e chemat la orice schimbare, ca pagina sa revina la prima pagina.
 */
export function useCompanySegments(onChange: () => void) {
  const [size, setSize] = useState<CompanySizeFilter>("small");
  const [called, setCalled] = useState<CalledFilter>("all");

  // Cate companii nu au inca date ANAF, deci nu pot fi incadrate dupa marime.
  const withoutDataQuery = useGetCompanies({ limit: 1, size: "unknown" });
  const withoutDataCount = withoutDataQuery.data?.total;
  const discovery = useCuiDiscovery();

  return {
    called,
    discovery,
    emptyMessage: getEmptyCompaniesMessage(size, withoutDataCount),
    params: {
      called: called === "all" ? undefined : called === "called",
      size: size === "all" ? undefined : size,
    },
    setCalled: (next: CalledFilter) => {
      setCalled(next);
      onChange();
    },
    setSize: (next: CompanySizeFilter) => {
      setSize(next);
      onChange();
    },
    size,
    withoutDataCount,
  };
}

export type CompanySegments = ReturnType<typeof useCompanySegments>;
