# React Components, Hooks & Patterns

## Component Structure

```typescript
// Order: props type → component → exports
type TaskListProps = {
    tasks: Task[];
    onSelect: (id: string) => void;
};

const TaskList: FC<TaskListProps> = ({ tasks, onSelect }) => {
    // implementation
};

export { TaskList };
```

**Rules:**
- Arrow functions with `FC` type annotation
- Named exports only (no default exports)
- Props type named `{ComponentName}Props` — never generic `Props`
- Define props as `type` (not interface); destructure in parameters
- Order within file: props type → component → sub-components → co-located hooks → exports

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

**Rules:**
- Generic constraint on the type parameter (`T extends string`)
- Return type `ReturnType<FC>` instead of `FC<Props>` annotation
- Props type is also generic: `ListProps<T>`

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

**Rules:**
- No `forwardRef` wrapper — `ref` is a standard prop in React 19
- No `displayName` needed (named arrow functions are self-documenting)
- Type `ref` via `ComponentProps<'element'>` which already includes it

## Extending Native HTML Props

Use `ComponentProps<'element'>` to inherit all native HTML attributes:

```tsx
type ButtonProps = ComponentProps<'button'> & {
    variant?: 'primary' | 'secondary'
}

const Button: FC<ButtonProps> = ({ className, variant, ...props }) => {
    return <button {...props} />
}
```

**Rules:**
- Extend `ComponentProps<'element'>` for the rendered HTML element
- Consumers get full native prop support (aria, data, event handlers) without manual forwarding

## Custom Hooks

- Extract when logic is used 3+ times, or when stateful logic is complex (even if used once)
- Name with `use` prefix: `useFormState`, `useVisibility`
- Return objects for multiple values (not arrays, unless order is semantically meaningful like `useState`)

```typescript
const useTaskFilter = (tasks: Task[]) => {
    const [filter, setFilter] = useState('');
    const filtered = useMemo(
        () => tasks.filter(t => t.subject.includes(filter)),
        [tasks, filter]
    );
    return { filtered, filter, setFilter };
};
```

**Hook rules:**
- Follow Rules of Hooks (no conditionals, no loops at top level)
- Explicit dependency arrays (no suppressed exhaustive-deps)
- `useCallback` only when passing callbacks to memoized children — profile first
- `useMemo` only for expensive computations — profile first
- `useRef` for: values that don't trigger re-renders, DOM references, previous values

## Hook Layering Pattern

Build hooks in layers from simple to complex:

```typescript
// Layer 1: Base data
useFormEngine()          // → FormEngine instance

// Layer 2: Derived
useVisibleFields()       // → filtered visible fields

// Layer 3: Composite
useFieldValidation()     // → validation state for a field
```

## Dynamic Component Resolution

Use record mapping for state-based rendering:

```tsx
const states: Record<FieldType, ComponentType> = {
    string: StringField,
    number: NumberField,
    boolean: BooleanField,
}

const Component = states[field.type]
return <Component />
```

## React 19 Hooks

### `use()` — Read Promises and Context in Render

Reads a Promise or Context value. Unlike other hooks, can be called conditionally:

```tsx
import { use } from 'react'

const Comments: FC<{ commentsPromise: Promise<Comment[]> }> = ({ commentsPromise }) => {
    const comments = use(commentsPromise)  // suspends until resolved
    return comments.map(c => <p key={c.id}>{c.text}</p>)
}
```

**Rules**: Promise must be stable (passed as prop or from cache) — not created in render.

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
