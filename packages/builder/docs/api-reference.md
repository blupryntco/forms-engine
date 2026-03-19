# API Reference

## Components

### FormBuilder

The main entry point. Renders a headless, drag-and-drop-enabled form schema builder.

```ts
import { FormBuilder } from '@bluprynt/forms-builder'
```

#### Props

| Prop | Type | Description |
|------|------|-------------|
| `definition` | `FormDefinition` | The current form schema to build upon. |
| `container` | `FC<PropsWithChildren>` | Wrapper component for the item list. Receives children. |
| `section` | `FC<SectionRenderProps>` | Component rendered for each section item. |
| `field` | `FC<FieldRenderProps>` | Component rendered for each field item. |
| `addPlaceholder` | `FC<AddPlaceholderRenderProps>` | Component rendered for each add-item placeholder. |
| `selectedId` | `number \| null \| undefined` | ID of the currently selected item (passed as `isSelected` to field/section components). |
| `onDefinitionChange` | `(definition: FormDefinition) => void \| undefined` | Called with the updated FormDefinition whenever the schema changes (add, remove, move, update). |

#### Behavior

- Creates a `useFormBuilder` hook instance for state management.
- Wraps items in `DragDropProvider` from @dnd-kit with drag handlers.
- Maps flattened items to Field, Section, or AddPlaceholder components based on type guards.
- Returns `null` for unrecognized item types.
- Each item receives `onAdd`, `onRemove`, `onChange` callbacks:
  - For sections: `onAdd` adds to that section
  - For fields: `onAdd` adds to the field's parent section
  - `onRemove` removes the item
  - `onChange` updates the item

