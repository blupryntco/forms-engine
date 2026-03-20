---
name: react-developer
description: >
  React development patterns for headless component libraries. ALWAYS use when working with React:
  (1) Creating or modifying .tsx files, (2) Building and composing React components,
  (3) Writing custom hooks, (4) Component typing and props patterns,
  (5) Performance optimization. Provides component patterns, hook guidelines,
  and React best practices for library development. Auto-triggers for all React file operations.
---

# React Developer

Build headless React component libraries with clean typing and composable patterns.

## Core Principles

- **Components**: Arrow functions with `FC<Props>` type annotation, named exports
- **Hooks**: Extract at 3+ uses or complex stateful logic; return objects not arrays
- **State**: React Context for shared state, `useState` for local state
- **Performance**: Profile before optimizing; composition over memo
- **Named exports only**: No default exports — explicit imports improve discoverability

## Reference Files

Read only what's needed for the current task:

### React Patterns
| File | Read when… |
|------|-----------|
| [components.md](references/components.md) | Writing components and hooks; component structure and typing; hook layering |
| [react-performance.md](references/react-performance.md) | Optimizing renders; deciding when to use `React.memo`; error handling patterns |

## Component Structure

```typescript
// Order: props type → component → exports
type TaskListProps = {
    tasks: Task[]
    onSelect: (id: string) => void
}

const TaskList: FC<TaskListProps> = ({ tasks, onSelect }) => {
    // implementation
}

export { TaskList }
```

**Rules:**
- Arrow functions with `FC` type annotation
- Named exports only (no default exports)
- Props type named `{ComponentName}Props` — never generic `Props`
- Define props as `type` (not interface); destructure in parameters
- Order within file: props type → component → sub-components → co-located hooks → exports

## Custom Hooks

- Extract when logic is used 3+ times, or when stateful logic is complex (even if used once)
- Name with `use` prefix: `useFormState`, `useVisibility`
- Return objects for multiple values (not arrays, unless order is semantically meaningful like `useState`)
- Explicit dependency arrays (no suppressed exhaustive-deps)
- `useCallback` only when passing callbacks to memoized children — profile first
- `useMemo` only for expensive computations — profile first

## Generic Components

Use explicit generic syntax with `ReturnType<FC>` return type (cannot use `FC<Props>` with generics):

```typescript
type ListProps<T extends string> = {
    options: ListOption<T>[]
    value: T
    onChange: (value: T) => void
}

const List = <T extends string>({ options, value, onChange }: ListProps<T>): ReturnType<FC> => {
    // ...
}

export { List, type ListProps }
```

## Ref as Prop (React 19)

React 19 deprecated `forwardRef`. Pass `ref` as a regular prop:

```typescript
type InputProps = ComponentProps<'input'> & {
    value: string
    onChange: (value: string) => void
}

const Input: FC<InputProps> = ({ ref, ...props }) => {
    return <input ref={ref} {...props} />
}

export { Input }
```

## Export Patterns

Every module exports through `index.ts`:

```tsx
export { FormViewer } from './form-viewer'
export type { ViewerComponentMap } from './types'
```

**Rules:**
- Only export what the consuming layer needs
- Separate type exports from value exports
- Never import from internal paths of another module (use barrel only)

## Prohibited Patterns

- Class components
- `forwardRef` (deprecated in React 19 — use `ref` as a regular prop)
- `React` namespace imports (`React.FC`, `React.useState`)
- Default exports
- Prop drilling > 2 levels (use context)
- Side effects in render (use `useEffect`)
- Mutating props or state directly
- Index as key in lists (use stable IDs)
- Mixing concerns in one component (extract hooks/sub-components)
