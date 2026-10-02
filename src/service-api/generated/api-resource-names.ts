/**
 * Generat din dev-tools/service-api.json. Nu edita manual.
 * Se rescrie la fiecare `npm run generate-webapi`.
 *
 * Numele de aici sunt primul segment al fiecarei rute din spec si, implicit,
 * primul element al fiecarui query key generat de orval.
 */

export const allApiResourceNames = [
  "activities",
  "auth",
  "companies",
  "contacts",
  "deals",
  "permissions",
  "reports",
  "tasks",
  "users",
] as const;

export type AllApiResourceName = (typeof allApiResourceNames)[number];
