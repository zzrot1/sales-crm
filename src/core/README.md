# core

Patru piese mici peste hook-urile generate de orval. Nu ascund orval —
hook-ul generat ramane la vedere in fiecare pagina, cu tipurile lui native.

## `useMutationSetup`

Elimina boilerplate-ul repetat la fiecare scriere: invalidare, toast si
rollback. Intoarce exact obiectul de optiuni pe care hook-urile orval il
accepta deja.

```ts
const setup = useMutationSetup({
  invalidates: ["/companies", "/contacts", "/tasks"],
  success: "Contactul a fost salvat.",
  onSuccess: () => setEditingCompany(null),
});

const updateContact = useUpdateContact(setup);
updateContact.mutate({ contactId, data });
```

`invalidates` sunt prefixe de path. Query key-urile orval incep cu path-ul
endpoint-ului (`["/companies", params]`, `["/companies/123"]`), deci un prefix
acopera lista, detaliile si sub-rutele resursei.

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
  invalidates: ["/deals", "/companies", "/tasks"],
  optimistic: {
    path: "/deals",
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
