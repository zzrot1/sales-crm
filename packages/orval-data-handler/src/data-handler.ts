import type { QueryClient, QueryKey, UseMutationOptions } from "@tanstack/react-query";

/**
 * Contractul dupa care gasim o inregistrare in cache: are `id`.
 * `number` e acolo fiindca destule API-uri numeroteaza utilizatorii.
 */
export type RecordWithId = { id: string | number };

/**
 * Inregistrarile dintr-un raspuns, la nivel de tip. Perechea de compilare a lui
 * `DataHandler.readRecords`, ca `dataPage.records` sa fie tipizat fara adnotari:
 *
 *   `PagedCompaniesResponse` -> `CompanyListItemDto[]`
 *   `DealsListItemDto[]`     -> `DealsListItemDto[]`
 *   `CompanyDto`             -> `CompanyDto[]`
 *
 * Parantezele drepte opresc distributia pe union-uri: fara ele,
 * `Response | undefined` s-ar imparti in doua ramuri si am ajunge la `undefined[]`.
 */
export type RecordsOf<TResponse> = [NonNullable<TResponse>] extends [
  readonly (infer TRecord)[],
]
  ? TRecord[]
  : [NonNullable<TResponse>] extends [{ data: readonly (infer TRecord)[] }]
    ? TRecord[]
    : NonNullable<TResponse>[];

/**
 * Exceptiile de la `defaultRules`, per resursa. Ce lipseste se completeaza de acolo.
 *
 * `alsoChanges` sunt resursele pe care serverul le modifica in acelasi timp si
 * care NU se pot deduce din raspuns — de exemplu cand statusul unei companii
 * apare copiat si in lista de task-uri. Le pui aici cand vezi ca o **alta** pagina
 * ramane cu date vechi dupa o scriere.
 *
 * `staysFreshFor` e in ms; `Number.POSITIVE_INFINITY` inseamna "doar la
 * reincarcarea paginii sau la invalidare explicita".
 */
export type ResourceRules<TResource extends string> = Partial<
  Record<TResource, { staysFreshFor?: number; alsoChanges?: readonly TResource[] }>
>;

/**
 * Ce se intampla cu cache-ul in jurul unei scrieri. Nu-l construiesti de mana:
 * il iei din `DataHandler.writeFromResponse`, `reloadAfterWrite`,
 * `writeOptimistically` sau `skipCacheWrite` — ele tipizeaza raspunsul si
 * payload-ul la locul apelului, ceea ce `meta` singur nu poate.
 */
export type WritePlan =
  | {
      readonly strategy: "fromResponse";
      readonly pickRecord: (response: unknown) => RecordWithId | undefined;
    }
  | { readonly strategy: "reload"; readonly queryKeys: readonly QueryKey[] }
  | {
      readonly strategy: "optimistic";
      readonly pickRecord: (variables: unknown) => RecordWithId | undefined;
    }
  | { readonly strategy: "skip" };

/**
 * Ce poate cere un call site prin `mutation.meta`. Aplicatia il leaga de
 * `Register` din `@tanstack/react-query` ca sa primeasca autocomplete —
 * biblioteca nu o face in locul ei, ca sa poti adauga si campuri proprii.
 */
export type WriteMeta = {
  successMessage?: string;
  errorMessage?: string;
  /** Ce se intampla cu cache-ul. Fara el: `writeFromResponse()`. */
  cache?: WritePlan;
};

/** Ce primeste `onWriteCompleted` dupa fiecare scriere reusita. */
export type WriteEvent<TResource extends string> = {
  operationName: string;
  resourceName: TResource;
  /**
   * `merged` / `removed` inseamna zero request-uri pentru resursa asta —
   * inregistrarea a fost schimbata direct in cache. `reloaded` inseamna ca nu
   * s-a putut, sau ca pagina a cerut-o explicit, deci s-a mai facut un GET.
   */
  outcome: "merged" | "removed" | "reloaded" | "skipped";
  /** Planul cerut de call site prin `meta.cache`, sau cel implicit. */
  strategy: WritePlan["strategy"];
  /** Daca payload-ul a fost scris in cache inainte de raspuns. */
  wasOptimistic: boolean;
  /** Query key-urile chiar modificate in cache. */
  updatedQueryKeys: readonly QueryKey[];
  /** Resursele re-cerute intregi. */
  reloadedResources: readonly TResource[];
  /** Query key-urile re-cerute tintit, prin `reloadAfterWrite(key)`. */
  reloadedQueryKeys: readonly QueryKey[];
};

