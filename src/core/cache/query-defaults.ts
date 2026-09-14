import type { QueryClient } from "@tanstack/react-query";

import { apiResourceNames, apiResourceRules } from "@/core/cache/api-resources";

/**
 * Leaga regulile de prospetime din `api-resources.ts` de cache-ul react-query.
 *
 * Merge fiindca fiecare query key incepe cu numele resursei, deci un default pus
 * pe `["companies"]` acopera si lista, si detaliile, si sub-rutele ei.
 */
export function applyResourceQueryDefaults(queryClient: QueryClient) {
  apiResourceNames.forEach((resourceName) => {
    queryClient.setQueryDefaults([resourceName], {
      staleTime: apiResourceRules[resourceName].staysFreshFor,
    });
  });
}
