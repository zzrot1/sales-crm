import {
  useQueryClient,
  type QueryClient,
  type QueryKey,
  type UseQueryResult,
} from "@tanstack/react-query";

import { DataHandler, type RecordWithId, type RecordsOf } from "./data-handler";

/** GET-ul paginii, exact cum il intoarce hook-ul generat de orval. */
type PageQuery<TData> = UseQueryResult<TData, unknown> & { queryKey: QueryKey };

/**
 * Partea de date a unei pagini: datele incarcate de GET-ul ei, starea incarcarii si
 * operatiile pe randuri. O extinde **fiecare pagina**, si acolo pui logica ei —
 * filtre, grupari, ce se afiseaza cum.
 *
 * ```ts
 * class DealsDataPage extends DataPage<DealsListItemDto[]> {
 *   getDealsByStage() {
 *     return groupDealsByStage(this.records);
 *   }
 * }
 *
 * const deals = useDataPage(DealsDataPage, useGetDeals());
 *
 * deals.records            // DealsListItemDto[] — tipizat din raspuns, fara `?? []`
 * deals.getDealsByStage()  // logica paginii
 * deals.reload()           // acelasi GET, aceleasi filtre
 * ```
 *
 * GET-ul ramane la vedere, in pagina: filtrele lui sunt tipul generat din spec
 * (`GetCompaniesParams`), diferit de la o pagina la alta, si nu trec prin
 * biblioteca.
 *
 * Dupa o mutatie nu trebuie sa chemi nimic: `DataHandler` scrie raspunsul in
 * cache, iar clasa paginii se reconstruieste cu datele noi. `updateItem` si
 * `removeItem` sunt pentru schimbarile pe care le faci tu, in afara mutatiilor.
 *
 * Nu cheama hook-uri — le primeste prin `useDataPage` — deci ramane logica
 * pura, testabila fara React. Membrii sunt in ordinea in care ii folosesti.
 */
export abstract class DataPage<TData> {
  // --- 1. Datele ----------------------------------------------------------

  /**
   * Randurile incarcate, indiferent daca raspunsul e o lista, o lista paginata
   * sau o singura inregistrare. Aceeasi referinta cat timp datele nu se schimba,
   * deci merge ca dependenta in `useMemo`.
   */
  readonly records: RecordsOf<TData>;

  /** Paginarea, cand raspunsul o are. Pentru o lista simpla: totalul e lungimea ei. */
  readonly total: number;
  readonly totalPages: number;
  readonly page: number;
  readonly limit: number;

  constructor(
    /** Rezultatul intreg al hook-ului generat, pentru ce nu e acoperit aici. */
    protected readonly query: PageQuery<TData>,
    protected readonly queryClient: QueryClient,
  ) {
    const pageInfo = DataHandler.readPageInfo(query.data);

    // `readRecords` stie doar de `RecordWithId`, fiindca la scriere doar `id`
    // conteaza. Aici stim mai mult: `RecordsOf<TData>` scoate tipul randului chiar
    // din raspunsul generat. E singurul loc din biblioteca in care legam cele doua.
    this.records = DataHandler.readRecords(query.data) as unknown as RecordsOf<TData>;
    this.total = pageInfo.total;
    this.totalPages = pageInfo.totalPages;
    this.page = pageInfo.page;
    this.limit = pageInfo.limit;
  }

  // --- 2. Starea incarcarii -----------------------------------------------

  /** Prima incarcare — inca n-avem nimic de afisat. */
  get isLoading() {
    return this.query.isLoading;
  }

  /** Orice cerere in zbor, inclusiv un reload peste date deja afisate. */
  get isFetching() {
    return this.query.isFetching;
  }

  get isError() {
    return this.query.isError;
  }

  /**
   * Cheia exacta a GET-ului, cu filtrele curente in ea. O dai lui
   * `DataHandler.reloadAfterWrite(dataPage.queryKey)` ca o scriere sa re-ceara
   * **doar** pagina asta, in loc de toata resursa.
   */
  get queryKey() {
    return this.query.queryKey;
  }

  // --- 3. Operatii --------------------------------------------------------

  /** Re-face GET-ul, cu aceleasi filtre. */
  reload() {
    void this.query.refetch();
  }

  /**
   * Scrie inregistrarea peste cea din cache — in lista paginii, dar si in
   * celelalte liste si in detaliul ei. Nu face niciun request.
   *
   * Primeste si o inregistrare partiala: se fuzioneaza peste ce era, deci poti da
   * doar campurile schimbate, plus `id`.
   */
  updateItem(record: RecordWithId & Partial<RecordsOf<TData>[number]>) {
    return DataHandler.writeRecordToCache(this.queryClient, this.getResourceName(), record);
  }

  /** Scoate inregistrarea din listele din cache. Nu face niciun request. */
  removeItem(recordId: RecordWithId["id"]) {
    return DataHandler.removeRecordFromCache(this.queryClient, this.getResourceName(), recordId);
  }

  /**
   * Pagina ceruta, adusa intre 1 si `totalPages`. Pentru butoanele de paginare,
   * ca sa nu ceri o pagina care nu exista.
   */
  clampPage(page: number) {
    return Math.min(Math.max(page, 1), this.totalPages);
  }

  /** Primul element al query key-ului: `["companies", params]` -> `"companies"`. */
  protected getResourceName() {
    return String(this.query.queryKey[0]);
  }
}

/**
 * Leaga clasa unei pagini de GET-ul ei. Singurul loc in care React intra in
 * joc: ia `QueryClient`-ul din context si construieste clasa la fiecare
 * randare, deci datele sunt mereu cele curente.
 *
 * Primeste clasa paginii, nu `DataPage` — fiind abstracta, compilatorul te
 * obliga sa o extinzi.
 */
export function useDataPage<TData, TPage extends DataPage<TData>>(
  PageClass: new (query: PageQuery<TData>, queryClient: QueryClient) => TPage,
  query: PageQuery<TData>,
): TPage {
  const queryClient = useQueryClient();

  return new PageClass(query, queryClient);
}