/** Starea query-urilor unei resurse, copiata ca sa poata fi pusa la loc. */
type CacheSnapshot = readonly (readonly [QueryKey, unknown])[];

/**
 * Tot ce tine de date: cum se citesc raspunsurile, cum se scrie in cache-ul
 * react-query si ce se intampla in jurul fiecarei scrieri.
 *
 * Doua jumatati, despartite dupa cum depind de configurare:
 *
 *  - **statice** — mecanica pura: citeste un raspuns, scrie sau scoate o
 *    inregistrare, invalideaza o resursa. N-au nevoie de nicio instanta, deci le
 *    foloseste si `DataPage`, si orice cod care scrie in cache pe cont propriu
 *    (un import care ruleaza in batch-uri, de exemplu).
 *  - **de instanta** — politica unui API: ce resurse exista, cat stau proaspete,
 *    ce se intampla dupa o mutatie. O extinzi **o singura data** pe aplicatie.
 *
 * ```ts
 * class ApiDataHandler extends DataHandler<"companies" | "deals"> {
 *   protected readonly resourceNames = ["companies", "deals"] as const;
 *   protected readonly rules: ResourceRules<"companies" | "deals"> = {
 *     companies: { alsoChanges: ["deals"] },
 *   };
 * }
 * ```
 *
 * Dupa aceea fiecare `useCreate*` / `useUpdate*` / `useDelete*` generat de orval
 * primeste, fara nicio linie la locul apelului: mesaj de eroare, actualizarea
 * cache-ului si mesaj de succes daca pagina a cerut unul.
 *
 * Membrii sunt in ordinea in care ii intalnesti.
 */
export abstract class DataHandler<TResource extends string> {
  // --- 1. Ce dai tu -------------------------------------------------------

  /**
   * Numele resurselor, adica primul segment al rutelor (`/companies/{id}`) si
   * primul element al query key-urilor (`["companies", params]`). A doua parte
   * e adevarata doar daca generezi cu `shouldSplitQueryKey: true`.
   *
   * Ce nu e in lista e ignorat complet: scrierile catre `/auth/logout` nu ating
   * cache-ul daca `"auth"` lipseste de aici. E util tocmai pentru rutele care
   * nu tin date de afisat.
   */
  protected abstract readonly resourceNames: readonly TResource[];

  /** Doar exceptiile. Vezi `ResourceRules` pentru cand adaugi ceva aici. */
  protected readonly rules: ResourceRules<TResource> = {};

  /**
   * Ce se aplica resurselor care nu apar in `rules`: date proaspete un minut si
   * nicio alta resursa re-ceruta. O resursa noua merge corect fara sa scrii nimic.
   */
  protected readonly defaultRules = {
    alsoChanges: [] as readonly TResource[],
    staysFreshFor: 60_000,
  };

  // --- 2. Ce legi in aplicatie --------------------------------------------

