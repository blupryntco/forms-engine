# React: Performance & Error Handling

## Performance

**Profile before optimizing.** Measure actual bottlenecks first.

### Composition Over Memo

Split components to isolate frequently updating parts, pass stable children:

```typescript
// BAD: creates new object on every render
<TaskList config={{ showCompleted: true }} />

// GOOD: stable reference
const CONFIG = { showCompleted: true };
<TaskList config={CONFIG} />

// GOOD: composition isolates re-renders
const ExpensiveList = ({ children }) => {
    // expensive logic
    return <>{children}</>;
};
<ExpensiveList>
    <FrequentlyUpdatingComponent />
</ExpensiveList>
```

### When to Use `React.memo`

Only after profiling shows unnecessary re-renders:
- Expensive components that receive stable props
- List items in large lists
- Not needed for most components — composition is usually better

### Optimization Rules

```typescript
// useMemo for derived data and transformations
const options = useMemo(
    () => items.map((task) => ({ id: task.id, title: task.subject })),
    [items],
)

// useCallback for callbacks passed as props to memoized children
const handleSelect = useCallback(
    (id: string) => setSelectedId(id),
    [setSelectedId],
)

// useRef for values that shouldn't trigger re-renders
const callbackRef = useRef(onChanged)
useEffect(() => { callbackRef.current = onChanged }, [onChanged])
```

## Error Handling

### Three-Layer Strategy

1. **ErrorBoundary** — catches unhandled component tree errors
2. **Suspense** — handles loading states
3. **Component-level** — handles known error states

```typescript
// Page level: boundary + suspense
<ErrorBoundary>
    <Suspense fallback={<LoadingPlaceholder />}>
        <DataComponent />
    </Suspense>
</ErrorBoundary>
```

### Component-Level Guards

- Early returns for missing data: `if (!data) return null`
- Optional chaining for nullable refs: `ref?.current?.method()`
- Nullish coalescing for defaults: `const items = data?.list ?? []`
- Prefer type safety over try-catch in components

## Code Quality

- Prefer early returns over nested conditionals
- Extract magic numbers/strings to named constants
- Descriptive variable names (no single letters except loop indices)
