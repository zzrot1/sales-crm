"use client";

import { useQueryClient, type UseMutationOptions } from "@tanstack/react-query";

import { apiDataHandler, type ApiMutationMeta } from "@/core/cache/api-data-handler";
import { useNotifications } from "@/core/notifications";

/**
 * Face `mutation.meta` tipat peste tot in aplicatie:
 *
 * ```ts
 * const updateContact = useUpdateContact({
 *   mutation: { meta: { successMessage: "Contactul a fost salvat." } },
 * });
 * ```
 */
declare module "@tanstack/react-query" {
  interface Register {
    mutationMeta: ApiMutationMeta;
  }
}

/**
 * Puntea catre orval: fisierul asta e tinta lui
 * `output.override.query.mutationOptions` din `orval.config.ts`, deci hook-ul de
 * mai jos ajunge in fiecare mutatie generata. Aici se leaga React de `apiDataHandler`.
 *
 * Trebuie sa ramana o declaratie literala cu trei parametri: orval parseaza
 * fisierul si numara parametrii ca sa stie cate argumente sa trimita. Cu un
 * re-export ar pierde al treilea argument, si odata cu el numele operatiei —
 * deci si recunoasterea stergerilor.
 */
export function useApiMutationOptions<TData, TError, TVariables, TContext>(
  options: UseMutationOptions<TData, TError, TVariables, TContext>,
  endpoint: { url: string },
  operation: { operationId: string; operationName: string },
) {
  const queryClient = useQueryClient();
  const { notify } = useNotifications();

  return apiDataHandler.buildMutationOptions(options, endpoint, operation, {
    notify,
    queryClient,
  });
}