  /**
   * Optiunile primite de fiecare mutatie generata.
   *
   * Se cheama din custom hook-ul pe care orval il primeste prin
   * `output.override.query.mutationOptions`. Primele trei argumente vin de la
   * orval; al patrulea e tot ce tine de React, fiindca aici suntem in afara lui:
   * clasa nu cheama hook-uri, deci ramane logica pura, testabila fara React.
   *
   * Ce trimite pagina in `mutation: { ... }` ramane valabil — callback-urile ei
   * sunt chemate dupa ale noastre, nu inlocuite, si primesc contextul lor, neatins.
   */
  buildMutationOptions<TData, TError, TVariables, TContext>(
    options: UseMutationOptions<TData, TError, TVariables, TContext>,
    endpoint: { url: string },
    operation: { operationName: string },
    {
      queryClient,
      notify = () => {},
    }: {
      queryClient: QueryClient;
      /** Fara ea, `meta.successMessage` si mesajele de eroare sunt ignorate. */
      notify?: (level: "success" | "error", message: string) => void;
    },
  ): UseMutationOptions<TData, TError, TVariables, TContext> {
    const meta = DataHandler.extractWriteMeta(options.meta);
    const plan = meta.cache ?? DataHandler.defaultWritePlan;
    const resourceName = this.resolveResourceName(endpoint.url);
    const { operationName } = operation;

    // Ruta necunoscuta: n-avem ce sincroniza si nici ce raporta. Mesajele si
    // callback-urile paginii merg mai departe, ca oricand.
    const syncsCache = resourceName !== undefined;

    return {
      ...options,

      // Il punem doar cand chiar avem de scris inainte de raspuns; altfel
      // `options.onMutate` ramane exact cum l-a dat pagina.
      ...(syncsCache && plan.strategy === "optimistic"
        ? {
            onMutate: async (
              variables: TVariables,
              context: Parameters<
                NonNullable<
                  UseMutationOptions<TData, TError, TVariables, TContext>["onMutate"]
                >
              >[1],
            ) => {
              await this.applyOptimisticWrite(
                queryClient,
                resourceName,
                operationName,
                plan,
                variables,
              );

              // Fara `onMutate` la locul apelului, contextul e `undefined` —
              // exact ce ar fi produs si react-query singur.
              return (await options.onMutate?.(variables, context)) as TContext;
            },
          }
        : {}),

      onError: (...args) => {
        const snapshot = this.takeOptimisticWrite(args[1]);

        if (snapshot) {
          DataHandler.restoreSnapshot(queryClient, snapshot);
        }

        notify("error", meta.errorMessage ?? this.getErrorMessage(args[0]));

        return options.onError?.(...args);
      },

      onSuccess: (...args) => {
        if (syncsCache) {
          this.runWritePlan({
            operationName,
            plan,
            queryClient,
            resourceName,
            response: args[0],
            wasOptimistic: this.takeOptimisticWrite(args[1]) !== undefined,
          });
        }

        if (meta.successMessage) {
          notify("success", meta.successMessage);
        }

        return options.onSuccess?.(...args);
      },
    };
  }

  /**
   * De chemat o data, la construirea `QueryClient`-ului, ca `staysFreshFor` sa
   * se aplice. Merge fiindca fiecare query key incepe cu numele resursei, deci
   * un default pus pe `["companies"]` acopera si lista, si detaliile, si
   * sub-rutele ei.
   */
  applyQueryDefaults(queryClient: QueryClient) {
    this.resourceNames.forEach((resourceName) => {
      queryClient.setQueryDefaults([resourceName], {
        staleTime: this.getRulesFor(resourceName).staysFreshFor,
      });
    });
  }

  // --- 3. Planuri de scriere, la locul apelului ---------------------------
  //
  // Le pui in `mutation.meta.cache`. Fara niciunul, se aplica `writeFromResponse()`.

  /**
   * **Serverul a intors inregistrarea modificata** — o scriem peste cea din cache,
   * fara niciun GET. Asta se intampla implicit, deci il scrii doar cand
   * inregistrarea e ingropata intr-un raspuns compus:
   *
   * ```ts
   * // POST /tasks/{taskId}/complete-call -> { task, deal, company, followUpTask }
   * cache: DataHandler.writeFromResponse((response: CompleteCallTaskResponse) => response.task)
   * ```
   *
   * Daca inregistrarea nu e nicaieri in cache — o creare, sau un rand de pe alta
   * pagina — nu e o eroare: resursa se re-cere de la sine.
   */
  static writeFromResponse<TResponse>(
    pickRecord?: (response: TResponse) => RecordWithId | null | undefined,
  ): WritePlan {
    return {
      pickRecord: (response) =>
        DataHandler.toRecord(pickRecord ? pickRecord(response as TResponse) : response),
      strategy: "fromResponse",
    };
  }

