# Debounced State

Custom hook defined in `shared/lib/use-debounced-state.ts`.

For search inputs that trigger API calls — immediate value for display, debounced for queries:

```tsx
import { useDebouncedState } from '@/shared/lib/use-debounced-state'

const [search, debouncedSearch, setSearch] = useDebouncedState('', 500)
// search — immediate value (for input display)
// debouncedSearch — delayed value (for query param)

<Input value={search} onChange={e => setSearch(e.target.value)} />
<UsersList search={debouncedSearch} />
```
