/**
 * Scrie `src/service-api/generated/api-resource-names.ts` din spec-ul OpenAPI.
 *
 * Rulat automat de orval, prin `hooks.afterAllFilesWrite` din `orval.config.ts`,
 * deci lista de resurse nu se mai scrie de mana: un endpoint nou in spec apare
 * singur, cu tot cu tipuri.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const specPath = join(projectRoot, "dev-tools", "service-api.json");
const outputPath = join(
  projectRoot,
  "src",
  "service-api",
  "generated",
  "api-resource-names.ts",
);

/** `"/companies/{companyId}"` -> `"companies"` */
function readResourceName(route) {
  const [firstSegment] = route.split("/").filter(Boolean);

  // O ruta care incepe direct cu un parametru nu numeste nicio resursa.
  return firstSegment?.startsWith("{") ? undefined : firstSegment;
}

const spec = JSON.parse(readFileSync(specPath, "utf8"));
const resourceNames = [
  ...new Set(Object.keys(spec.paths ?? {}).map(readResourceName).filter(Boolean)),
].sort();

if (!resourceNames.length) {
  throw new Error(`Nu am gasit nicio ruta in ${specPath}`);
}

writeFileSync(
  outputPath,
  `/**
 * Generat din dev-tools/service-api.json. Nu edita manual.
 * Se rescrie la fiecare \`npm run generate-webapi\`.
 *
 * Numele de aici sunt primul segment al fiecarei rute din spec si, implicit,
 * primul element al fiecarui query key generat de orval.
 */

export const allApiResourceNames = [
${resourceNames.map((resourceName) => `  "${resourceName}",`).join("\n")}
] as const;

export type AllApiResourceName = (typeof allApiResourceNames)[number];
`,
  "utf8",
);

console.log(`🗂  api-resource-names.ts - ${resourceNames.length} resurse din spec`);
