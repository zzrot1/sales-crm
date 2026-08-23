# core

Cateva piese mici peste hook-urile generate de orval. Nu ascund orval —
hook-ul generat ramane la vedere in fiecare pagina, cu tipurile lui native.

## `useMutationSetup`

Elimina boilerplate-ul repetat la fiecare scriere: invalidare, toast si
rollback. Intoarce exact obiectul de optiuni pe care hook-urile orval il
accepta deja.

```ts
const setup = useMutationSetup({
  invalidates: ["companies", "contacts", "tasks"],
  success: "Contactul a fost salvat.",
  onSuccess: () => setEditingCompany(null),
});

const updateContact = useUpdateContact(setup);
updateContact.mutate({ contactId, data });
```

`invalidates` sunt nume de resurse din [`resources.ts`](./resources.ts).
Query key-urile orval incep cu path-ul endpoint-ului (`["/companies", params]`,
`["/companies/123"]`), deci path-ul resursei acopera lista, detaliile si
sub-rutele ei.

Fara `success`, nu apare toast la succes. Erorile afiseaza automat mesajul
venit de la API, prin [`ApiError`](./api-error.ts).

### Update optimist

Pentru cazurile in care UI-ul trebuie sa reactioneze inainte de raspuns
(kanban-ul de deal-uri). Snapshot-ul si rollback-ul pe eroare sunt automate.

```ts
const setup = useMutationSetup<
  { id: string; data: DealsUpdateRequest },
  DealsListItemDto
>({
  invalidates: ["deals", "companies", "tasks"],
  optimistic: {
    resource: "deals",
    id: ({ id }) => id,
    patch: (deal, { data }) => ({ ...deal, stage: data.stage ?? deal.stage }),
  },
});
```

Cei doi parametri de tip se dau explicit doar cand folosesti `optimistic` —
sunt variabilele mutatiei si elementul din lista.

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
`service-api/mutator/api-fetch.ts`, ca `error.message` sa fie mereu un text
afisabil. [`notifications.tsx`](./notifications.tsx) e toast-ul folosit de
`useMutationSetup`; provider-ul e montat in `providers/app-providers.tsx`.

## `resources.ts`

Tabelul nume ↔ path al resurselor CRM. Nu ambaleaza nimic din orval — exista
ca `invalidates` si verificarile de permisiuni sa foloseasca acelasi vocabular,
cu autocomplete si fara siruri scrise gresit.

```ts
export const resourcePaths = {
  companies: "/companies",
  contacts: "/contacts",
  // ...
} as const;
```

## `usePermissions`

```tsx
const { can } = usePermissions();

<button disabled={!can("update", "companies")}>Editeaza</button>
```

Citeste `GET /permissions/me`, care intoarce rolul si lista de permisiuni ale
utilizatorului curent. Nu are nevoie de provider: react-query deduplica cererea,
deci hook-ul poate fi apelat in oricate componente cu un singur request pe
sesiune. Cat timp se incarca, `can` intoarce `false`.

Spec-ul declara permisiunile doar ca `string[]`, deci formatul lor sta intr-un
singur loc, in `toPermissionKey` — daca backend-ul foloseste alt separator sau
alta ordine, se schimba doar acolo.

`GET /permissions` (matricea completa: roluri x actiuni x resurse) nu e folosit
aici — e pentru un eventual ecran de administrare a rolurilor.

Gating-ul din UI e doar pentru confort — autoritatea ramane backend-ul. Un 403
e deja tratat: [`api-error.ts`](./api-error.ts) il transforma in mesajul
"Nu ai permisiunea pentru aceasta actiune.", afisat automat de `useMutationSetup`.
