# Architecture

## Component Hierarchy

```
<FormBuilder>                         Composition root (builder.tsx)
│  Receives definition + 4 render components
│  Calls useFormBuilder(definition, onDefinitionChange)
│  Wraps children in <DragDropProvider> with drag handlers
│
├── <Container>                       Consumer-provided layout wrapper
│   │
│   └── items.map(item => ...)        Flat list iteration
│       │
│       ├── isSection(item)
│       │   └── <Section>             Sortable wrapper (section.tsx)
│       │       └── <SectionComponent>   Consumer's section render (SectionRenderProps)
│       │
│       ├── isField(item)
│       │   └── <Field>               Sortable wrapper (field.tsx)
│       │       └── <FieldComponent>     Consumer's field render (FieldRenderProps)
│       │
│       └── isAddPlaceholder(item)
│           └── <AddPlaceholder>      Passthrough wrapper (add-placeholder.tsx)
│               └── <AddPlaceholderComponent>   Consumer's placeholder render
```

## Module Dependency Graph

```
FormBuilder (builder.tsx)
├── useFormBuilder (use-form-builder.ts)
│   ├── FormDefinitionEditor (from @bluprynt/forms-core)
│   ├── flattenTree, getDescendants (core/tree.ts)
│   ├── getDragDepth, getProjection (core/projection.ts)
│   ├── INDENTATION, MAX_DEPTH (core/constants.ts)
│   ├── move (from @dnd-kit/helpers)
│   └── TreeItem, NewContentItem (core/types.ts)
├── Field (field.tsx)
│   ├── useSortable (from @dnd-kit/react/sortable)
│   └── SORTABLE_CONFIG (core/constants.ts)
├── Section (section.tsx)
│   ├── useSortable (from @dnd-kit/react/sortable)
│   └── SORTABLE_CONFIG (core/constants.ts)
├── AddPlaceholder (add-placeholder.tsx)
├── isSection, isField, isAddPlaceholder (core/types.ts)
└── DragDropProvider (from @dnd-kit/react)
```

Key observation: `FormBuilder` is the composition root but contains no business logic. All state management and mutation logic lives in `useFormBuilder`. All structural mutations are delegated to `FormDefinitionEditor` from `@bluprynt/forms-core` — the builder never modifies the definition directly.

## Tree Flattening

`flattenTree()` (`core/tree.ts`) converts the nested `ContentItem[]` tree into a flat `TreeItem[]` list suitable for sortable rendering.

### Flattening Algorithm

```
Input: ContentItem[] (nested)            Output: TreeItem[] (flat)

Section (id: 1)                          { id: 1, type: section, depth: 0, parentId: null }
├── Field (id: 2)                        { id: 2, type: string,  depth: 1, parentId: 1    }
└── Field (id: 3)                        { id: 3, type: number,  depth: 1, parentId: 1    }
                                         { id: -1001, type: add-placeholder, depth: 1, parentId: 1 }
Field (id: 4)                            { id: 4, type: boolean, depth: 0, parentId: null }
                                         { id: -1002, type: add-placeholder, depth: 0, parentId: null }
```

Key details:
- Recursively traverses sections, incrementing `depth` and tracking `parentId`.
- Appends an `add-placeholder` item at the end of each level (root + each section).
- Placeholder IDs use a module-level counter starting at `-1000`, decrementing (`-1001`, `-1002`, ...).
- `resetPlaceholderIds()` is called at the start of each root-level flatten to ensure stable IDs per pass.

### Descendant Collection

`getDescendants(items, parentId)` returns a `Set<number>` of all transitive descendant IDs for a given parent. Used during `onDragStart` to remove children from the flat list so they move with their dragged parent.

## Drag-and-Drop Architecture

Library: `@dnd-kit` v0.3.2 (React bindings).

### Sortable Integration

Each `Field` and `Section` component calls `useSortable()` with:

```ts
useSortable({
    ...SORTABLE_CONFIG,    // alignment: { x: 'start', y: 'center' }, transition: { idle: true }
    id,
    index,
    data: { depth, parentId },
})
```

This provides `ref`, `handleRef`, and `isDragSource` — passed through to the consumer's render component.

### Drag Event Flow

`FormBuilder` attaches four handlers to `DragDropProvider`:

```
onDragStart
  │  Record initialDepth and dragSourceId
  │  Collect descendants via getDescendants()
  │  Remove descendants from flat list (they travel with parent)
  │
  ▼
onDragOver
  │  Triggered when dragging over a new target
  │  Reorder via move() from @dnd-kit/helpers
  │  Calculate projection → update dragged item's depth/parentId
  │
  ▼
onDragMove
  │  Triggered on every mouse movement
  │  Recalculate depth/parentId from current offset
  │  Update only if depth or parentId actually changed (optimization)
  │
  ▼
onDragEnd
  ├─ canceled → re-flatten from original definition (rollback)
  └─ committed:
     ├─ Compute sibling index by counting same-parent items before drag position
     ├─ Call FormDefinitionEditor.moveItem(draggedId, targetParentId, siblingIndex)
     └─ applyEditor() → flatten + notify consumer
```

## Depth Projection System

The projection system (`core/projection.ts`) determines the valid nesting depth and parent for a dragged item based on cursor offset.

### Depth Calculation

```
getDragDepth(offset, INDENTATION):
  Math.round(offset / 40)  →  pixel offset → depth delta
```

