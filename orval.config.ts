import { defineConfig } from "orval";

export default defineConfig({
  serviceApi: {
    input: {
      target: "./dev-tools/service-api.json",
    },
    output: {
      mode: "tags-split",
      target: "./src/service-api/generated/endpoints/service-api.ts",
      schemas: "./src/service-api/generated/models",
      client: "react-query",
      httpClient: "fetch",
      override: {
        mutator: {
          path: "./src/service-api/mutator/api-fetch.ts",
          name: "apiFetch",
        },
        fetch: {
          // Raspunsul e chiar DTO-ul, fara invelisul `{ data, status, headers }`.
          // Asa `companiesQuery.data` e `PagedCompaniesResponse`, nu `.data.data`.
          includeHttpResponseReturnType: false,
        },
        query: {
          // Query key-uri ierarhice: ["companies"], ["companies", params],
          // ["companies", companyId]. Asa `invalidateQueries({ queryKey: ["companies"] })`
          // prinde nativ lista si detaliile, fara predicate scrise de mana.
          shouldSplitQueryKey: true,
          // Politica de cache, toast si erori, injectata in fiecare mutatie generata.
          mutationOptions: {
            path: "./src/core/cache/mutation-options.ts",
            name: "useApiMutationOptions",
          },
        },
      },
    },
  },
});
