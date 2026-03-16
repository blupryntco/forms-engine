# Data Fetching

## API Layer

### API Client Factory

```tsx
// shared/api/api.factory.ts
// Auto-generated typed API client
await api('Applications', { signal }).getApplications({ status, search, pagination })
await api('Licenses', { signal }).getLicense(licenseId)
await api('Users', { signal }).me()
```

- API namespaces match backend controllers (`'Applications'`, `'Licenses'`, `'Users'`)
- Always pass `signal` for request cancellation support
- Types auto-generated in `shared/api/generated/`

## Query Key Conventions

All query and mutation keys are defined in `shared/state/keys.ts` — see [state-management.md](state-management.md#centralized-query-key-factory) for the full factory pattern.

Keys follow a nested namespace pattern: `[context, domain, action, filters]`

```tsx
// Usage in query definitions — always reference keys factory
keys.queries.applications.list(mode, status, search)
keys.queries.licenses.details(licenseId)
keys.queries.auth.access
```

**Rules**:
- All keys live in `shared/state/keys.ts` — never define ad-hoc keys inline
- Mode/context as first element in object form when applicable
- Domain (plural) as second element
- Action/resource type as third element
- Filters always as final object

## Query Definition (Entity Model)

Queries are defined as factory functions in entity `model/` files:

```tsx
// entities/applications/applications-list/model/applications.ts
export const applicationsQuery = (mode: Dto.Mode, status: string | undefined, search: string) =>
    createInfiniteSuspenseQuery({
        queryKey: [{ mode }, 'applications', 'list', { status, search }],
        queryFn: async ({ pageParam, signal }) =>
            await api('Applications', { signal }).getApplications({
                mode, status, search,
                pagination: { page: pageParam, size: 100, total: 0 },
            }),
        initialPageParam: 1,
        getNextPageParam: ({ pagination }, _pages, lastPageParam) =>
            pagination.total > pagination.page * pagination.size
                ? lastPageParam + 1
                : undefined,
        select: ({ pages }) =>
            pages.reduce<Dto.ApplicationDto[]>((result, current) => [...result, ...current.data], []),
    })
```

**Patterns**:
- Query factory accepts filter parameters, returns query options
- `select` flattens paginated results into single array
- Page size: 100 items per page
- `getNextPageParam` returns `undefined` to signal end of data

## Suspense Integration

Wrap data-fetching components in `<Suspense>` + `<ErrorBoundary>`:

```tsx
// pages/applications/applications-list/applications-list.tsx
export const ApplicationsList: FC = () => {
    const mode = useAtomValue(modeAtom)
    const search = useAtomValue(searchAtom)
    const status = useAtomValue(statusAtom)

    return (
        <div className="flex flex-col gap-8">
            <Filter />
            <ErrorBoundary>
                <Suspense fallback={<ItemsLoadingPlaceholder />}>
                    <BaseApplicationsList
                        mode={mode}
                        status={status}
                        search={search}
                    />
                </Suspense>
            </ErrorBoundary>
        </div>
    )
}
```

**Data flow**: Page reads atoms → passes as props → Entity uses `useSuspenseInfiniteQuery` → Suspense handles loading.

## Component Data Fetching

```tsx
// entities/applications/applications-list/ui/applications-list.tsx
export const ApplicationsList: FC<ApplicationsListProps> = ({ mode, status, search }) => {
    const mobile = useSmMediaQuery()
    const { data, hasNextPage, isFetchingNextPage, fetchNextPage, refetch } =
        useSuspenseInfiniteQuery(applicationsQuery(mode, status, search))

    if (data.length === 0) return <ApplicationsListEmpty />

    return (
        <>
            {mobile ? <ApplicationsListMobile items={data} /> : <ApplicationsListDesktop items={data} />}
            {isFetchingNextPage && <ListLoadingIndicator />}
        </>
    )
}
```

## Filter → Query Flow

1. Filter UI updates Jotai atoms via `useAtom(searchAtom)`
2. Page component reads atoms via `useAtomValue(searchAtom)`
3. Page passes atom values as props to entity component
4. Entity passes props to query factory function
5. Query key changes → TanStack Query re-fetches automatically

## Error Handling

See [react-performance.md](react-performance.md) for the complete three-layer error strategy (ErrorBoundary + Suspense + component-level), query/mutation error handling, and loading/error UI components.

## Data Grid (TanStack Table)

### Column Definitions

Define columns with `useMemo` to prevent re-creation on every render:

```tsx
const columns = useMemo<ColumnDef<User>[]>(() => [
    { accessorKey: 'id', header: 'ID', size: 90 },
    {
        id: 'name',
        header: 'Name',
        cell: ({ row }) => <span>{row.original.firstName} {row.original.lastName}</span>,
        size: 400,
    },
    { accessorKey: 'email', header: 'Email' },
], [])
```

### Table Setup

```tsx
const table = useReactTable<User>({
    columns,
    data: items,
    getRowId: row => String(row.id),
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    state: { pagination: { pageIndex, pageSize } },
    onPaginationChange: setPagination,
    pageCount: Math.ceil(totalCount / pageSize),
    manualPagination: true,  // server-side pagination
})
```

### Rendering with Pagination

```tsx
<DataGrid table={table} recordCount={totalCount} isLoading={isFetching}>
    <DataGridContainer className="min-h-0 h-full">
        <DataGridTable />
    </DataGridContainer>
    <DataGridPagination />
</DataGrid>
```

**Patterns**:
- `manualPagination: true` for server-side pagination
- Column definitions always wrapped in `useMemo`
- `getRowId` for stable row identity (use domain ID, not array index)
- Combine with TanStack Query — page/size params in query key trigger re-fetch on pagination change
