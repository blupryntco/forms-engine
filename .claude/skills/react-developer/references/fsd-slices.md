# FSD: Slice Structure, Public API & Naming

## Slice Directory Structure

Each slice (except `app` and `shared`) follows:

```
feature-name/
├── index.ts                    # Public API (required)
├── ui/                         # React components + co-located tests
│   ├── component-name.tsx
│   └── component-name.test.tsx
├── model/                      # Business logic
│   ├── types.ts
│   ├── use-feature.ts          # Custom hooks
│   ├── feature.atom.ts         # Jotai atoms
│   └── feature.query.ts        # TanStack Query queries
└── lib/                        # Slice-specific utilities
    └── helpers.ts
```

**When NOT to create a segment:** Don't create empty segments. Simple slices may only have `ui/` + `index.ts`.

## Public API (index.ts)

Every slice must export through `index.ts`. Never import from internal paths directly.

```typescript
// src/features/task-filtering/index.ts
export { TaskFilterInput } from './ui/task-filter-input';
export { useTaskFilter } from './model/use-task-filter';
export { filterAtom } from './model/filter.atom';
export type { TaskFilterState } from './model/types';
export { matchesFilter } from './lib/filter-helpers';
```

**Rules:**
- Export only public interface — don't expose internals
- Group exports by segment with comments
- Export types with `export type`
- Named exports only (no default exports)

## Cross-Entity Exports (`@x/` convention)

Used for cross-entity type re-exports when one entity needs types from another. Keeps dependencies explicit:

```
src/entities/
└── applicant/
    └── @x/
        └── credential/
            └── index.ts    # Re-exports applicant types needed by credential entity
```

## Path Aliases

Use `@` for absolute imports from `src/`:

```typescript
// tsconfig.json
{
    "compilerOptions": {
        "baseUrl": ".",
        "paths": {
            "@/*": ["./src/*"],
            "#/*": ["./public/*"]
        }
    }
}
```

| Alias | Maps to | Usage |
|-------|---------|-------|
| `@/` | `./src/` | FSD layers: `@/shared/ui/button`, `@/entities/users/list` |
| `#/` | `./public/` | Static assets: `#/logo.svg` |

```typescript
import type { Task } from '@/entities/task';
import { useTaskFilter } from '@/features/task-filtering';
import { Button } from '@/shared/ui/button';
```

## Naming Conventions

| Item | Convention | Example |
|------|-----------|---------|
| Slices | kebab-case | `task-filtering`, `task-table` |
| Components | PascalCase | `TaskFilterInput`, `TaskTable` |
| Hooks | `use` prefix, camelCase | `useTaskFilter` |
| Types | PascalCase | `Task`, `TaskStatus` |
| Files | kebab-case, match export | `task-table.tsx` → `TaskTable` |

**File → export mapping:**
- `use-{name}.ts` → `use{Name}` hook (e.g., `use-hotkeys.ts` → `useHotkeys`)
- `{name}.atom.ts` → `{name}Atom` (e.g., `tasks-filter.atom.ts` → `taskFilterAtom`)
- `{name}.query.ts` → `use{Name}Query`, `use{Name}` hooks
- `{name}-watcher.ts` → `use{Name}Watcher` hook

## Next.js App Router Integration

App Router routes live in root `/app` directory (not FSD `src/pages/`). Route segments import FSD page components:

```
app/
├── (anonymous)/                  # Route group: unauthenticated
│   └── auth/signin/page.tsx
├── (authorized)/                 # Route group: authenticated
│   └── (layout)/                 # Route group: with sidebar/header
│       ├── layout.tsx
│       ├── licenses/
│       │   ├── page.tsx          # Imports from src/pages/licenses/
│       │   └── [id]/page.tsx
│       └── applications/
│           ├── page.tsx
│           └── [id]/
│               ├── layout.tsx
│               └── overview/page.tsx
└── layout.tsx                    # Root layout with providers
```

**Pattern**: App Router `page.tsx` files are thin async wrappers that import and render FSD page components. In Next.js 16, `params` and `searchParams` are `Promise` types and must be awaited:

```tsx
// app/(authorized)/(layout)/licenses/page.tsx — no params
import { LicensesList } from '@/pages/licenses/licenses-list'

const Page = () => <LicensesList />
export default Page
```

```tsx
// app/(authorized)/(layout)/licenses/[id]/page.tsx — with params
import { LicenseDetails } from '@/pages/licenses/license-details'

type PageProps = { params: Promise<{ id: string }> }

const Page = async ({ params }: PageProps) => {
    const { id } = await params
    return <LicenseDetails id={id} />
}
export default Page
```

```tsx
// app/(authorized)/(layout)/applications/page.tsx — with searchParams
import { ApplicationsList } from '@/pages/applications/applications-list'

type PageProps = { searchParams: Promise<{ status?: string }> }

const Page = async ({ searchParams }: PageProps) => {
    const { status } = await searchParams
    return <ApplicationsList initialStatus={status} />
}
export default Page
```