  /**
   * **Mai facem un GET** — pentru scrierile la care serverul calculeaza mai mult
   * decat retrimite: un total recalculat, o sortare care se schimba, randuri care
   * intra sau ies din filtrul curent.
   *
   * ```ts
   * cache: DataHandler.reloadAfterWrite()                     // toata resursa
   * cache: DataHandler.reloadAfterWrite(dataPage.queryKey)   // doar GET-ul paginii
   * ```
   */
  static reloadAfterWrite(...queryKeys: readonly QueryKey[]): WritePlan {
    return { queryKeys, strategy: "reload" };
  }

  /**
   * **Actualizare optimista** — scriem in cache din payload, *inainte* de raspuns.
   * UI-ul se misca instant; daca cererea esueaza, cache-ul e pus la loc.
   *
   * ```ts
   * cache: DataHandler.writeOptimistically(
   *   (variables: { taskId: string; data: UpdateTaskNotesRequest }) => ({
   *     id: variables.taskId,
   *     notes: variables.data.notes,
   *   }),
   * )
   * ```
   *
   * Trebuie sa intoarca `id`-ul: dupa el e gasita inregistrarea. Dupa raspuns,
   * ce a ghicit pagina e inlocuit de adevarul serverului, nu lasat asa.
   */
  static writeOptimistically<TVariables>(
    pickRecord: (variables: TVariables) => RecordWithId,
  ): WritePlan {
    return {
      pickRecord: (variables) => DataHandler.toRecord(pickRecord(variables as TVariables)),
      strategy: "optimistic",
    };
  }

  /**
   * **Nu atingem cache-ul.** Pentru scrierile care nu tin date de afisat: un
   * ping, o urmarire. Mesajele de succes si eroare merg mai departe.
   */
  static skipCacheWrite(): WritePlan {
    return { strategy: "skip" };
  }

  // --- 4. Ce poti suprascrie ----------------------------------------------

  /**
   * Chemat dupa fiecare scriere reusita. Implicit scrie o linie in consola, in
   * afara de productie — primul loc in care te uiti cand o pagina nu se
   * actualizeaza. Suprascrie-l ca sa schimbi formatul sau sa trimiti telemetrie.
   */
  protected onWriteCompleted(event: WriteEvent<TResource>) {
    // Citit prin `globalThis` ca biblioteca sa nu depinda de tipurile de Node:
    // `process` nu exista in browser, iar bundler-ul il inlocuieste la build.
    const nodeEnv = (globalThis as { process?: { env?: { NODE_ENV?: string } } }).process?.env
      ?.NODE_ENV;

    if (nodeEnv === "production") {
      return;
    }

    console.debug(
      `[data-handler] ${event.operationName}: ${event.outcome} in "${event.resourceName}"` +
        ` (${event.strategy}${event.wasOptimistic ? ", applied early" : ""})` +
        ` | reloaded: ${event.reloadedResources.join(", ") || "-"}`,
      [...event.updatedQueryKeys, ...event.reloadedQueryKeys],
    );
  }

  /**
   * Textul afisat cand o mutatie esueaza, daca pagina n-a dat `meta.errorMessage`.
   * Suprascrie-l daca ai deja un tip de eroare normalizat, cu mesajul serverului.
   */
  protected getErrorMessage(error: unknown) {
    return error instanceof Error ? error.message : "The request failed.";
  }

  /**
   * Daca operatia sterge. Numele ei e singura informatie disponibila: metoda
   * HTTP nu ajunge pana aici.
   *
   * Conteaza, fiindca un `DELETE` intoarce de multe ori chiar inregistrarea
   * stearsa — fara verificarea asta am scrie-o inapoi in lista in loc sa o
   * scoatem. Suprascrie-l daca API-ul tau foloseste alt prefix (`remove`, `archive`).
   */
  protected isDeleteOperation(operationName: string) {
    return operationName.startsWith("delete");
  }

