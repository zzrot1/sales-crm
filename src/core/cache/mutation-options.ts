"use client";

import { useQueryClient, type UseMutationOptions } from "@tanstack/react-query";

import { getErrorMessage } from "@/core/api-error";
import { readResourceNameFromUrl } from "@/core/cache/api-resources";
import { syncCacheAfterWrite } from "@/core/cache/sync-cache-after-write";
import { useNotifications } from "@/core/notifications";

/**
 * Ce poate cere in plus o pagina fata de comportamentul implicit. Se trimite
 * prin `mutation.meta`, deci se vede si in React Query Devtools:
 *
 * ```ts
 * const updateContact = useUpdateContact({
 *   mutation: { meta: { successMessage: "Contactul a fost salvat." } },
 * });
 * ```
 */
export type ApiMutationMeta = {
  /** Textul afisat la succes. Fara el nu apare niciun toast de succes. */
  successMessage?: string;
  /** Inlocuieste mesajul de eroare venit de la server. */
  errorMessage?: string;
};

declare module "@tanstack/react-query" {
  interface Register {
    mutationMeta: ApiMutationMeta;
  }
}

/**
 * Politica aplicata AUTOMAT fiecarei mutatii generate de orval. E legata in
 * `orval.config.ts` prin `override.query.mutationOptions`, deci nu se importa
 * nicaieri manual: orval o cheama din fiecare `useXMutationOptions` generat.
 *
 * Asa, orice `useCreate*` / `useUpdate*` / `useDelete*` primeste, fara nicio
 * linie la locul apelului:
 *
 *   - toast de eroare cu mesajul venit de la server (`ApiError`)
 *   - sincronizarea cache-ului (vezi `sync-cache-after-write.ts`)
 *   - toast de succes, daca pagina a cerut unul prin `meta.successMessage`
 *
 * Ce trimite pagina in `mutation: { ... }` ramane valabil: callback-urile ei
 * sunt chemate dupa ale noastre, nu inlocuite.
 *
 * Numele incepe cu `use` fiindca foloseste hook-uri; e apelata mereu din
 * interiorul unui hook generat, deci regulile hook-urilor sunt respectate.
 */
export function useApiMutationOptions<TData, TError, TVariables, TContext>(
  options: UseMutationOptions<TData, TError, TVariables, TContext>,
  endpoint: { url: string },
  operation: { operationId: string; operationName: string },
): UseMutationOptions<TData, TError, TVariables, TContext> {
  const queryClient = useQueryClient();
  const { notify } = useNotifications();
  const resourceName = readResourceNameFromUrl(endpoint.url);

  return {
    ...options,
    onError: (...callbackArgs) => {
      const [error] = callbackArgs;

      notify("error", options.meta?.errorMessage ?? getErrorMessage(error));

      return options.onError?.(...callbackArgs);
    },
    onSuccess: (...callbackArgs) => {
      const [mutationResponse] = callbackArgs;

      if (resourceName) {
        syncCacheAfterWrite({
          mutationResponse,
          operationName: operation.operationName,
          queryClient,
          resourceName,
        });
      }

      if (options.meta?.successMessage) {
        notify("success", options.meta.successMessage);
      }

      return options.onSuccess?.(...callbackArgs);
    },
  };
}
