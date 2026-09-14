import type { QueryClient, QueryKey } from "@tanstack/react-query";

import type { ApiResourceName } from "@/core/cache/api-resources";
import {
  removeRecordFromCachedResponse,
  replaceRecordInCachedResponse,
  type RecordId,
  type RecordWithId,
} from "@/core/cache/cached-response";

/**
 * Singurul loc din aplicatie care scrie in cache-ul react-query.
 *
 * `writeServerRecordToCache` si `removeRecordFromCache` sunt echivalentul lui
 * `updateItem` / `removeItem` dintr-un view model: schimba datele pe loc, fara
 * niciun request. Amandoua intorc query key-urile pe care chiar le-au modificat,
 * ca apelantul sa poata spune exact ce s-a intamplat.
 */

/** Scrie inregistrarea intoarsa de server peste cea din toate query-urile resursei. */
export function writeServerRecordToCache(
  queryClient: QueryClient,
  resourceName: ApiResourceName,
  serverRecord: RecordWithId,
): QueryKey[] {
  return updateCachedResponses(queryClient, resourceName, (cachedResponse) =>
    replaceRecordInCachedResponse(cachedResponse, serverRecord),
  );
}

/** Scoate inregistrarea stearsa din toate listele resursei. */
export function removeRecordFromCache(
  queryClient: QueryClient,
  resourceName: ApiResourceName,
  deletedRecordId: RecordId,
): QueryKey[] {
  return updateCachedResponses(queryClient, resourceName, (cachedResponse) =>
    removeRecordFromCachedResponse(cachedResponse, deletedRecordId),
  );
}

/**
 * Trece prin query-urile resursei si le rescrie pe cele pe care `getNextResponse`
 * chiar le schimba. Parcurgem cache-ul explicit (in loc de `setQueriesData`) ca
 * sa stim ce query key am atins — altfel actualizarea ar fi invizibila la debug.
 */
function updateCachedResponses(
  queryClient: QueryClient,
  resourceName: ApiResourceName,
  getNextResponse: (cachedResponse: unknown) => unknown,
): QueryKey[] {
  const updatedQueryKeys: QueryKey[] = [];
  const cachedQueries = queryClient
    .getQueryCache()
    .findAll({ queryKey: [resourceName] });

  for (const cachedQuery of cachedQueries) {
    const nextResponse = getNextResponse(cachedQuery.state.data);

    if (nextResponse === undefined) {
      continue;
    }

    queryClient.setQueryData(cachedQuery.queryKey, nextResponse);
    updatedQueryKeys.push(cachedQuery.queryKey);
  }

  return updatedQueryKeys;
}

/**
 * Marcheaza resursa ca invechita. react-query re-cere doar query-urile montate
 * acum; restul se reincarca data viitoare cand o pagina le cere. Nu asteptam
 * raspunsul, ca UI-ul sa reactioneze imediat.
 *
 * Mutatiile generate nu au nevoie sa cheme asta — o face politica globala.
 * Ramane pentru scrierile care nu trec prin ea, cum e importul in batch-uri.
 */
export function refreshResource(
  queryClient: QueryClient,
  resourceName: ApiResourceName,
) {
  void queryClient.invalidateQueries({ queryKey: [resourceName] });
}