  // --- 5. Scrieri directe in cache (statice) ------------------------------
  //
  // Nicio decizie, niciun request, nicio regula: doar mecanica. Cine le cheama
  // hotaraste cand si de ce.
  //
  // `writeRecordToCache` si `removeRecordFromCache` intorc query key-urile pe care
  // chiar le-au schimbat. **Un array gol e informatie, nu esec**: inseamna ca
  // inregistrarea nu era in cache, iar apelantul stie ca trebuie sa o ceara.

  /**
   * Pune inregistrarea peste cea din cache, in toate query-urile resursei:
   * liste, liste paginate si detaliu, deodata.
   *
   * Fuziune, nu inlocuire: inregistrarea din lista are de obicei si campuri
   * denormalizate pe care scrierea nu le retrimite
   * (`CompanyListItem = Company & { primaryContactEmail, ... }`). Un replace brut
   * ar goli coloane din tabel.
   */
  static writeRecordToCache(
    queryClient: QueryClient,
    resourceName: string,
    record: RecordWithId,
  ) {
    return DataHandler.updateMatchingQueries(queryClient, resourceName, (cached) =>
      DataHandler.mapResponseRecords(cached, (records) =>
        records.some((cachedRecord) => cachedRecord.id === record.id)
          ? records.map((cachedRecord) =>
              cachedRecord.id === record.id ? { ...cachedRecord, ...record } : cachedRecord,
            )
          : // Nu e aici — alta pagina, alt filtru. Lasam query-ul neatins.
            undefined,
      ),
    );
  }

  /**
   * Scoate inregistrarea din listele din cache.
   *
   * Query-ul de detaliu (`["companies", id]`) ramane pe loc: nu are sens sa-l
   * golesti, iar cine e pe pagina aceea navigheaza oricum in alta parte.
   */
  static removeRecordFromCache(
    queryClient: QueryClient,
    resourceName: string,
    recordId: RecordWithId["id"],
  ) {
    return DataHandler.updateMatchingQueries(queryClient, resourceName, (cached) =>
      DataHandler.mapResponseRecords(cached, (records) => {
        const remaining = records.filter((record) => record.id !== recordId);

        return remaining.length === records.length ? undefined : remaining;
      }),
    );
  }

  /**
   * Marcheaza resursa ca invechita, cu tot ce tine de ea — `["companies"]`
   * prinde si lista, si detaliile, si sub-rutele.
   *
   * react-query re-cere doar query-urile montate acum; restul se reincarca data
   * viitoare cand o pagina le cere. Nu asteptam raspunsul, ca UI-ul sa
   * reactioneze imediat dupa scriere.
   */
  static invalidateResource(queryClient: QueryClient, resourceName: string) {
    void queryClient.invalidateQueries({ queryKey: [resourceName] });
  }

  /**
   * Acelasi lucru, dar tintit: doar query-urile date, nu toata resursa. Cheia
   * vine de la hook-ul generat (`dataPage.queryKey`), deci re-cererea atinge
   * exact GET-ul care alimenteaza pagina — cu filtrele ei cu tot.
   */
  static invalidateQueries(queryClient: QueryClient, queryKeys: readonly QueryKey[]) {
    queryKeys.forEach((queryKey) => {
      void queryClient.invalidateQueries({ queryKey });
    });
  }

  // --- 6. Citirea raspunsurilor (statice) ---------------------------------
  //
  // Un raspuns are una din trei forme:
  //
  //   lista simpla    `GET /deals`          -> `Deal[]`
  //   lista paginata  `GET /companies`      -> `{ data: Company[], total, totalPages, ... }`
  //   o inregistrare  `GET /companies/{id}` -> `Company`
  //
  // Metodele de aici si `mapResponseRecords` sunt singurul loc care cunoaste cele
  // trei forme. Daca API-ul mai adauga una, se schimba doar aici.

