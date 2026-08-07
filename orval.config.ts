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
      },
    },
  },
});