### Projection Constraints

`getProjection(items, targetId, projectedDepth, maxAllowedDepth)` clamps depth between bounds:

| Bound | Rule |
|---|---|
| `minDepth` | Next item's depth (maintain sibling ordering) |
| `maxDepth` | `previousItem.depth + 1` if previous is a section; else `previousItem.depth` |
| Absolute max | `MAX_DEPTH = 3` |

### Parent Resolution

After clamping depth, the parent is determined by walking backward through items:

```
depth === 0               → parentId = null
depth === prevItem.depth  → parentId = prevItem.parentId (same level)
depth > prevItem.depth    → parentId = prevItem.id (if section) or prevItem.parentId
depth < prevItem.depth    → scan backward for item at target depth → use its parentId
```

## State Management (useFormBuilder)

### State Shape

| State / Ref | Type | Purpose |
|---|---|---|
| `items` | `TreeItem[]` | Flattened tree — main render state |
| `initialDepth` | `useRef<number>` | Dragged item's original depth |
| `sourceChildren` | `useRef<TreeItem[]>` | Descendants removed during drag |
| `dragSourceId` | `useRef<number \| null>` | Currently dragged item's ID |
| `definitionRef` | `useRef<FormDefinition>` | Latest definition (stable callback access) |
| `onDefinitionChangeRef` | `useRef<Function>` | Latest callback (stable callback access) |

### Mutation Flow

```
Consumer action (add / change / remove / drag-end)
  │
  ▼
Create new FormDefinitionEditor(definitionRef.current)
  │
  ▼
Call editor mutation (addField, updateField, removeItem, moveItem, etc.)
  │
  ▼
applyEditor(editor)
  ├── editor.toJSON() → updated FormDefinition
  ├── flattenTree(updated.content) → setItems()
  └── onDefinitionChangeRef.current(updated) → notify consumer
```

### External Sync

A `useEffect` watches `definition` and re-flattens when it changes externally (e.g., from a field editor panel), ensuring the builder stays in sync with external state mutations.

### Latest Ref Pattern

```ts
const definitionRef = useRef(definition)
definitionRef.current = definition

const onDefinitionChangeRef = useRef(onDefinitionChange)
onDefinitionChangeRef.current = onDefinitionChange
```

Refs are updated on every render. Callbacks created once (via `useCallback`) read from refs, so they see fresh state without being recreated. Same pattern used in `@bluprynt/forms-viewer`.

## Public API

### Exports

| Export | Kind | Description |
|---|---|---|
| `FormBuilder` | Component | Composition root — accepts definition, 4 render components, callbacks |
| `FieldRenderProps` | Type | Props passed to consumer's field render component |
| `SectionRenderProps` | Type | Props passed to consumer's section render component |
| `AddPlaceholderRenderProps` | Type | Props passed to consumer's add-placeholder render component |
| `NewContentItem` | Type | `ContentItem` without `id` — used when adding new items |

### FormBuilder Props

| Prop | Type | Required | Description |
|---|---|---|---|
| `definition` | `FormDefinition` | Yes | Current form schema |
| `container` | `FC<PropsWithChildren>` | Yes | Layout wrapper component |
| `section` | `FC<SectionRenderProps>` | Yes | Section render component |
| `field` | `FC<FieldRenderProps>` | Yes | Field render component |
| `addPlaceholder` | `FC<AddPlaceholderRenderProps>` | Yes | Placeholder render component |
| `selectedId` | `number \| null` | No | Currently selected item ID |
| `onDefinitionChange` | `(definition: FormDefinition) => void` | No | Callback on structural changes |

## Key Design Patterns

### Headless Architecture

The package contains zero visual components. Consumers provide all render components (`container`, `section`, `field`, `addPlaceholder`) via props. Internal wrapper components (`Field`, `Section`, `AddPlaceholder`) only handle sortable integration and prop forwarding.

### Flat Sortable List

The nested tree is flattened into a single sortable list. Nesting is represented by `depth` and `parentId` on each `TreeItem` — the consumer uses `depth` for visual indentation. The tree is reconstructed from the flat definition via `FormDefinitionEditor` on each mutation.

### Placeholder Items

Add-placeholder items use negative IDs (starting at `-1001`) to avoid collisions with real content IDs. They are auto-generated by `flattenTree()` and signal insertion points to the consumer's UI.

### Immutable Mutations

Every structural mutation creates a new `FormDefinitionEditor` instance from the current definition, applies the change, and produces a new `FormDefinition` via `toJSON()`. The builder never mutates the definition in place.

## External Dependencies

| Dependency | Version | Purpose |
|---|---|---|
| `@dnd-kit/react` | 0.3.2 | `DragDropProvider`, React drag-drop context |
| `@dnd-kit/react/sortable` | 0.3.2 | `useSortable` hook for sortable items |
| `@dnd-kit/helpers` | 0.3.2 | `move()` utility for reordering flat arrays |
| `@dnd-kit/dom` | 0.3.2 | DOM sensor layer (peer of `@dnd-kit/react`) |
| `@dnd-kit/abstract` | 0.3.2 | Abstract drag-drop primitives |
| `@dnd-kit/state` | 0.3.2 | State management for dnd-kit |

Peer dependencies: `@bluprynt/forms-core` (workspace), `react` (^18.0.0 || ^19.0.0).