  /** Inregistrarile dintr-un raspuns, indiferent de forma. */
  static readRecords(response: unknown): RecordWithId[] {
    if (Array.isArray(response)) {
      return response;
    }

    const data = (response as { data?: unknown } | null | undefined)?.data;

    if (Array.isArray(data)) {
      return data;
    }

    const record = DataHandler.toRecord(response);

    return record ? [record] : [];
  }

  /**
   * Numerele de paginare, cand raspunsul le are. Lista simpla n-are: atunci
   * `total` e lungimea ei si e o singura pagina, ceea ce e adevarat.
   */
  static readPageInfo(response: unknown) {
    const records = DataHandler.readRecords(response);
    const paged = (response ?? {}) as Partial<
      Record<"limit" | "page" | "total" | "totalPages", unknown>
    >;

    const readNumber = (value: unknown, fallback: number) =>
      typeof value === "number" ? value : fallback;

    return {
      limit: readNumber(paged.limit, records.length),
      page: readNumber(paged.page, 1),
      total: readNumber(paged.total, records.length),
      totalPages: Math.max(readNumber(paged.totalPages, 1), 1),
    };
  }

  // --- 7. Introspectie ----------------------------------------------------

  /** Regulile efective ale unei resurse: `defaultRules` completat cu `rules`. */
  getRulesFor(resourceName: TResource) {
    return { ...this.defaultRules, ...this.rules[resourceName] };
  }

  /**
   * `"/companies/{id}"` sau `["companies", params]` -> `"companies"`.
   * `undefined` daca primul segment nu e in `resourceNames`, si atunci scrierea
   * nu atinge cache-ul.
   */
  resolveResourceName(source: string | QueryKey): TResource | undefined {
    const [first] = typeof source === "string" ? source.split("/").filter(Boolean) : source;

    return this.resourceNames.find((resourceName) => resourceName === first);
  }

  // --- 8. Inima: ce se intampla in jurul unei scrieri ----------------------

  /**
   * Inainte de cerere, pentru `writeOptimistically`: scriem in cache ce stim din
   * payload, ca UI-ul sa se miste instant.
   *
   * Copia de siguranta sta intr-un `WeakMap` cheiat pe chiar obiectul de
   * variabile, nu in contextul mutatiei — asa `onMutate`-ul paginii isi pastreaza
   * contextul, iar doua scrieri paralele nu se incurca. Cand variabilele nu sunt
   * un obiect n-avem pe ce cheia, deci sarim peste partea optimista; sincronizarea
   * de dupa raspuns merge oricum.
   */
  private async applyOptimisticWrite(
    queryClient: QueryClient,
    resourceName: TResource,
    operationName: string,
    plan: Extract<WritePlan, { strategy: "optimistic" }>,
    variables: unknown,
  ) {
    if (typeof variables !== "object" || variables === null) {
      return;
    }

    const record = plan.pickRecord(variables);

    if (!record) {
      return;
    }

    // Oprim GET-urile in zbor: un raspuns sosit dupa scrierea noastra ar sterge-o.
    await queryClient.cancelQueries({ queryKey: [resourceName] });

    const snapshot = DataHandler.snapshotResource(queryClient, resourceName);
    const updatedQueryKeys = this.isDeleteOperation(operationName)
      ? DataHandler.removeRecordFromCache(queryClient, resourceName, record.id)
      : DataHandler.writeRecordToCache(queryClient, resourceName, record);

    if (updatedQueryKeys.length) {
      this.optimisticWrites.set(variables, snapshot);
    }
  }

  /** Copia de siguranta, scoasa din evidenta: se foloseste o singura data. */
  private takeOptimisticWrite(variables: unknown) {
    if (typeof variables !== "object" || variables === null) {
      return undefined;
    }

    const snapshot = this.optimisticWrites.get(variables);
    this.optimisticWrites.delete(variables);

    return snapshot;
  }

