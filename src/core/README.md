# core

Piesele comune de peste hook-urile generate de orval. Nu ascund orval — hook-ul
generat ramane la vedere in fiecare pagina, cu tipurile lui native.

## `cache/` — datele paginilor si ce se intampla la scriere

Politica e legata o singura data, in [`orval.config.ts`](../../orval.config.ts),
prin `override.query.mutationOptions`. Orval o injecteaza in fiecare mutatie
generata, deci **paginile nu scriu nimic despre cache**:

```ts
const updateContact = useUpdateContact({
  mutation: { meta: { successMessage: "Contactul a fost salvat." } },
});

updateContact.mutate({ contactId, data });
```

Atat. Toast-ul de eroare, actualizarea listelor si re-cererea resurselor legate
vin de la sine.

### GET-ul care populeaza pagina: `DataPage`

Fiecare pagina isi extinde `DataPage` si pune acolo logica ei. Clasele paginilor
stau in
[`features/crm-pages/data-pages/`](../features/crm-pages/data-pages/):

```ts
export class CompaniesDataPage extends DataPage<PagedCompaniesResponse> {
  getContactForm(company: CompanyListItemDto): ContactForm { ... }
}
```

In pagina, il legi de GET-ul ei. Filtrele raman ale paginii — sunt tipul din
spec (`GetCompaniesParams`), diferit de la o pagina la alta:

```ts
const companies = useDataPage(
  CompaniesDataPage,
  useGetCompanies({ page: list.page, limit: list.limit, search: list.searchParamValue }),
);

companies.records              // CompanyListItemDto[] — tipizat, fara `?? []`
companies.total                // 128
companies.totalPages           // 6
companies.reload()             // acelasi GET, aceleasi filtre
companies.queryKey             // ["companies", { page: 1, ... }]
companies.getContactForm(row)  // logica paginii
```

Dupa o mutatie nu chemi nimic: clasa paginii se reconstruieste cu datele noi.
Vezi [`use-companies-page.ts`](../features/crm-pages/hooks/use-companies-page.ts).

### Ce se intampla la o scriere reusita

Implicit: daca serverul a intors inregistrarea, e scrisa peste cea din cache,
**fara niciun GET**; daca nu — o creare (id nou, care nu e in nicio lista), un
raspuns compus (`CompleteCallTaskResponse`), un rand din afara paginii incarcate
— resursa se re-cere. Stergerile scot inregistrarea din liste.

Plus, mereu, resursele din `alsoChanges` — cele pe care serverul le schimba in
acelasi timp si care nu se pot deduce din raspuns.

Cand vrei altceva, o spui la locul apelului, in `meta.cache`, cu una din
metodele statice ale lui `DataHandler`:

```ts
// inregistrarea e ingropata intr-un raspuns compus
meta: { cache: DataHandler.writeFromResponse((response: CompleteCallTaskResponse) => response.task) }

// nu ne bazam pe raspuns; re-cerem doar GET-ul paginii
meta: { cache: DataHandler.reloadAfterWrite(companies.queryKey) }

// schimbarea e exact ce am trimis: o aratam pe loc, si o dam inapoi daca esueaza
meta: { cache: DataHandler.writeOptimistically(
  (variables: { taskId: string; data: UpdateTaskNotesRequest }) => ({
    id: variables.taskId,
    notes: variables.data.notes,
  }),
) }

// scrierea nu tine date de afisat
meta: { cache: DataHandler.skipCacheWrite() }
```

Exemplu viu: notitele din
[`tasks-page.tsx`](../features/crm-pages/components/tasks-page.tsx) se scriu
optimist.

> `completeCallTask` ramane pe reload-ul implicit dinadins: serverul poate crea
> si un follow-up task, iar un rand nou nu se poate deduce din raspuns.

### Unde te uiti cand o pagina nu se actualizeaza

In consola, in dev, fiecare scriere lasa o linie:

```
[data] updateDeal: am actualizat 2 query-uri din "deals" | am re-cerut: tasks
[data] updateTaskNotes: am actualizat 3 query-uri din "tasks" (optimist) | am re-cerut: companies, deals
[data] completeCallTask: nimic de actualizat in "tasks" | am re-cerut: tasks, companies, deals
```

Daca scrie "nimic de actualizat" pentru un update, inseamna ca inregistrarea nu
era in cache — si atunci resursa se re-cere oricum.

### Unde sta codul

Logica e in biblioteca [`orval-data-handler`](../../packages/orval-data-handler/),
un pachet independent din `packages/` care nu stie nimic despre CRM. Acolo sunt
doua clase abstracte:

| Clasa | Cine o extinde | Raspunde de |
|---|---|---|
| `DataHandler` | aplicatia, o singura data | tot ce tine de date: citirea raspunsurilor, scrierea in cache, ce se intampla la fiecare mutatie |
| `DataPage` | fiecare pagina | datele incarcate de GET-ul paginii si logica ei |

