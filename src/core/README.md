# core

Piesele comune de peste hook-urile generate de orval. Nu ascund orval — hook-ul
generat ramane la vedere in fiecare pagina, cu tipurile lui native.

## `cache/` — sincronizarea datelor dupa fiecare scriere

Politica de cache e legata o singura data, in [`orval.config.ts`](../../orval.config.ts),
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

### Ce se intampla la o scriere reusita

[`sync-cache-after-write.ts`](./cache/sync-cache-after-write.ts), trei cazuri:

1. **operatia sterge** (`deleteCompany`) — inregistrarea iese din listele din cache
2. **serverul a intors inregistrarea** (`updateDeal` -> `DealsDealDto`) — o scriem
   peste cea veche, **fara niciun GET**. Asta e echivalentul lui `updateItem`
   dintr-un view model
3. **nu s-a putut actualiza nimic** — se re-cere resursa. Acopera de la sine
   crearile (id nou, care nu e in nicio lista), raspunsurile compuse
   (`CompleteCallTaskResponse`) si inregistrarile din afara paginii incarcate

Plus, mereu, resursele din `alsoChanges` — cele pe care serverul le schimba in
acelasi timp si care nu se pot deduce din raspuns.

### Unde te uiti cand o pagina nu se actualizeaza

In consola, in dev, fiecare scriere lasa o linie:

```
[cache] updateDeal: am actualizat 2 query-uri din "deals" | am re-cerut: tasks
[cache] completeCallTask: nimic de actualizat in "tasks" | am re-cerut: tasks, companies, deals
```

Daca scrie „nimic de actualizat" pentru o operatie de update, inseamna ca
inregistrarea nu era in cache — si atunci resursa se re-cere oricum.

### Fisierele

| Fisier | Raspunde de |
|---|---|
| [`api-resources.ts`](./cache/api-resources.ts) | tabelul resurselor: cat raman proaspete si ce mai schimba fiecare scriere |
| [`cached-response.ts`](./cache/cached-response.ts) | singurul loc care stie formele unui raspuns (lista, lista paginata, o inregistrare) |
| [`resource-cache.ts`](./cache/resource-cache.ts) | singurul loc care scrie in cache-ul react-query |
| [`sync-cache-after-write.ts`](./cache/sync-cache-after-write.ts) | decizia: ce se face dupa o scriere reusita |
| [`mutation-options.ts`](./cache/mutation-options.ts) | [orval] politica injectata in fiecare mutatie |
| [`query-defaults.ts`](./cache/query-defaults.ts) | prospetimea per resursa, legata de `QueryClient` |

Query key-urile sunt ierarhice (`["companies"]`, `["companies", params]`,
`["companies", companyId]`) fiindca orval genereaza cu `shouldSplitQueryKey: true`.
De-asta `invalidateQueries({ queryKey: ["companies"] })` prinde nativ si lista,
si detaliile — fara niciun predicat scris de mana.

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
in batch-uri — exista `refreshResource(queryClient, "companies")`.

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

Paginarea nu e clampata aici, fiindca `totalPages` vine din raspuns:

```ts
goToPage: (page: number) => list.setPage(Math.min(Math.max(page, 1), totalPages)),
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
