# FSD: Layer Hierarchy & Import Rules

## Layer Stack (Bottom to Top)

```
src/
├── app/         — Initialization, providers, entry point
├── pages/       — Complete screens, route-level components
├── widgets/     — Composite UI blocks, page sections
├── features/    — User interactions, business features
├── entities/    — Business entities, domain models
└── shared/      — Reusable code, no business logic
```

**Strict downward imports:** `app → pages → widgets → features → entities → shared`

Each layer can ONLY import from layers below it. **Upward imports are strictly forbidden.**

| Layer | Can import from | CANNOT import from |
|-------|-----------------|--------------------|
| `app/` | pages, widgets, features, entities, shared | — (top layer) |
| `pages/` | widgets, features, entities, shared | app |
| `widgets/` | features, entities, shared | app, pages |
| `features/` | entities, shared | app, pages, widgets |
| `entities/` | shared | app, pages, widgets, features |
| `shared/` | — (bottom layer, no FSD imports) | app, pages, widgets, features, entities |

`shared/` is the foundation — it must have **zero knowledge** of any business layer above it. It should be extractable as a standalone package.

Cross-slice imports (same layer) allowed selectively — import only through public API (index.ts).

```typescript
// ✅ GOOD — downward imports
import { TaskTable } from '@/widgets/task-table';       // page → widget
import { useTaskFilter } from '@/features/task-filtering'; // widget → feature
import type { Task } from '@/entities/task';             // feature → entity
import { Button } from '@/shared/ui/button';             // any layer → shared

// ❌ BAD: lower layer imports upper layer
import { TaskTable } from '@/widgets/task-table';        // in entities/ — entities cannot use widgets
import { useAuth } from '@/features/auth';               // in shared/ — shared cannot use features
import { DashboardPage } from '@/pages/dashboard';       // in widgets/ — widgets cannot use pages

// ❌ BAD: bypasses public API
import { TaskTableInternal } from '@/widgets/task-table/ui/task-table-internal';
```

## Layer Purposes

### `app/` — Application Layer
- Setup, global providers, entry point, app-level hooks
- Can import from all layers; no business logic; minimal UI
- Providers nested in dependency order: QueryClient → Jotai → data initializers → UI providers

```typescript
// src/app/providers.tsx
const Providers: FC<PropsWithChildren> = ({ children }) => (
    <QueryClientProvider client={queryClient}>
        <JotaiProvider store={jotaiStore}>
            <DataInitializer>
                {children}
            </DataInitializer>
        </JotaiProvider>
    </QueryClientProvider>
)
```

### `pages/` — Page Layer
- Complete screens; orchestrate widgets
- One page per route; compose widgets/features; minimal logic; no reusable UI

```typescript
// src/pages/dashboard/ui/dashboard-page.tsx
const DashboardPage: FC = () => {
    const showDetails = useAtomValue(showDetailsAtom)

    return (
        <div className="flex flex-row flex-grow">
            <TaskTable />
            {showDetails && <TaskDetails />}
        </div>
    )
}
```

### `widgets/` — Widget Layer
- Composite UI blocks; autonomous page sections
- Self-contained; compose features + entities; reusable across pages

```typescript
// src/widgets/task-table/ui/task-table.tsx
const TaskTable: FC<TaskTableProps> = (props) => {
    const { data: tasks } = useTasks()

    return (
        <Panel title="Task List" {...props}>
            {tasks.length === 0 ? <NoTasksFound /> : <TaskList items={tasks} />}
        </Panel>
    )
}
```

### `features/` — Feature Layer
- User interactions; feature-specific hooks, UI, state
- Focused on single feature; stateful logic lives here; features should be independent

```typescript
// src/features/settings/ui/settings-panel.tsx
const SettingsPanel: FC = () => {
    const { theme, setTheme } = useTheme()
    return (
        <Panel title="Settings">
            <ThemeSelector value={theme} onChange={setTheme} />
        </Panel>
    )
}
```

### `entities/` — Entity Layer
- Domain types, entity-specific UI, entity utilities, entity-scoped queries/atoms
- Represents business domain; no feature logic; pure functions preferred
- Domain Zod schemas live in `shared/domain/`, entity-specific queries/atoms live in `entities/*/model/`

```typescript
// src/entities/task/model/tasks.query.ts
export const useTasks = (listId?: string) => {
    const query = useTasksQuery(listId)
    const filter = useAtomValue(taskFilterAtom)
    const sort = useAtomValue(taskSortAtom)
    // filter + sort applied here, returns { ...query, data: sortedTasks }
}
```

### `shared/` — Shared Layer
- Reusable primitives with no business logic
- No knowledge of entities/features; could be extracted to a package

**Shared segments:**
- `shared/ui/` — Base components; each in its own sub-folder
- `shared/api/` — API client factory and data fetching functions
- `shared/state/` — Query client, query keys, Jotai store, `atomWithStorage`
- `shared/domain/` — Zod schemas and inferred types
- `shared/config/` — Environment config
- `shared/auth/` — Authentication hooks and utilities
- `shared/routes/` — Route definitions

#### `shared/ui` Structure

Each component lives in its own sub-folder. **No** barrel `shared/ui/index.ts`.

```
shared/ui/
├── button/
│   ├── button.tsx
│   └── index.ts      # export { Button } from './button'
├── modal/
│   ├── modal.tsx
│   └── index.ts
└── text-input/
    ├── text-input.tsx
    └── index.ts
```

```typescript
import { Button } from '@/shared/ui/button'   // ✅
import { Button } from '@/shared/ui'           // ❌ no barrel
```
