"use client";

import { useQueryClient } from "@tanstack/react-query";
import { DataHandler } from "orval-data-handler";
import { useEffect, useRef, useState } from "react";

import { usePermissions } from "@/core/permissions";
import {
  getGetCuiDiscoveryQueryKey,
  useGetCuiDiscovery,
  useRefreshCompanyIntelligence,
  useStartCuiDiscovery,
} from "@/service-api/generated/endpoints/companies/companies";

const POLL_INTERVAL_MS = 2_000;
/** Tabelul se reincarca o data la atatea firme salvate, nu la fiecare. */
const RELOAD_EVERY_SAVED = 5;

/**
 * Cautarea automata de CUI-uri: o porneste, ii urmareste progresul si
 * reincarca tabelul pe masura ce se salveaza firme noi. Tot de aici se
 * confirma CUI-urile pe care serverul nu le-a putut potrivi singur.
 */
export function useCuiDiscovery() {
  const queryClient = useQueryClient();
  const { can } = usePermissions();
  const [resolvedIds, setResolvedIds] = useState<ReadonlySet<string>>(new Set());

  const statusQuery = useGetCuiDiscovery({
    query: {
      refetchInterval: (query) =>
        query.state.data?.state === "running" ? POLL_INTERVAL_MS : false,
    },
  });

  const startMutation = useStartCuiDiscovery({
    mutation: {
      // Raspunsul e chiar starea jobului; il punem direct in cache, ca
      // polling-ul sa porneasca fara inca un GET.
      meta: { cache: DataHandler.skipCacheWrite() },
      onSuccess: (status) => {
        setResolvedIds(new Set());
        queryClient.setQueryData(getGetCuiDiscoveryQueryKey(), status);
      },
    },
  });

  const confirmMutation = useRefreshCompanyIntelligence({
    mutation: {
      meta: { successMessage: "CUI-ul a fost salvat si datele ANAF aduse." },
      onSuccess: (result) =>
        setResolvedIds((current) => new Set(current).add(result.companyId)),
    },
  });

  const status = statusQuery.data;
  const reloadKey = status
    ? `${status.state}:${Math.floor(status.saved / RELOAD_EVERY_SAVED)}`
    : null;
  const previousReloadKey = useRef(reloadKey);

  // Firmele salvate de job apar in tabel fara refresh de pagina.
  useEffect(() => {
    if (previousReloadKey.current === reloadKey) return;

    const isFirstStatus = previousReloadKey.current === null;
    previousReloadKey.current = reloadKey;
    if (isFirstStatus) return;

    void queryClient.invalidateQueries({
      predicate: (query) =>
        query.queryKey[0] === "companies" && query.queryKey[1] !== "cui-discovery",
    });
  }, [queryClient, reloadKey]);

  return {
    canRun: can("update", "companies"),
    confirm: (companyId: string, cui: string) =>
      confirmMutation.mutate({ companyId, data: { cui } }),
    confirmingCompanyId: confirmMutation.isPending
      ? confirmMutation.variables?.companyId
      : undefined,
    dismiss: (companyId: string) =>
      setResolvedIds((current) => new Set(current).add(companyId)),
    isStarting: startMutation.isPending,
    needsReview: (status?.needsReview ?? []).filter(
      (item) => !resolvedIds.has(item.companyId),
    ),
    start: () => startMutation.mutate(),
    status,
  };
}

export type CuiDiscovery = ReturnType<typeof useCuiDiscovery>;
