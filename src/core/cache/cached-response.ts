/**
 * Un raspuns tinut in cache are una dintre trei forme, in functie de endpoint:
 *
 *   lista simpla    `GET /deals`          -> `DealsListItemDto[]`
 *   lista paginata  `GET /companies`      -> `{ data: CompanyListItemDto[], total, ... }`
 *   o inregistrare  `GET /companies/{id}` -> `CompanyDto`
 *
 * Acesta e SINGURUL fisier care stie despre cele trei forme. Daca API-ul mai
 * adauga una, se adauga aici si nicaieri altundeva.
 *
 * Toate functiile de aici sunt pure: nu modifica obiectul primit si intorc
 * `undefined` cand raspunsul nu contine inregistrarea cautata.
 */

/**
 * Orice inregistrare din API are `id`. Dupa el o gasim in cache.
 * E `string` pentru resursele CRM si `number` pentru `users`, deci le acceptam
 * pe amandoua — altfel utilizatorii n-ar fi recunoscuti deloc in cache.
 */
export type RecordId = string | number;

export type RecordWithId = { id: RecordId };

type PagedRecords = { data: RecordWithId[] };

function isRecordWithId(value: unknown): value is RecordWithId {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const { id } = value as { id?: unknown };

  return typeof id === "string" || typeof id === "number";
}

function isRecordList(value: unknown): value is RecordWithId[] {
  return Array.isArray(value) && value.every(isRecordWithId);
}

function isPagedRecords(value: unknown): value is PagedRecords {
  return (
    typeof value === "object" &&
    value !== null &&
    isRecordList((value as { data?: unknown }).data)
  );
}

/**
 * Inregistrarea din lista are mereu cel putin campurile pe care le intoarce
 * mutatia — `CompanyListItemDto = CompanyDto & { primaryContact... }` — plus
 * campuri denormalizate pe care serverul nu le retrimite. De aceea pastram ce
 * era in cache si scriem peste doar ce a venit acum de la server.
 */
function mergeServerRecord(cached: RecordWithId, fromServer: RecordWithId) {
  return { ...cached, ...fromServer };
}

/**
 * Raspunsul cu inregistrarea inlocuita de versiunea intoarsa de server.
 * `undefined` daca raspunsul asta nu o contine — caz normal: query-ul altei
 * pagini sau al altei resurse.
 */
export function replaceRecordInCachedResponse(
  cachedResponse: unknown,
  serverRecord: RecordWithId,
): unknown {
  if (isRecordList(cachedResponse)) {
    return replaceRecordInList(cachedResponse, serverRecord);
  }

  if (isPagedRecords(cachedResponse)) {
    const nextRecords = replaceRecordInList(cachedResponse.data, serverRecord);

    if (!nextRecords) {
      return undefined;
    }

    return { ...cachedResponse, data: nextRecords };
  }

  if (isRecordWithId(cachedResponse) && cachedResponse.id === serverRecord.id) {
    return mergeServerRecord(cachedResponse, serverRecord);
  }

  return undefined;
}

/**
 * Raspunsul fara inregistrarea stearsa. `undefined` daca nu era acolo.
 * Un raspuns care e chiar inregistrarea stearsa nu se modifica — query-ul lui
 * de detaliu e invalidat oricum.
 */
export function removeRecordFromCachedResponse(
  cachedResponse: unknown,
  deletedRecordId: RecordId,
): unknown {
  if (isRecordList(cachedResponse)) {
    return removeRecordFromList(cachedResponse, deletedRecordId);
  }

  if (isPagedRecords(cachedResponse)) {
    const nextRecords = removeRecordFromList(cachedResponse.data, deletedRecordId);

    if (!nextRecords) {
      return undefined;
    }

    return { ...cachedResponse, data: nextRecords };
  }

  return undefined;
}

function replaceRecordInList(records: RecordWithId[], serverRecord: RecordWithId) {
  const index = records.findIndex((record) => record.id === serverRecord.id);

  if (index === -1) {
    return undefined;
  }

  const nextRecords = [...records];
  nextRecords[index] = mergeServerRecord(records[index], serverRecord);

  return nextRecords;
}

function removeRecordFromList(records: RecordWithId[], deletedRecordId: RecordId) {
  const nextRecords = records.filter((record) => record.id !== deletedRecordId);

  return nextRecords.length === records.length ? undefined : nextRecords;
}

/**
 * Inregistrarea intoarsa de o mutatie, daca raspunsul chiar e o inregistrare.
 *
 * Raspunsurile compuse (`CompleteCallTaskResponse`, `ImportLeadsResponse`) nu
 * au `id` la nivelul de sus, deci nu pot fi scrise direct in cache — pentru
 * ele se re-cere resursa.
 */
export function readRecordFromMutationResponse(
  mutationResponse: unknown,
): RecordWithId | undefined {
  return isRecordWithId(mutationResponse) ? mutationResponse : undefined;
}
