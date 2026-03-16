---
name: react-developer
description: >
  React/Next.js development patterns with Feature-Sliced Design, TanStack Query, and Jotai.
  ALWAYS use when working with React: (1) Creating or modifying pages, layouts, and route segments
  (App Router), (2) Building and composing React components, (3) Client vs server components decisions,
  (4) Data fetching patterns (TanStack Query, server actions), (5) Client-side state management
  (Jotai atoms and selectors), (6) Design system components and styling, (7) Feature-Sliced Design
  (FSD) folder structure and conventions, (8) Forms, validation, and user interactions,
  (9) Adding or customizing shadcn/ui components (button, dialog, table, dropdown, etc.).
  Provides FSD architecture, component patterns, state management, and data fetching guidance.
  Auto-triggers for all React/Next.js operations. Also triggers when user mentions shadcn,
  Radix UI, or asks to create/add UI components like button, dialog, input, select, table, etc.
---

# React Developer

Build scalable React/Next.js applications following Feature-Sliced Design architecture with TanStack Query and Jotai state management.

## Core Principles

- **Components**: Arrow functions, named exports, `{ComponentName}Props` type
- **Hooks**: Extract at 3+ uses or complex stateful logic; return objects not arrays
- **State**: Local (`useState`), Shared (Jotai atom), Server (TanStack Query)
- **FSD Layers**: `app → pages → widgets → features → entities → shared` (strict downward imports)
- **Performance**: Profile before optimizing; composition over memo
- **Client directive**: Mark interactive components with `'use client'` explicitly; keep server components as default
- **Tailwind CSS**: CSS-first config via `@theme` in CSS; style with utility classes; no CSS modules or styled-components
- **CVA**: Primary approach for variant-based styling; always use `cn()` (`clsx` + `twMerge`) for class merging — never raw `clsx`
- **shadcn/ui**: Use shadcn components (Radix UI primitives + Tailwind styling) for accessible design system; see [shadcn.md](references/shadcn.md)
- **Formik + Zod**: Formik for form state, Zod for schema validation — composed via `useForm()` hook
- **Dark mode**: Support via `next-themes` with `dark:` Tailwind prefix
- **Icons**: `lucide-react` for all SVG icons — no custom SVGs or other icon libraries
- **Named exports only**: No default exports — explicit imports improve discoverability

## Reference Files

Read only what's needed for the current task:

### FSD Architecture
| File | Read when… |
|------|-----------|
| [fsd-layers.md](references/fsd-layers.md) | Deciding which layer a component/hook belongs to; understanding import rules; layer purposes with examples |
| [fsd-slices.md](references/fsd-slices.md) | Creating a new slice; organizing `ui/`/`model/`/`lib/` segments; writing `index.ts`; path aliases; naming conventions |
| [fsd-patterns.md](references/fsd-patterns.md) | Composing features with entities; widget orchestration; cross-slice dependencies; anti-patterns; migration |

### React Patterns
| File | Read when… |
|------|-----------|
| [components.md](references/components.md) | Writing components and hooks; component structure and typing; Tailwind v4; `cn()` utility; `asChild`/Slot pattern; hook layering; client vs server components |
| [cva.md](references/cva.md) | Creating variant-based components with CVA; defining string/boolean/compound variants; `VariantProps` typing; required variants pattern; full component example with CVA + React + Tailwind |
| [shadcn.md](references/shadcn.md) | Adding shadcn/ui components; CLI install workflow; post-install restructuring and coding standards adaptation; compound export pattern; styling rules |
| [color-tokens.md](references/color-tokens.md) | Using semantic color tokens (general UI and status colors); choosing correct Tailwind classes for backgrounds, text, borders, status badges, charts |
| [design-system.md](references/design-system.md) | Creating or modifying `shared/ui/` components; design tokens and theming (light/dark); compound component pattern; component authoring checklist |
| [storybook.md](references/storybook.md) | Writing stories for `shared/ui/` components; dark mode verification; interaction stories |
| [react-performance.md](references/react-performance.md) | Optimizing renders; deciding when to use `React.memo`; error handling patterns; three-layer error strategy; loading/error UI components |
| [auth-guard.md](references/auth-guard.md) | Authentication wrapper; guarding routes; sign-in redirect; initialization loading state |

### State & Data
| File | Read when… |
|------|-----------|
| [state-management.md](references/state-management.md) | TanStack Query setup and query factories; infinite query and pagination; Jotai atom patterns (storage, derived, write-only); query-to-atom sync; cache invalidation |
| [data-fetching.md](references/data-fetching.md) | API layer organization; query key conventions; Suspense integration; data grid (TanStack Table); error handling |
| [forms-validation.md](references/forms-validation.md) | useForm() hook (Formik + Zod + TanStack Query); Form compound component; validation schema patterns; modal forms |
| [debounced-state.md](references/debounced-state.md) | Search inputs triggering API calls; `useDebouncedState` hook; immediate vs delayed values |
| [toast-notifications.md](references/toast-notifications.md) | Toast notifications with `sonner`; success/error patterns in mutation callbacks |