  /**
   * Dupa raspuns. Trei cai, dupa planul cerut de call site:
   *
   *  1. `fromResponse` — serverul a intors inregistrarea -> o scriem peste cea
   *     veche, zero request-uri
   *  2. `reload`       — o cerem de la server, tintit sau pe toata resursa
   *  3. `optimistic`   — cache-ul e deja scris; raspunsul, daca e o inregistrare,
   *     il confirma cu adevarul serverului
   *
   * Peste toate, plasa de siguranta: daca n-am putut schimba nimic in cache — o
   * creare (id nou, care nu e in nicio lista), un raspuns compus, o inregistrare
   * din afara paginii incarcate — resursa se re-cere. Nu e un caz de eroare.
   *
   * Si, mereu, resursele din `alsoChanges`: pe ele serverul le-a schimbat, iar
   * raspunsul nu spune cum.
   */
  private runWritePlan({
    operationName,
    plan,
    queryClient,
    resourceName,
    response,
    wasOptimistic,
  }: {
    operationName: string;
    plan: WritePlan;
    queryClient: QueryClient;
    resourceName: TResource;
    response: unknown;
    wasOptimistic: boolean;
  }) {
    if (plan.strategy === "skip") {
      this.onWriteCompleted({
        operationName,
        outcome: "skipped",
        reloadedQueryKeys: [],
        reloadedResources: [],
        resourceName,
        strategy: plan.strategy,
        updatedQueryKeys: [],
        wasOptimistic,
      });

      return;
    }

    const deletes = this.isDeleteOperation(operationName);
    const record = DataHandler.readResponseRecord(plan, response);

    const updatedQueryKeys = !record
      ? []
      : deletes
        ? DataHandler.removeRecordFromCache(queryClient, resourceName, record.id)
        : DataHandler.writeRecordToCache(queryClient, resourceName, record);

    const reloadedQueryKeys = plan.strategy === "reload" ? plan.queryKeys : [];
    const changedCache =
      updatedQueryKeys.length > 0 || wasOptimistic || reloadedQueryKeys.length > 0;

    const { alsoChanges } = this.getRulesFor(resourceName);
    const reloadedResources = changedCache ? alsoChanges : [resourceName, ...alsoChanges];

    DataHandler.invalidateQueries(queryClient, reloadedQueryKeys);
    reloadedResources.forEach((reloaded) =>
      DataHandler.invalidateResource(queryClient, reloaded),
    );

    this.onWriteCompleted({
      operationName,
      outcome:
        updatedQueryKeys.length || wasOptimistic ? (deletes ? "removed" : "merged") : "reloaded",
      reloadedQueryKeys,
      reloadedResources,
      resourceName,
      strategy: plan.strategy,
      updatedQueryKeys,
      wasOptimistic,
    });
  }

  /**
   * Cheiat pe obiectul de variabile al mutatiei, deci se curata singur: cand
   * mutatia se termina, nimeni nu mai tine obiectul si intrarea dispare.
   */
  private readonly optimisticWrites = new WeakMap<object, CacheSnapshot>();

  // --- 9. Ajutoare statice private ----------------------------------------

  /** Ce se intampla cand call site-ul n-a cerut nimic. */
  private static readonly defaultWritePlan = DataHandler.writeFromResponse();

  /**
   * Inregistrarea de scris in cache, luata din raspuns. `undefined` pentru
   * `reload`, unde raspunsul e ignorat din principiu, si pentru raspunsurile din
   * care nu se poate scoate una.
   */
  private static readResponseRecord(plan: WritePlan, response: unknown) {
    switch (plan.strategy) {
      case "fromResponse":
        return plan.pickRecord(response);
      // Cache-ul e deja scris din payload; raspunsul, daca e o inregistrare, il
      // corecteaza cu ce a calculat serverul.
      case "optimistic":
        return DataHandler.toRecord(response);
      default:
        return undefined;
    }
  }

