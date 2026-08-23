"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";

/**
 * Starea repetata de fiecare pagina de lista: `page`, `limit`, `search`.
 * Nu stie nimic despre API — parametrii se dau mai departe hook-ului orval,
 * iar `searchParamValue` e cautarea gata de trimis (sirul gol devine `undefined`).
 *
 * ```ts
 * const list = useListState({ limit: 100, searchParam: "search" });
 * const query = useGetCompanies({
 *   page: list.page,
 *   limit: list.limit,
 *   search: list.searchParamValue,
 * });
 * ```
 *
 * Paginarea nu e clampata aici, fiindca `totalPages` vine din raspuns:
 * `goToPage: (p) => list.setPage(Math.min(Math.max(p, 1), totalPages))`.
 */
export function useListState({
  limit: initialLimit = 25,
  searchParam,
}: {
  limit?: number;
  /** Parametrul din URL care alimenteaza cautarea (ex. bara globala). */
  searchParam?: string;
} = {}) {
  const searchParams = useSearchParams();
  const urlSearch = searchParam ? (searchParams.get(searchParam) ?? "") : "";

  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(initialLimit);
  const [typed, setTyped] = useState({ search: urlSearch, source: urlSearch });

  if (typed.source !== urlSearch) {
    setTyped({ search: urlSearch, source: urlSearch });
    setPage(1);
  }

  const search = typed.source === urlSearch ? typed.search : urlSearch;

  return {
    limit,
    page,
    searchParamValue: search.trim() || undefined,
    search,
    setLimit: (nextLimit: number) => {
      setLimit(nextLimit);
      setPage(1);
    },
    setPage,
    setSearch: (nextSearch: string) => {
      setTyped({ search: nextSearch, source: urlSearch });
      setPage(1);
    },
  };
}
