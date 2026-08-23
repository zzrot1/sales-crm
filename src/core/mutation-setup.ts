"use client";

import { useQueryClient, type QueryClient, type QueryKey } from "@tanstack/react-query";

import { getErrorMessage } from "@/core/api-error";
import { resourcePaths, type ResourceName } from "@/core/resources";
import { useNotifications } from "@/core/notifications";

function matchesPaths(queryKey: QueryKey, paths: readonly string[]) {
  const [first] = queryKey;

  if (typeof first !== "string") {
    return false;
  }

  return paths.some((path) => first === path || first.startsWith(`${path}/`));
}

type Snapshot = [QueryKey, unknown][];

type Optimistic<TVariables, TItem> = {
  resource: ResourceName;
  id: (variables: TVariables) => string;
  /** Cum arata inregistrarea dupa modificare. */
  patch: (item: TItem, variables: TVariables) => TItem;
};

export type MutationSetup<TVariables, TItem> = {
  /**
   * Resursele invalidate dupa mutatie, ex. `["companies", "tasks"]`.
   * Query key-urile orval incep cu path-ul endpoint-ului
   * (`["/companies", params]`, `["/companies/123"]`), deci path-ul resursei
   * acopera lista, detaliile si sub-rutele.
   */
  invalidates?: readonly ResourceName[];
  success?: string;
  error?: string;
  onSuccess?: (variables: TVariables) => void;
  /** Modifica listele din cache inainte de raspuns; rollback automat pe eroare. */
  optimistic?: Optimistic<TVariables, TItem>;
};

function patchCachedLists<TItem>(
  queryClient: QueryClient,
  { id, patch }: { id: string; patch: (item: TItem) => TItem },
  paths: readonly string[],
) {
  const filter = { predicate: (query: { queryKey: QueryKey }) => matchesPaths(query.queryKey, paths) };
  const snapshot = queryClient.getQueriesData(filter) as Snapshot;

  queryClient.setQueriesData<{ data?: unknown }>(filter, (response) => {
    const payload = response?.data;
    const items = Array.isArray(payload)
      ? payload
      : (payload as { data?: unknown } | undefined)?.data;

    if (!Array.isArray(items)) {
      return response;
    }

    const nextItems = items.map((item) =>
      (item as { id?: string })?.id === id ? patch(item as TItem) : item,
    );

    return {
      ...response,
      data: Array.isArray(payload) ? nextItems : { ...(payload as object), data: nextItems },
    };
  });

  return snapshot;
}

function warnAboutEmptyCache(queryClient: QueryClient, paths: readonly string[]) {
  if (process.env.NODE_ENV === "production") {
    return;
  }

  const cached = queryClient.getQueryCache().getAll();
  const unused = paths.filter(
    (path) => !cached.some((query) => matchesPaths(query.queryKey, [path])),
  );

  if (unused.length > 0) {
    console.warn(
      `[useMutationSetup] Nu exista niciun query in cache pentru: ${unused.join(", ")}.`,
    );
  }
}

/**
 * Produce optiunile pe care le asteapta orice hook de mutatie generat de orval,
 * cu invalidarea, toast-urile si rollback-ul deja legate:
 *
 * ```ts
 * const setup = useMutationSetup({
 *   invalidates: ["companies", "contacts"],
 *   success: "Contactul a fost salvat.",
 * });
 * const updateContact = useUpdateContact(setup);
 * ```
 *
 * Cei doi parametri de tip se dau explicit doar cand folosesti `optimistic`:
 * variabilele mutatiei si elementul din lista.
 */
export function useMutationSetup<TVariables = unknown, TItem = unknown>(
  setup: MutationSetup<TVariables, TItem>,
) {
  const queryClient = useQueryClient();
  const { notify } = useNotifications();
  const { error, invalidates = [], optimistic, success } = setup;
  const invalidatePaths = invalidates.map((name) => resourcePaths[name]);

  return {
    mutation: {
      onError: (mutationError: unknown, _variables: TVariables, snapshot?: Snapshot) => {
        snapshot?.forEach(([queryKey, data]) => queryClient.setQueryData(queryKey, data));
        notify("error", error ?? getErrorMessage(mutationError));
      },
      onMutate: async (variables: TVariables): Promise<Snapshot> => {
        if (!optimistic) {
          return [];
        }

        const paths = [resourcePaths[optimistic.resource]];

        await queryClient.cancelQueries({
          predicate: (query) => matchesPaths(query.queryKey, paths),
        });

        return patchCachedLists<TItem>(
          queryClient,
          {
            id: optimistic.id(variables),
            patch: (item) => optimistic.patch(item, variables),
          },
          paths,
        );
      },
      onSettled: () => {
        warnAboutEmptyCache(queryClient, invalidatePaths);

        return queryClient.invalidateQueries({
          predicate: (query) => matchesPaths(query.queryKey, invalidatePaths),
        });
      },
      onSuccess: (_data: unknown, variables: TVariables) => {
        if (success) {
          notify("success", success);
        }

        setup.onSuccess?.(variables);
      },
    },
  };
}
