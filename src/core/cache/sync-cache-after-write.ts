import type { QueryClient } from "@tanstack/react-query";

import {
  apiResourceRules,
  type ApiResourceName,
} from "@/core/cache/api-resources";
import {
  readRecordFromMutationResponse,
  type RecordWithId,
} from "@/core/cache/cached-response";
import {
  refreshResource,
  removeRecordFromCache,
  writeServerRecordToCache,
} from "@/core/cache/resource-cache";

type SyncInput = {
  queryClient: QueryClient;
  /** Resursa scrisa, dedusa din URL-ul endpoint-ului. */
  resourceName: ApiResourceName;
  /** Numele operatiei orval, ex. `"updateDeal"`. */
  operationName: string;
  /** Ce a intors serverul pentru mutatia asta. */
  mutationResponse: unknown;
};

/**
 * Ce se intampla cu cache-ul dupa o scriere reusita. Trei cazuri, in ordine:
 *
 *  1. operatia sterge          -> scoatem inregistrarea din listele din cache
 *  2. serverul a intors inregistrarea -> o scriem peste cea veche, zero request-uri
 *  3. nu s-a putut actualiza nimic    -> re-cerem resursa
 *
 * Cazul 3 acopera de la sine crearile (id-ul nou nu e in nicio lista), raspunsurile
 * compuse (`CompleteCallTaskResponse`) si inregistrarile care nu sunt pe pagina
 * incarcata acum.
 *
 * In plus, mereu: resursele din `alsoChanges` se re-cer, fiindca serverul le-a
 * modificat si raspunsul nu spune cum.
 */
export function syncCacheAfterWrite({
  queryClient,
  resourceName,
  operationName,
  mutationResponse,
}: SyncInput) {
  const serverRecord = readRecordFromMutationResponse(mutationResponse);
  const updatedQueryKeys = serverRecord
    ? applyRecordToCache({ queryClient, resourceName, operationName, serverRecord })
    : [];

  const refreshedResources = updatedQueryKeys.length
    ? apiResourceRules[resourceName].alsoChanges
    : [resourceName, ...apiResourceRules[resourceName].alsoChanges];

  refreshedResources.forEach((refreshedResource) => {
    refreshResource(queryClient, refreshedResource);
  });

  logSync({ operationName, resourceName, updatedQueryKeys, refreshedResources });
}

function applyRecordToCache({
  queryClient,
  resourceName,
  operationName,
  serverRecord,
}: Omit<SyncInput, "mutationResponse"> & {
  serverRecord: RecordWithId;
}) {
  if (deletesRecord(operationName)) {
    return removeRecordFromCache(queryClient, resourceName, serverRecord.id);
  }

  return writeServerRecordToCache(queryClient, resourceName, serverRecord);
}

/**
 * Numele operatiei vine de la orval (`"deleteCompany"`) si e singura informatie
 * din care putem deduce ca o mutatie sterge — metoda HTTP nu ajunge pana aici.
 * Un `DELETE` intoarce inregistrarea stearsa, deci fara verificarea asta am
 * scrie-o inapoi in lista in loc sa o scoatem.
 */
function deletesRecord(operationName: string) {
  return operationName.startsWith("delete");
}

/**
 * O linie per scriere, in dev: exact ce a facut cache-ul. Cand o pagina nu se
 * actualizeaza, asta e primul loc in care te uiti.
 */
function logSync({
  operationName,
  resourceName,
  updatedQueryKeys,
  refreshedResources,
}: {
  operationName: string;
  resourceName: ApiResourceName;
  updatedQueryKeys: readonly unknown[];
  refreshedResources: readonly ApiResourceName[];
}) {
  if (process.env.NODE_ENV === "production") {
    return;
  }

  const updated = updatedQueryKeys.length
    ? `am actualizat ${updatedQueryKeys.length} query-uri din "${resourceName}"`
    : `nimic de actualizat in "${resourceName}"`;
  const refreshed = refreshedResources.length
    ? `am re-cerut: ${refreshedResources.join(", ")}`
    : "fara re-cerere";

  console.debug(`[cache] ${operationName}: ${updated} | ${refreshed}`, updatedQueryKeys);
}