In aplicatie au ramas doua fisiere de configurare, plus cate o clasa pe pagina:

| Fisier | Raspunde de |
|---|---|
| [`api-data-handler.ts`](./cache/api-data-handler.ts) | clasa care extinde `DataHandler`: ce resurse exista, exceptiile de la reguli, log-ul |
| [`mutation-options.ts`](./cache/mutation-options.ts) | custom hook-ul dat lui orval: leaga React (`useQueryClient`, toast-uri) de `apiDataHandler` |
| [`data-pages/`](../features/crm-pages/data-pages/) | cate o clasa pe pagina, care extinde `DataPage` |

Query key-urile sunt ierarhice (`["companies"]`, `["companies", params]`,
`["companies", companyId]`) fiindca orval genereaza cu `shouldSplitQueryKey: true`.
De-asta `invalidateQueries({ queryKey: ["companies"] })` prinde nativ si lista,
si detaliile — fara niciun predicat scris de mana.

### Cand adaugi un endpoint nou

**De regula, nimic.** Lista resurselor se genereaza din spec, in
[`api-resource-names.ts`](../service-api/generated/api-resource-names.ts), de
[`dev-tools/write-api-resource-names.mjs`](../../dev-tools/write-api-resource-names.mjs) —
rulat automat de orval prin `hooks.afterAllFilesWrite`. Un endpoint nou apare
singur dupa `npm run generate-webapi`, cu tot cu tipuri: `usePermissions` il
cunoaste, prospetimea i se aplica, scrierile lui se sincronizeaza.

Deschizi [`api-data-handler.ts`](./cache/api-data-handler.ts) doar in doua cazuri:

- o scriere lasa **alta** pagina cu date vechi -> o treci in `alsoChanges`
- datele au alt ritm decat un minut -> `staysFreshFor`

Cheile din `rules` sunt verificate de compilator, deci o resursa scoasa din spec
sau un nume gresit se vad imediat la `tsc`.

### Cand ai nevoie de altceva

`meta.errorMessage` inlocuieste mesajul venit de la server:

```ts
const updateDeal = useUpdateDeal({
  mutation: { meta: { errorMessage: "Nu am putut muta deal-ul. Incearca din nou." } },
});
```

`mutation.onSuccess` ramane al paginii — e chemat dupa sincronizarea cache-ului,
pentru ce tine strict de UI (inchis un dialog, navigat mai departe).

Pentru scrierile care nu trec prin hook-urile generate — importul, care ruleaza
in batch-uri — exista `DataHandler.invalidateResource(queryClient, "companies")`.

## `useListState`

Starea repetata de fiecare pagina de lista: `page`, `limit`, `search`, plus
sincronizarea cu un parametru din URL. Nu stie nimic despre API.

```ts
const list = useListState({ limit: 100, searchParam: "search" });

const query = useGetCompanies({
  page: list.page,
  limit: list.limit,
  search: list.searchParamValue,   // sirul gol devine undefined
});
```

Paginarea nu e clampata aici, fiindca `totalPages` vine din raspuns — o face
clasa paginii:

```ts
goToPage: (page: number) => list.setPage(companies.clampPage(page)),
```

## `ApiError` si `notifications`

[`api-error.ts`](./api-error.ts) normalizeaza erorile la granita din
[`service-api/mutator/api-fetch.ts`](../service-api/mutator/api-fetch.ts), ca
`error.message` sa fie mereu un text afisabil. `apiFetch` intoarce direct corpul
raspunsului — fara invelis `{ data, status, headers }` — deci `query.data` e
chiar DTO-ul.

[`notifications.tsx`](./notifications.tsx) e toast-ul folosit de politica de
mutatii; provider-ul e montat in
[`providers/app-providers.tsx`](../providers/app-providers.tsx).

## `usePermissions`

```tsx
const { can } = usePermissions();

<button disabled={!can("update", "companies")}>Editeaza</button>
```

Citeste `GET /permissions/me`, care intoarce rolul si permisiunile utilizatorului
curent. Nu are nevoie de provider: react-query deduplica cererea, deci hook-ul
poate fi apelat in oricate componente cu un singur request pe sesiune. Cat timp
se incarca, `can` intoarce `false`.

Spec-ul declara permisiunile doar ca `string[]`, deci formatul lor sta intr-un
singur loc, in `toPermissionKey`.

`GET /permissions` (matricea completa: roluri x actiuni x resurse) nu e folosit
aici — e pentru un eventual ecran de administrare a rolurilor.

Gating-ul din UI e doar pentru confort — autoritatea ramane backend-ul. Un 403 e
deja tratat: [`api-error.ts`](./api-error.ts) il transforma in mesajul
"Nu ai permisiunea pentru aceasta actiune.", afisat automat ca toast.
