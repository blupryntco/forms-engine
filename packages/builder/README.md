# @bluprynt/forms-builder

Headless React component for building and editing form schemas with drag-and-drop reordering. Pairs with `@bluprynt/forms-core` to handle schema mutations via `FormDefinitionEditor`.

## Key Capabilities

- **Drag-and-drop reordering** — reorder fields and sections with depth-aware nesting via @dnd-kit, respecting the maximum nesting depth of 3 levels.
- **Schema CRUD** — add, update, and remove fields and sections. All mutations go through `FormDefinitionEditor` from `@bluprynt/forms-core`.
- **Headless architecture** — all rendering is delegated to components you provide (`container`, `section`, `field`, `addPlaceholder`), so the package has zero UI opinions.
- **Depth-aware nesting** — horizontal drag offset controls nesting depth. Only sections can accept nested children, enforced during drag projection.
- **Add placeholders** — automatic insertion points at the end of each section and at the root level for adding new items.

## Quick Start

```tsx
import { useState, type FC } from 'react'
import { FormBuilder } from '@bluprynt/forms-builder'
import type {
  FieldRenderProps,
  SectionRenderProps,
  AddPlaceholderRenderProps,
  NewContentItem,
} from '@bluprynt/forms-builder'
import type { FormDefinition } from '@bluprynt/forms-core'

const MyField: FC<FieldRenderProps> = ({ ref, handleRef, item, isDragging, onRemove }) => (
  <div ref={ref} style={{ opacity: isDragging ? 0.5 : 1 }}>
    <span ref={handleRef}>⠿</span>
    {item.label}
    <button onClick={onRemove}>Remove</button>
  </div>
)

const MySection: FC<SectionRenderProps> = ({ ref, handleRef, item, isDragging }) => (
  <div ref={ref} style={{ opacity: isDragging ? 0.5 : 1 }}>
    <span ref={handleRef}>⠿</span>
    {item.title}
  </div>
)

const MyAddPlaceholder: FC<AddPlaceholderRenderProps> = ({ onAdd }) => (
  <button onClick={() => onAdd({ type: 'string', label: 'New Field' })}>
    + Add Field
  </button>
)

const Builder: FC = () => {
  const [definition, setDefinition] = useState<FormDefinition>(initialDefinition)

  return (
    <FormBuilder
      definition={definition}
      container={({ children }) => <div>{children}</div>}
      section={MySection}
      field={MyField}
      addPlaceholder={MyAddPlaceholder}
      selectedId={null}
      onDefinitionChange={setDefinition}
    />
  )
}
```

### Handling Selection

Track which item is selected by passing `selectedId`. Each field and section component receives `isSelected`:

```tsx
const [selectedId, setSelectedId] = useState<number | null>(null)

<FormBuilder
  definition={definition}
  container={({ children }) => <div>{children}</div>}
  section={(props) => (
    <div ref={props.ref} onClick={() => setSelectedId(props.id)}
      style={{ outline: props.isSelected ? '2px solid blue' : 'none' }}>
      <span ref={props.handleRef}>⠿</span>
      {props.item.title}
    </div>
  )}
  field={(props) => (
    <div ref={props.ref} onClick={() => setSelectedId(props.id)}
      style={{ outline: props.isSelected ? '2px solid blue' : 'none' }}>
      <span ref={props.handleRef}>⠿</span>
      {props.item.label}
    </div>
  )}
  addPlaceholder={MyAddPlaceholder}
  selectedId={selectedId}
  onDefinitionChange={setDefinition}
/>
```

## Render Component Props

### FieldRenderProps

| Property | Type | Description |
|----------|------|-------------|
| `ref` | `(element: Element \| null) => void` | Sortable item ref — attach to outermost DOM element |
| `handleRef` | `(element: Element \| null) => void` | Drag handle ref — attach to the drag handle element |
| `id` | `number` | Field ID |
| `depth` | `number` | Nesting depth (0 = root level) |
| `index` | `number` | Position index in the flat list |
| `parentId` | `number \| null` | Parent section ID, or `null` for root-level |
| `type` | `FieldType` | Field type (`'string'`, `'number'`, etc.) |
| `item` | `FieldContentItem` | Full field content item from the definition |
| `isDragging` | `boolean` | `true` when this item is being dragged |
| `isSelected` | `boolean` | `true` when this item's ID matches `selectedId` |
| `onAdd` | `(item: NewContentItem) => number` | Add a new item to this field's parent section; returns the new ID |
| `onRemove` | `() => void` | Remove this field |
| `onChange` | `(item: ContentItem) => void` | Update this field |

### SectionRenderProps

Same shape as `FieldRenderProps` except:

| Property | Type | Description |
|----------|------|-------------|
| `item` | `SectionContentItem` | Full section content item from the definition |
| `onAdd` | `(item: NewContentItem) => number` | Add a new item **inside** this section; returns the new ID |
| `onRemove` | `() => void` | Remove this section and all descendants |

### AddPlaceholderRenderProps

| Property | Type | Description |
|----------|------|-------------|
| `depth` | `number` | Nesting depth where the placeholder appears |
| `parentId` | `number \| null` | Parent section ID, or `null` for root-level |
| `onAdd` | `(item: NewContentItem) => number` | Add a new item at this location; returns the new ID |
| `onChange` | `(id: number, item: ContentItem) => void` | Update an existing item by ID |

## Documentation

| Document | Description |
|----------|-------------|
| [Architecture](./docs/architecture.md) | Project structure, module dependency graph, drag-and-drop flow, tree flattening |
| [API Reference](./docs/api-reference.md) | Complete public API — components, hooks, types, props tables |
| [Development Guide](./docs/development-guide.md) | How to build, test, lint, and extend the builder |
