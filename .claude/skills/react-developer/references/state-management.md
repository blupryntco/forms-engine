# State Management

## Overview

| Concern | Tool | Location |
|---------|------|----------|
| Server data | TanStack Query | `shared/state/query.ts` + entity `model/` |
| UI / filter state | Jotai atoms | slice `model/` directories |
| Form state | Formik | feature `model/` + `ui/` |
| Global config | Jotai + atomWithStorage | `shared/` utilities |

## TanStack Query Setup

### Query Client

```tsx
// shared/state/query.ts
import { QueryClient } from '@tanstack/react-query'

export const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            staleTime: 5 * 1000,  // 5-second default
        },
    },
})
```

### Centralized Query Key Factory

All query and mutation keys defined in one file — single source of truth for cache invalidation:

```tsx
// shared/state/keys.ts
export const keys = {
    queries: {
        users: {
            list: (search: string) => ['users', 'list', search],
            details: (userId: number) => ['users', 'details', userId],
            lookup: (search: string) => ['users', 'lookup', search],
        },
        companies: {
            list: (search: string) => ['companies', 'list', search],
            details: (companyId: number) => ['companies', 'details', companyId],
        },
    },
    mutations: {
        users: {
            create: ['users', 'create'],
            edit: (userId: number) => ['users', 'edit', userId],
            delete: (userId: number) => ['users', 'delete', userId],
        },
    },
}
```

**Usage in queries and mutations**:

```tsx
// In query definitions
useQuery({ queryKey: keys.queries.users.details(userId), queryFn: ... })

// Cache invalidation — specific query
await queryClient.invalidateQueries({ queryKey: keys.queries.users.details(userId) })

// Cache invalidation — all list variants (slice key to remove last param)
await queryClient.invalidateQueries({ queryKey: keys.queries.users.list('').slice(0, -1) })
```

**Rules**:
- All keys live in `shared/state/keys.ts` — never define ad-hoc keys
- Queries and mutations have separate namespaces
- Static keys are arrays, parameterized keys are functions returning arrays
- Use `.slice(0, -1)` on parameterized keys to invalidate all variants of a group

## Jotai Patterns

### Store Setup

```tsx
// shared/state/jotai.ts
import { createStore } from 'jotai'
export const jotai = createStore()
```

Single centralized store. Use `jotai.set()` for imperative updates outside React (e.g., in mutation callbacks).

### Atom File Rules

- **One exported atom per file** as the default convention
- Co-locate derived types with the atom they describe
- Exception: logically connected atoms (e.g., a base atom + derived/computed atom) can share a file
- Export both the atom and its types from the slice `index.ts`

### Storage Atoms (Persistent)

Filter and preference atoms persist to localStorage:

```tsx
// entities/applications/applications-filter/model/search.ts
export const searchAtom = atomWithStorage<string>('applications-filter-search', '')

// entities/applications/applications-filter/model/status.ts
export const statusAtom = atomWithStorage<string | undefined>('applications-filter-status', undefined)

// shared/mode/mode.ts
export const modeAtom = atomWithStorage<Modes>('mode', 'Shared')
```

**Naming**: Storage key matches atom location — `'<domain>-filter-<field>'`.

### Simple Atoms (Non-persistent)

For session-scoped state:

```tsx
// shared/auth/me.ts
export const meAtom = atom<Dto.MeDto | undefined>(undefined)
export const statusAtom = atom<SessionContextValue['status'] | undefined>(undefined)
```

### Write-Only Atoms

For complex state transformations:

```tsx
// Write-only atom with custom logic
export const storeCredentialAtom = atom<null, [licenseId: number, credential: Credential], void>(
    null,  // read returns null (write-only)
    (get, set, licenseId, credential) => {
        const credentials = get(credentialsAtom)
        set(credentialsAtom, { ...credentials, [licenseId]: credential })
    },
)

// Cleanup atom (no args)
export const removeExpiredAtom = atom<null, [], void>(null, (get, set) => {
    const now = Date.now()
    const credentials = get(credentialsAtom)
    const expired = Object.entries(credentials)
        .filter(([, { expires }]) => now > new Date(expires).getTime())
        .map(([id]) => Number(id))

    for (const id of expired) {
        delete credentials[id]
    }
    set(credentialsAtom, { ...credentials })
})
```

### Custom Hooks for Atoms

Wrap `useAtomValue` for DX and encapsulation:

```tsx
// shared/auth/use-me.ts
export const useMe = () => useAtomValue(meAtom)
export const useStatus = () => useAtomValue(statusAtom)
export const useSignInApproved = () => useMe()?.signInApproved ?? false
export const useRole = () => useMe()?.role
export const useCheckRole = (...roles: Dto.UserRole[]) => {
    const role = useRole()
    return roles.some(x => x === role)
}
```

## Cache Invalidation

### Partial Key Match

```tsx
// Invalidate all lists for a domain
await queryClient.invalidateQueries({ queryKey: [{ mode }, 'licenses', 'list'] })

// Invalidate specific detail
await queryClient.invalidateQueries({ queryKey: ['licenses', 'details', { id }] })

// Multiple invalidations in parallel
await Promise.all([
    queryClient.invalidateQueries({ queryKey: [{ mode }, 'licenses', 'list'] }),
    queryClient.invalidateQueries({ queryKey: ['licenses', 'details', { id: license.id }] }),
])
```

### Refetch vs Invalidate

```tsx
// Refetch: immediately re-execute query
await queryClient.refetchQueries({ queryKey: ['auth', 'access'] })

// Invalidate: mark stale, re-fetch on next use
await queryClient.invalidateQueries({ queryKey: ['applications', 'list'] })
```

Use `refetch` for critical data that must be fresh immediately. Use `invalidate` for background updates.