```tsx
import type { FC } from 'react'
import { FormBuilder } from '@bluprynt/forms-builder'
import type { FieldRenderProps, SectionRenderProps, AddPlaceholderRenderProps } from '@bluprynt/forms-builder'

const MyField: FC<FieldRenderProps> = ({ ref, handleRef, item, isDragging, onRemove }) => (
  <div ref={ref} style={{ opacity: isDragging ? 0.5 : 1 }}>
    <span ref={handleRef}>&#x2807;</span>
    {item.label}
    <button onClick={onRemove}>Remove</button>
  </div>
)

const MySection: FC<SectionRenderProps> = ({ ref, handleRef, item, isDragging }) => (
  <div ref={ref} style={{ opacity: isDragging ? 0.5 : 1 }}>
    <span ref={handleRef}>&#x2807;</span>
    {item.title}
  </div>
)

const MyAddPlaceholder: FC<AddPlaceholderRenderProps> = ({ onAdd }) => (
  <button onClick={() => onAdd({ type: 'string', label: 'New Field' })}>
    + Add Field
  </button>
)

const Builder: FC = () => {
  const [definition, setDefinition] = useState(initialDefinition)

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

---

## Hooks

### useFormBuilder

Main state management hook. Handles tree flattening, drag-and-drop reordering, and item CRUD operations.

```ts
import { useFormBuilder } from '@bluprynt/forms-builder' // (internal, not exported)
```

Note: This hook is used internally by `FormBuilder` and is **not exported** from the package.

#### Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `definition` | `FormDefinition` | The current form definition. |
| `onDefinitionChange` | `(definition: FormDefinition) => void \| undefined` | Callback invoked with updated definition on changes. |

#### Return Type

| Property | Type | Description |
|----------|------|-------------|
| `items` | `TreeItem[]` | Flattened tree items for rendering. |
| `handleItemAdd` | `(sectionId: number \| null, item: NewContentItem) => number` | Adds a field or section. Returns the new item's ID. |
| `handleItemChange` | `(id: number, newItem: ContentItem) => void` | Updates a field or section by ID. |
| `handleItemRemove` | `(itemId: number) => void` | Removes a field or section and all descendants. |
| `handleDragStart` | `DragDropProvider onDragStart handler` | Initiates drag: collects descendants, removes from list. |
| `handleDragOver` | `DragDropProvider onDragOver handler` | Reorders items, projects depth/parentId. |
| `handleDragMove` | `DragDropProvider onDragMove handler` | Updates depth/parentId on mouse move. |
| `handleDragEnd` | `DragDropProvider onDragEnd handler` | Commits move via FormDefinitionEditor or rolls back on cancel. |

---

## Types

### Exported Types

#### FieldRenderProps

Props passed to the consumer's field render component.

| Property | Type | Description |
|----------|------|-------------|
| `ref` | `(element: Element \| null) => void` | Sortable item ref — attach to the outermost DOM element. |
| `handleRef` | `(element: Element \| null) => void` | Drag handle ref — attach to the drag handle element. |
| `id` | `number` | Field ID. |
| `depth` | `number` | Nesting depth (0 = root level). |
| `index` | `number` | Position index within the flat list. |
| `parentId` | `number \| null` | Parent section ID, or `null` for root-level items. |
| `type` | `FieldType` | Field type (`'string'`, `'number'`, etc.). |
| `item` | `FieldContentItem` | The full field content item from the definition. |
| `isDragging` | `boolean` | `true` when this item is being dragged. |
| `isSelected` | `boolean` | `true` when this item's ID matches `selectedId`. |
| `onAdd` | `(item: NewContentItem) => number` | Add a new item to this field's parent section. Returns the new item's ID. |
| `onRemove` | `() => void` | Remove this field from the definition. |
| `onChange` | `(item: ContentItem) => void` | Update this field in the definition. |

#### SectionRenderProps

Props passed to the consumer's section render component.

| Property | Type | Description |
|----------|------|-------------|
| `ref` | `(element: Element \| null) => void` | Sortable item ref. |
| `handleRef` | `(element: Element \| null) => void` | Drag handle ref. |
| `id` | `number` | Section ID. |
| `depth` | `number` | Nesting depth (0 = root level). |
| `index` | `number` | Position index within the flat list. |
| `parentId` | `number \| null` | Parent section ID, or `null` for root-level items. |
| `item` | `SectionContentItem` | The full section content item from the definition. |
| `isDragging` | `boolean` | `true` when this item is being dragged. |
| `isSelected` | `boolean` | `true` when this item's ID matches `selectedId`. |
| `onAdd` | `(item: NewContentItem) => number` | Add a new item inside this section. Returns the new item's ID. |
| `onRemove` | `() => void` | Remove this section and all its descendants. |
| `onChange` | `(item: ContentItem) => void` | Update this section in the definition. |

#### AddPlaceholderRenderProps

Props passed to the consumer's add-placeholder render component.

| Property | Type | Description |
|----------|------|-------------|
| `depth` | `number` | Nesting depth where the placeholder appears. |
| `parentId` | `number \| null` | Parent section ID, or `null` for root-level placeholder. |
| `onAdd` | `(item: NewContentItem) => number` | Add a new item at this placeholder's location. Returns the new item's ID. |
| `onChange` | `(id: number, item: ContentItem) => void` | Update an existing item by ID. |

#### NewContentItem

A `ContentItem` without an `id` — used when adding new items (ID is auto-generated by `FormDefinitionEditor.nextId()`).

```ts
type NewContentItem = Omit<FieldContentItem, 'id'> | Omit<SectionContentItem, 'id'>
```

---

### Internal Types (Not Exported)

#### TreeItem

Flat representation of a content item within the sortable tree.

| Property | Type | Description |
|----------|------|-------------|
| `id` | `number` | Item ID (negative for placeholders). |
| `type` | `ContentItemType \| 'add-placeholder'` | Item type including the synthetic placeholder type. |
| `parentId` | `number \| null` | Parent section ID. |
| `depth` | `number` | Nesting depth. |
| `index` | `number` | Position index. |
| `collapsed` | `boolean \| undefined` | Whether the item is collapsed (reserved for future use). |
| `item` | `ContentItem \| undefined` | The original content item (`undefined` for placeholders). |
| `onChange` | `((item: ContentItem) => void) \| undefined` | Optional change handler. |

#### Type Guards

| Guard | Narrows to | Description |
|-------|-----------|-------------|
| `isSection(item)` | `TreeItem & { type: 'section'; item: SectionContentItem }` | Checks if the item is a section. |
| `isField(item)` | `TreeItem & { type: Exclude<ContentItemType, 'section'>; item: FieldContentItem }` | Checks if the item is a field (not section, not placeholder). |
| `isAddPlaceholder(item)` | `TreeItem & { type: 'add-placeholder'; item: undefined }` | Checks if the item is an add-placeholder. |
