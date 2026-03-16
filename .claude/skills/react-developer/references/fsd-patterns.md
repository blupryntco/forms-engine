# FSD: Composition Patterns & Anti-Patterns

## Common Patterns

### Feature + Entity Composition

```typescript
// Feature uses entity types and UI
import { TaskRow } from '@/entities/task';
import type { Task } from '@/entities/task';

const TaskSelector: FC<TaskSelectorProps> = ({ tasks }) => {
    const [selected, setSelected] = useState<string | null>(null);
    return (
        <>
            {tasks.map(task => (
                <TaskRow key={task.id} task={task} selected={selected === task.id} onSelect={setSelected} />
            ))}
        </>
    );
};
```

### Widget Orchestration

```typescript
// Widget composes multiple features + entities
import { TaskList } from '@/entities/task';
import { TaskFilter, useTaskFilter } from '@/features/task-filtering';
import { TaskSort, useTaskSort } from '@/features/task-sorting';

const TaskManagement: FC = () => {
    const { filtered } = useTaskFilter();
    const { sorted } = useTaskSort(filtered);
    return (
        <>
            <TaskFilter />
            <TaskSort />
            <TaskList tasks={sorted} />
        </>
    );
};
```

### Cross-Slice Dependencies

When features depend on each other, document the relationship:

```typescript
// src/features/task-filtering/model/use-task-filter.ts
import { useProjectFilter } from '@/features/project-filtering'; // cross-feature dependency

/**
 * Task filtering with project context.
 * NOTE: Depends on project-filtering feature for project-level filtering.
 */
export const useTaskFilter = (tasks: Task[]) => {
    const { selectedProject } = useProjectFilter();
    // filter implementation
};
```

### Filter → Query Flow

See [data-fetching.md](data-fetching.md#filter--query-flow) for the complete filter → atom → query → re-fetch pattern with code examples.

### Suspense + Error Boundary Composition

See [data-fetching.md](data-fetching.md#suspense-integration) for the Suspense + ErrorBoundary wrapping pattern at the page level.

## Anti-Patterns

❌ **Upward imports** — entities importing widgets
❌ **Business logic in shared** — task-specific utilities in `shared/`
❌ **Importing internals** — bypassing public API (index.ts)
❌ **God slices** — feature with 20+ files (split into smaller features)
❌ **Skipping existing abstractions** — pages duplicating logic that already lives in a widget or feature instead of importing it (the import `pages → entities` is valid per the layer hierarchy, but prefer composing through widgets/features when they already encapsulate that concern)

## Migration Strategy

When introducing FSD into an existing codebase:

1. **Start with shared** — extract generic utilities
2. **Define entities** — identify domain models
3. **Extract features** — isolate user interactions
4. **Group into widgets** — composite UI blocks
5. **Create pages** — top-level orchestration
6. **Setup app layer** — providers and initialization
