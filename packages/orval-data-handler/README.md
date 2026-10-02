# orval-data-handler

Politica de date pentru clientii [react-query](https://tanstack.com/query)
generati de [orval](https://orval.dev).

Acopera cele doua momente din viata unei pagini:

1. **GET-ul initial** care o populeaza — despachetat tipizat intr-o clasa a paginii,
   cu filtrele lasate asa cum le-a generat orval
2. **scrierile** — pentru fiecare, pagina alege ce se intampla cu cache-ul:
   inregistrarea din raspuns se scrie peste cea veche, se mai face un GET, sau
   schimbarea se aplica optimist, din payload

Nu e un wrapper peste orval: hook-urile generate raman la vedere in pagini, cu
tipurile lor native.

## Doua clase abstracte

| Clasa | Cine o extinde | Raspunde de |
|---|---|---|
| `DataHandler` | aplicatia, **o singura data** | tot ce tine de date: cum se citesc raspunsurile, cum se scrie in cache, ce se intampla in jurul fiecarei scrieri |
| `DataPage` | **fiecare pagina** | datele incarcate de GET-ul paginii, starea incarcarii, operatiile pe randuri — si logica proprie paginii |

Nu se extind una pe alta: o pagina nu e o politica de API. `DataPage`
foloseste metodele statice ale lui `DataHandler` pentru citirea raspunsurilor si
scrierea in cache.

## Ce presupune despre API

| Presupunere | De ce |
|---|---|
| Query key-urile incep cu numele resursei | `orval` cu `shouldSplitQueryKey: true` |
| Inregistrarile au `id` (string sau number) | dupa el sunt gasite in cache |
| Raspunsurile sunt liste, liste paginate (`{ data: [] }`) sau o inregistrare | cele trei forme recunoscute |

Un raspuns care nu se incadreaza — un raport (`{ imported, skipped }`), unul
compus (`{ task, deal, company }`) — duce la re-cererea resursei. Nu e un caz de
eroare, e plasa de siguranta. Daca inregistrarea e totusi acolo, o scoti singur
cu `DataHandler.writeFromResponse((response) => response.task)`.

## Instalare

```bash
npm install orval-data-handler
```

Peer dependencies: `@tanstack/react-query` v5 si `react` >= 18.

---

# 1. Pagina: `DataPage`

Fiecare pagina isi extinde `DataPage` si pune acolo logica ei — filtre,
grupari, ce se afiseaza cum:

```ts
class DealsDataPage extends DataPage<DealsListItemDto[]> {
  getDealsByStage() {
    return groupDealsByStage(this.records);
  }
}
```

In pagina, il legi de GET-ul ei cu `useDataPage`. Filtrele raman unde le-a
pus orval: sunt tipul generat din spec (`GetCompaniesParams`), diferit de la o
pagina la alta, si nu trec prin biblioteca.

```ts
const deals = useDataPage(DealsDataPage, useGetDeals());

deals.records            // DealsListItemDto[] — tipizat din raspuns, fara `?? []`
deals.getDealsByStage()  // logica paginii
deals.total              // 128
deals.totalPages         // 6
deals.page
deals.limit
deals.isLoading          // prima incarcare
deals.isFetching         // orice cerere in zbor, inclusiv un reload
deals.isError
deals.queryKey           // ["deals"] — cu filtrele in ea, cand exista
deals.reload()           // acelasi GET, aceleasi filtre
deals.clampPage(99)      // pagina ceruta, adusa intre 1 si totalPages
deals.updateItem({ id, stage: "WON" })  // scrie in cache, fara request
deals.removeItem(id)                    // scoate din liste, fara request
```

`useDataPage` primeste clasa paginii, nu `DataPage`: fiind abstracta,
compilatorul te obliga sa o extinzi. O pagina fara logica proprie scrie o clasa
goala — are loc unde sa creasca.

`records` e tipizat din chiar raspunsul generat:

| Raspuns | `records` |
|---|---|
| `PagedCompaniesResponse` | `CompanyListItemDto[]` |
| `DealsListItemDto[]` | `DealsListItemDto[]` |
| `CompanyDto` | `CompanyDto[]` |

Si isi pastreaza referinta intre randari cat timp raspunsul nu se schimba —
spre deosebire de `query.data?.data ?? []`, care construieste alt array de
fiecare data si strica memoizarile de mai jos.

Dupa o mutatie **nu chemi nimic**: `DataHandler` scrie raspunsul in cache, iar
clasa paginii se reconstruieste cu datele noi. `updateItem` si `removeItem` sunt
pentru schimbarile pe care le faci tu, in afara mutatiilor.

`queryKey` e legatura cu partea a doua: trecut prin
`DataHandler.reloadAfterWrite(dataPage.queryKey)`, o scriere re-cere **exact**
GET-ul asta, cu filtrele lui, in loc de toata resursa.

---

# 2. Ce se intampla la o scriere

Fara nicio linie la locul apelului, o mutatie generata primeste deja: mesaj de
eroare, actualizarea cache-ului, si mesaj de succes daca pagina a cerut unul.

```ts
const updateContact = useUpdateContact({
  mutation: { meta: { successMessage: "Contactul a fost salvat." } },
});
```

Implicit, daca serverul a intors inregistrarea, ea e scrisa peste cea din cache
— **zero GET-uri**. Daca nu, resursa se re-cere.

Cand vrei altceva, il spui in `meta.cache`, cu una din metodele statice ale lui
`DataHandler`:

| Plan | Cand | Request-uri |
|---|---|---|
| `writeFromResponse(pick?)` | serverul intoarce inregistrarea, eventual ingropata intr-un raspuns compus | 0 |
| `reloadAfterWrite(...keys?)` | serverul calculeaza mai mult decat retrimite | 1 |
| `writeOptimistically(pick)` | schimbarea e chiar ce ai trimis si vrei sa se vada imediat | 0–1 |
| `skipCacheWrite()` | scrierea nu tine date de afisat | 0 |

Ele tipizeaza raspunsul si payload-ul **la locul apelului**: `meta` e
`Record<string, unknown>` pentru react-query si nu poate fi tipizat per mutatie,
asa ca tipul il scrii tu, din modelele generate.

### `writeFromResponse` — inregistrarea vine de la server

```ts
// POST /tasks/{taskId}/complete-call -> { task, deal, company, followUpTask }
const completeCall = useCompleteCallTask({
  mutation: {
    meta: {
      cache: DataHandler.writeFromResponse(
        (response: CompleteCallTaskResponse) => response.task,
      ),
    },
  },
});
```

Fara `pick`, raspunsul e luat ca atare daca are `id` la nivelul de sus — adica
exact comportamentul implicit.

Inregistrarea nu e inlocuita, ci **fuzionata**: `{ ...dinCache, ...deLaServer }`.
Asa supravietuiesc campurile denormalizate pe care lista le are si scrierea nu le
retrimite (`CompanyListItem = Company & { primaryContactEmail, ... }`).

> Atentie cand serverul creeaza si altceva. La exemplul de mai sus,
> `completeCallTask` poate crea si un `followUpTask` — un rand nou, care nu e in
> nicio lista. Cu `writeFromResponse` ai vedea task-ul actualizat, dar nu si pe
> cel nou. Acolo comportamentul implicit (re-cererea) e raspunsul corect.

### `reloadAfterWrite` — mai facem un GET

```ts
cache: DataHandler.reloadAfterWrite()                     // toata resursa: liste, detalii, sub-rute
cache: DataHandler.reloadAfterWrite(dataPage.queryKey)   // doar GET-ul care alimenteaza pagina asta
```

Pentru scrierile la care serverul calculeaza mai mult decat retrimite: un total
recalculat, o sortare care se schimba, randuri care intra sau ies din filtrul
curent. Cu chei explicite, restul resursei ramane neatins.

### `writeOptimistically` — scriem din payload, inainte de raspuns

```ts
const updateNotes = useUpdateTaskNotes({
  mutation: {
    meta: {
      cache: DataHandler.writeOptimistically(
        (variables: { taskId: string; data: UpdateTaskNotesRequest }) => ({
          id: variables.taskId,
          notes: variables.data.notes,
        }),
      ),
    },
  },
});
```

`pick` primeste chiar variabilele mutatiei, deci tipul vine din codul generat.
Trebuie sa intoarca `id`-ul: dupa el e gasita inregistrarea. La o operatie de
stergere e de ajuns `id`-ul — randul dispare din liste imediat.

Ce se intampla, in ordine:

1. GET-urile resursei in zbor sunt anulate, ca un raspuns intarziat sa nu stearga scrierea
2. starea cache-ului e copiata, si peste ea se scrie ce a dat `pick`
3. **daca cererea reuseste**, sincronizarea normala merge mai departe: raspunsul e
   scris peste varianta optimista, sau resursa se re-cere. Ce a ghicit pagina e
   inlocuit de adevarul serverului, nu lasat asa
4. **daca esueaza**, copia e pusa la loc si ramane doar toast-ul de eroare

Copia sta intr-un `WeakMap` cheiat pe obiectul de variabile al mutatiei, nu in
contextul ei. Asa `onMutate`-ul paginii isi pastreaza contextul neatins, iar doua
scrieri paralele nu se incurca.

### `skipCacheWrite` — nu atingem cache-ul

Pentru un ping, o urmarire. Mesajele de succes si eroare merg mai departe:
planul e doar despre cache.

### Ce ramane al paginii

`mutation.onSuccess` / `onError` / `onMutate` sunt chemate **dupa** ale noastre,
nu inlocuite, si primesc contextul lor, neatins:

```ts
const updateContact = useUpdateContact({
  mutation: {
    meta: { successMessage: "Contactul a fost salvat." },
    onSuccess: () => setEditingCompany(null),   // strict UI
  },
});
```

---

# 3. Legarea in aplicatie

### 3.1 Extinde `DataHandler`

Un singur membru e obligatoriu: `resourceNames`. Restul au valori implicite.

```ts
// src/api-data-handler.ts
import { DataHandler, type ResourceRules } from "orval-data-handler";

type Resource = "companies" | "contacts" | "deals";

class ApiDataHandler extends DataHandler<Resource> {
  protected readonly resourceNames = ["companies", "contacts", "deals"] as const;

  // Doar exceptiile. Implicit: proaspete un minut, nicio alta resursa re-ceruta.
  protected readonly rules: ResourceRules<Resource> = {
    contacts: { alsoChanges: ["companies", "deals"] },
  };
}

export const apiDataHandler = new ApiDataHandler();
```

`alsoChanges` sunt resursele pe care serverul le modifica in acelasi timp si care
nu se pot deduce din raspuns. Se re-cer **mereu**, indiferent de plan.

Poti suprascrie si `defaultRules`, `getErrorMessage`, `isDeleteOperation` si
`onWriteCompleted`.

### 3.2 Scrie custom hook-ul pe care il primeste orval

Clasa nu cheama hook-uri; le primeste. Aici se leaga React de ea.

```ts
// src/mutation-options.ts
import { useQueryClient, type UseMutationOptions } from "@tanstack/react-query";

import { apiDataHandler } from "./api-data-handler";

export function useApiMutationOptions<TData, TError, TVariables, TContext>(
  options: UseMutationOptions<TData, TError, TVariables, TContext>,
  endpoint: { url: string },
  operation: { operationId: string; operationName: string },
) {
  const queryClient = useQueryClient();
  const { notify } = useNotifications();

  return apiDataHandler.buildMutationOptions(options, endpoint, operation, {
    notify,
    queryClient,
  });
}
```

> **Trebuie sa fie o declaratie literala cu trei parametri.** Orval parseaza
> fisierul si numara parametrii ca sa stie cate argumente sa trimita. Cu mai
> putini, nu mai trimite al treilea argument — deci se pierde numele operatiei si
> odata cu el recunoasterea stergerilor.

`notify` e optional: fara el, `meta.successMessage` si mesajele de eroare sunt ignorate.

### 3.3 Leaga-l in `orval.config.ts`

```ts
output: {
  client: "react-query",
  override: {
    query: {
      shouldSplitQueryKey: true,
      mutationOptions: {
        path: "./src/mutation-options.ts",
        name: "useApiMutationOptions",
      },
    },
  },
}
```

### 3.4 Aplica prospetimea pe `QueryClient`

```ts
const queryClient = new QueryClient();
apiDataHandler.applyQueryDefaults(queryClient);
```

### 3.5 `meta` tipat (optional)

```ts
import type { WriteMeta } from "orval-data-handler";

declare module "@tanstack/react-query" {
  interface Register {
    mutationMeta: WriteMeta;
  }
}
```

Biblioteca nu face augmentarea in locul tau, ca sa poti adauga si campuri proprii.

---

## Debug

Fiecare scriere trece prin `onWriteCompleted`. Implicit, o linie in consola, in
afara de productie:

```
[data-handler] updateDeal: merged in "deals" (fromResponse) | reloaded: tasks
[data-handler] updateTaskNotes: merged in "tasks" (optimistic, applied early) | reloaded: -
[data-handler] createCompany: reloaded in "companies" (fromResponse) | reloaded: companies, tasks
```

| Simptom | Cauza probabila | Unde repari |
|---|---|---|
| **Alta** pagina ramane cu date vechi | resursa lipseste din `alsoChanges` | `rules` |
| Nu apare nicio linie de log | URL-ul nu incepe cu o resursa din `resourceNames` | `resourceNames` |
| `reloaded` la un simplu update | raspunsul n-are `id` la nivelul de sus | `writeFromResponse(pick)` |
| Prea multe request-uri | `alsoChanges` prea larg | `rules` |
| Un rand nou nu apare | a fost scris doar raspunsul, nu si lista | `reloadAfterWrite()` |

Suprascrie `onWriteCompleted` ca sa schimbi formatul. Primeste evenimentul intreg:

```ts
type WriteEvent<TResource> = {
  operationName: string;
  resourceName: TResource;
  outcome: "merged" | "removed" | "reloaded" | "skipped";
  strategy: "fromResponse" | "reload" | "optimistic" | "skip";
  wasOptimistic: boolean;
  updatedQueryKeys: readonly QueryKey[];
  reloadedResources: readonly TResource[];
  reloadedQueryKeys: readonly QueryKey[];
};
```

## API

**`DataPage<TData>`** *(abstracta — o extinde fiecare pagina)*

| Membru | Ce face |
|---|---|
| `records`, `total`, `totalPages`, `page`, `limit` | datele si paginarea, citite din raspuns |
| `isLoading`, `isFetching`, `isError`, `queryKey` | starea GET-ului |
| `reload()` | re-face GET-ul, cu aceleasi filtre |
| `updateItem(record)`, `removeItem(id)` | scrieri in cache, fara request |
| `clampPage(page)` | pagina ceruta, adusa intre 1 si `totalPages` |

**`useDataPage(PageClass, query)`** — construieste clasa paginii
din GET-ul ei. Singurul hook din biblioteca.

**`DataHandler<TResource>`** *(abstracta — o extinde aplicatia o data)*

De instanta — politica:

| Membru | Ce face |
|---|---|
| `resourceNames` *(abstract)* | numele resurselor |
| `rules`, `defaultRules` | exceptiile si valorile implicite |
| `getErrorMessage`, `isDeleteOperation`, `onWriteCompleted` | puncte de suprascriere |
| `buildMutationOptions(options, endpoint, operation, context)` | optiunile date mutatiilor generate |
| `applyQueryDefaults(queryClient)` | leaga `staysFreshFor` de client |
| `getRulesFor(resource)`, `resolveResourceName(urlOrQueryKey)` | introspectie |

Statice — mecanica, fara configurare:

| Metoda | Ce face |
|---|---|
| `writeFromResponse`, `reloadAfterWrite`, `writeOptimistically`, `skipCacheWrite` | planurile pentru `meta.cache` |
| `writeRecordToCache(queryClient, resource, record)` | fuzioneaza inregistrarea in toate query-urile resursei |
| `removeRecordFromCache(queryClient, resource, id)` | o scoate din liste |
| `invalidateResource(queryClient, resource)` | marcheaza resursa ca invechita |
| `invalidateQueries(queryClient, queryKeys)` | la fel, dar doar pentru cheile date |
| `readRecords(response)`, `readPageInfo(response)` | citesc un raspuns, indiferent de forma |

`writeRecordToCache` si `removeRecordFromCache` intorc query key-urile modificate;
un array gol inseamna "inregistrarea nu era in cache". Metodele statice merg si
in afara mutatiilor generate — un import care ruleaza in batch-uri, de exemplu:
`DataHandler.invalidateResource(queryClient, "companies")`.

Tipuri exportate: `ResourceRules`, `WriteMeta`, `WriteEvent`. Restul formelor
sunt scrise inline, acolo unde se folosesc.

## Licenta

MIT