## Common Workflows

### Layer Selection

Pick the correct FSD layer before creating anything → [fsd-layers.md](references/fsd-layers.md):

| You're building… | Layer | Can import from |
|-------------------|-------|-----------------|
| Reusable UI primitive (button, input, dialog) | `shared/ui/` | nothing (no FSD imports) |
| Domain model, entity-scoped UI or query | `entities/` | shared |
| User interaction (create, edit, delete, filter) | `features/` | entities, shared |
| Composite page section combining features/entities | `widgets/` | features, entities, shared |
| Full screen bound to a route | `pages/` | widgets, features, entities, shared |

### Creating a Design System Component (`shared/ui/`)

1. Create folder: `src/shared/ui/<component-name>/`
2. Add component file: `<component-name>.tsx` — install via shadcn CLI then adapt to project standards → [shadcn.md](references/shadcn.md), [design-system.md](references/design-system.md)
3. Add story: `<component-name>.stories.tsx` — cover all variants + dark mode → [storybook.md](references/storybook.md)
4. Export via component barrel: `<component-name>/index.ts` exports component + props type (no top-level `shared/ui/index.ts`)
5. Import as `import { Button } from '@/shared/ui/button'`
6. Verify: light/dark theme, keyboard navigation, `data-slot` attribute on root

### Creating an Entity (`entities/`)

1. Create slice: `src/entities/<entity-name>/`
2. Add segments as needed:
   - `ui/` — entity-specific display components (card, row, list)
   - `model/` — query factories (`*.query.ts`), Jotai atoms (`*.atom.ts`), types (`types.ts`)
3. Define query factory using `createQuery` / `createInfiniteSuspenseQuery` → [state-management.md](references/state-management.md)
4. Register query keys in `shared/state/keys.ts` → [data-fetching.md](references/data-fetching.md)
5. Export public API via `index.ts` — only expose what consuming layers need → [fsd-slices.md](references/fsd-slices.md)
6. Imports allowed: `shared/` only

### Creating a Feature (`features/`)

1. Create slice: `src/features/<feature-name>/`
2. Add segments as needed:
   - `ui/` — feature UI (dialog, panel, form)
   - `model/` — Zod schema + mutation (`createMutation`), hooks, atoms
   - `lib/` — feature-specific utilities
3. If the feature has a form: define Zod schema in `model/`, wire up via `useForm()` → [forms-validation.md](references/forms-validation.md)
4. If the feature is a dialog: use the Feature Dialog pattern (children as trigger, `DialogTrigger asChild`) → [forms-validation.md](references/forms-validation.md)
5. Export public API via `index.ts`
6. Imports allowed: `entities/`, `shared/`

### Creating a Widget (`widgets/`)

1. Create slice: `src/widgets/<widget-name>/`
2. Add `ui/` segment — compose multiple features and entity components into a self-contained page section
3. Orchestrate data flow: read Jotai atoms, pass as props to entity/feature components → [fsd-patterns.md](references/fsd-patterns.md)
4. Export public API via `index.ts`
5. Imports allowed: `features/`, `entities/`, `shared/`

### Creating a Page (`pages/`)

1. Create FSD page slice: `src/pages/<page-name>/`
2. Add `ui/` segment — compose widgets/features, wrap data-fetching components in `<ErrorBoundary>` + `<Suspense>` → [data-fetching.md](references/data-fetching.md)
3. Read filter/state atoms via `useAtomValue()`, pass as props to child components
4. Export public API via `index.ts`
5. Create App Router route: `app/(...)/page.tsx` — thin wrapper importing the FSD page component → [fsd-slices.md](references/fsd-slices.md)
6. Imports allowed: `widgets/`, `features/`, `entities/`, `shared/`

```tsx
// app/(authorized)/(layout)/applications/page.tsx — thin App Router wrapper
import { ApplicationsList } from '@/pages/applications/applications-list'
const Page = () => <ApplicationsList />
export default Page  // only default export allowed here (Next.js convention)

// With params (Next.js 16 — params is Promise, must be awaited)
import { LicenseDetails } from '@/pages/licenses/license-details'
type PageProps = { params: Promise<{ id: string }> }
const Page = async ({ params }: PageProps) => {
    const { id } = await params
    return <LicenseDetails id={id} />
}
export default Page
```

### Organizing State

| State type | Tool | Location |
|-----------|------|----------|
| Component-local | `useState` | Inside component |
| Cross-component UI | Jotai atom | `model/*.atom.ts` in owning slice |
| Persistent across sessions | `atomWithStorage` | `model/*.atom.ts` or `shared/` |
| Server data | TanStack Query | `model/*.query.ts` in entity or `shared/api/` |
| Derived | Compute in render or `useMemo` | — |

**Data flow**: Filter UI → Jotai atom → Page reads atom → passes as props → Entity query → TanStack re-fetches on key change
