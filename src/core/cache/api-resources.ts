import type { QueryKey } from "@tanstack/react-query";

/**
 * Resursele expuse de API. Numele de aici sunt exact primul segment al oricarui
 * query key generat de orval — `["companies", { page: 1 }]`, `["deals", dealId]`,
 * `["tasks", "today"]` — pentru ca `orval.config.ts` genereaza cu
 * `shouldSplitQueryKey: true`.
 *
 * Asta inseamna ca `invalidateQueries({ queryKey: ["companies"] })` prinde
 * nativ si lista, si detaliile, si sub-rutele. Nu mai avem nevoie de niciun
 * predicat scris de mana.
 */
export const apiResourceNames = [
  "activities",
  "companies",
  "contacts",
  "deals",
  "permissions",
  "tasks",
  "users",
] as const;

export type ApiResourceName = (typeof apiResourceNames)[number];

const oneMinute = 60_000;
/** Datele se re-cer doar daca le invalidam explicit sau la reincarcarea paginii. */
const untilReload = Number.POSITIVE_INFINITY;

type ApiResourceRules = {
  /** Cat timp raman datele proaspete inainte ca react-query sa refaca GET-ul. */
  staysFreshFor: number;
  /**
   * Alte resurse pe care serverul le modifica in acelasi timp cu asta si care
   * NU pot fi deduse din raspunsul mutatiei. Doar acestea se re-cer dupa o
   * scriere reusita — restul se actualizeaza direct in cache.
   */
  alsoChanges: readonly ApiResourceName[];
};

export const apiResourceRules: Record<ApiResourceName, ApiResourceRules> = {
  // O activitate noua apare in detaliul deal-ului; nu are lista proprie.
  activities: { staysFreshFor: oneMinute, alsoChanges: ["deals"] },
  // Numele si statusul companiei sunt copiate in lista de task-uri si pe cardul de deal.
  companies: { staysFreshFor: oneMinute, alsoChanges: ["tasks", "deals"] },
  // Datele contactului principal sunt copiate in listele de companii, task-uri si deal-uri.
  contacts: {
    staysFreshFor: oneMinute,
    alsoChanges: ["companies", "tasks", "deals"],
  },
  // Marcarea unui deal ca pierdut inchide pe server task-urile legate de el.
  deals: { staysFreshFor: oneMinute, alsoChanges: ["tasks"] },
  // Permisiunile se schimba doar la o noua autentificare.
  permissions: { staysFreshFor: untilReload, alsoChanges: [] },
  // Inchiderea unui call schimba statusul companiei si poate crea un deal.
  tasks: { staysFreshFor: oneMinute, alsoChanges: ["companies", "deals"] },
  users: { staysFreshFor: oneMinute, alsoChanges: [] },
};

const knownResourceNames: ReadonlySet<string> = new Set(apiResourceNames);

function toResourceName(candidate: unknown): ApiResourceName | undefined {
  if (typeof candidate !== "string" || !knownResourceNames.has(candidate)) {
    return undefined;
  }

  return candidate as ApiResourceName;
}

/**
 * `"/companies/{companyId}"` -> `"companies"`.
 *
 * Intoarce `undefined` pentru rutele care nu tin de o resursa din cache
 * (`/auth/refresh`, `/auth/logout`) — pentru ele nu se sincronizeaza nimic.
 */
export function readResourceNameFromUrl(url: string): ApiResourceName | undefined {
  return toResourceName(url.split("/").filter(Boolean)[0]);
}

/** `["companies", { page: 1 }]` -> `"companies"`. */
export function readResourceNameFromQueryKey(
  queryKey: QueryKey,
): ApiResourceName | undefined {
  return toResourceName(queryKey[0]);
}