  /**
   * Valoarea, daca e chiar o inregistrare. `undefined` pentru raspunsurile
   * compuse (`{ task, deal, company }`) si cele de tip raport
   * (`{ imported, skipped }`) — n-au `id` la nivelul de sus.
   */
  private static toRecord(value: unknown): RecordWithId | undefined {
    const id = (value as RecordWithId | undefined)?.id;

    return typeof id === "string" || typeof id === "number"
      ? (value as RecordWithId)
      : undefined;
  }

  /**
   * Rescrie inregistrarile din raspuns pastrandu-i forma. `mapRecords` intoarce
   * `undefined` pentru "nimic de schimbat aici", si atunci intoarcem si noi
   * `undefined` — la fel ca un updater react-query care nu modifica nimic.
   */
  private static mapResponseRecords(
    response: unknown,
    mapRecords: (records: RecordWithId[]) => RecordWithId[] | undefined,
  ): unknown {
    if (Array.isArray(response)) {
      return mapRecords(response);
    }

    if (typeof response !== "object" || response === null) {
      return undefined;
    }

    const { data } = response as { data?: unknown };

    if (Array.isArray(data)) {
      const nextData = mapRecords(data);

      return nextData && { ...response, data: nextData };
    }

    const record = DataHandler.toRecord(response);

    return record && mapRecords([record])?.[0];
  }

  /**
   * Trece prin query-urile resursei si le rescrie pe cele chiar schimbate.
   *
   * Parcurgem cache-ul explicit, in loc de `setQueriesData`, fiindca updater-ul
   * acela nu stie pe ce query key lucreaza — iar fara key-uri n-am putea spune ce
   * s-a schimbat, si actualizarea ar fi invizibila la debug.
   */
  private static updateMatchingQueries(
    queryClient: QueryClient,
    resourceName: string,
    getNextResponse: (cached: unknown) => unknown,
  ) {
    const changedQueryKeys: QueryKey[] = [];

    for (const query of queryClient.getQueryCache().findAll({ queryKey: [resourceName] })) {
      const nextResponse = getNextResponse(query.state.data);

      if (nextResponse === undefined) {
        continue;
      }

      queryClient.setQueryData(query.queryKey, nextResponse);
      changedQueryKeys.push(query.queryKey);
    }

    return changedQueryKeys;
  }

  /** Copiaza starea query-urilor resursei, ca sa poata fi pusa la loc. */
  private static snapshotResource(queryClient: QueryClient, resourceName: string): CacheSnapshot {
    return queryClient
      .getQueryCache()
      .findAll({ queryKey: [resourceName] })
      .map((query) => [query.queryKey, query.state.data] as const);
  }

  /**
   * Pune inapoi ce a copiat `snapshotResource`. Nu verifica daca intre timp
   * altcineva a scris peste: e compromisul standard al actualizarilor optimiste
   * din react-query. In practica fereastra e cat o cerere esuata.
   */
  private static restoreSnapshot(queryClient: QueryClient, snapshot: CacheSnapshot) {
    snapshot.forEach(([queryKey, data]) => queryClient.setQueryData(queryKey, data));
  }

  /**
   * `meta` e tipat de aplicatie, prin augmentarea lui `Register`. Aici nu ne putem
   * baza pe asta — e `Record<string, unknown>` — deci citim defensiv doar
   * campurile care ne intereseaza.
   */
  private static extractWriteMeta(meta: unknown) {
    const { cache, errorMessage, successMessage } = (meta ?? {}) as Record<string, unknown>;
    const strategy = (cache as WritePlan | undefined)?.strategy;
    const isWritePlan =
      strategy === "fromResponse" ||
      strategy === "reload" ||
      strategy === "optimistic" ||
      strategy === "skip";

    return {
      cache: isWritePlan ? (cache as WritePlan) : undefined,
      errorMessage: typeof errorMessage === "string" ? errorMessage : undefined,
      successMessage: typeof successMessage === "string" ? successMessage : undefined,
    };
  }
}
