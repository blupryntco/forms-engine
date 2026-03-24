# Architecture

## Component Hierarchy

```
<Form>                                    Context provider (form-context.tsx)
│  Creates FormEngine, computes visibilityMap,
│  validation, documentErrors, fieldErrors
│
├── <FormViewer components={...}>         Read-only mode (form-viewer.tsx)
│   │
│   └── <FormContent mode="viewer">      Section filtering + dispatch (form/form-content.tsx)
│       │
│       └── <FormItems>                   Recursive renderer (form/form-items.tsx)
│           ├── <SectionComponent>        Nested sections → recurse FormItems
│           ├── <ArrayComponent>          Array field → synthetic items
│           │   └── <ItemComponent>       Per-item typed component
│           ├── <FieldComponent>          Scalar fields (string, number, etc.)
│           └── <ErrorComponent>          Inline validation errors
│
├── <FormEditor components={...} onChange={...}>   Editable mode (form-editor.tsx)
│   │  Adds renderFieldProps + renderArrayItemProps via useEditorHandlers
│   │
│   └── <FormContent mode="editor">
│       └── <FormItems>                   Same tree as viewer, with onChange handlers injected
│
├── <FormSections container={...} item={...}>      Section navigation (form-sections.tsx)
│
├── <FormFieldsValidation container={...} field={...} error={...}>   Field errors (form-fields-validation.tsx)
│
└── <FormDocumentValidation container={...} error={...}>             Document errors (form-document-validation.tsx)
```

## Context Provider Pattern

The `Form` component (`form-context.tsx`) is the composition root for all viewer components. It performs all heavy computation via `useMemo` and exposes results through React context.

### Construction Flow

```
Props: definition, data, section, showInlineValidation
  │
  ▼
[1] useMemo — Engine Construction
  │  new FormEngine(definition)
  │  → Catches DocumentError → stores definitionErrors
  │  Memo key: [definition]
  │
  ▼
[2] useMemo — Visibility + Validation
  │  engine.getVisibilityMap(data) → visibilityMap
  │  engine.validate(data)         → validation
  │  Merge definitionErrors + validation.documentErrors → documentErrors
  │  Extract validation.fieldErrors                     → fieldErrors
  │  Memo key: [engine, data, definitionErrors]
  │
  ▼
[3] Assemble FormContextValue
  │  { definition, data, engine, visibilityMap, validation,
  │    documentErrors, fieldErrors, section, showInlineValidation }
  │
  ▼
[4] <FormContext.Provider value={...}>
     Children consume via useFormContext()
```

Key detail: document errors are a union of schema-level errors (from `DocumentError` thrown during engine construction) and runtime errors (from `engine.validate()`). This means both invalid schema definitions and invalid form documents (e.g., missing `submittedAt`) surface through the same `documentErrors` array.

## Rendering Modes

`FormContent` (`form/form-content.tsx`) is a discriminated union component that handles both viewer and editor modes.

```
FormContentProps = FormContentViewerProps | FormContentEditorProps

Viewer mode:                          Editor mode:
  mode: 'viewer'                        mode: 'editor'
  components: ViewerComponentMap        components: EditorComponentMap
                                        renderFieldProps: (field) => EditorFieldProps
                                        renderArrayItemProps: (field, index) => EditorArrayItemProps
```

Mode discrimination happens once at the `FormContent` level. It assembles a `sharedProps` object that conditionally includes `renderFieldProps` and `renderArrayItemProps` only in editor mode. `FormItems` receives these as optional props — when present, it spreads the result onto each rendered component.

Both `FormViewer` and `FormEditor` bail out (return `null`) when:
- `definition` is missing
- `data` is missing
- `documentErrors` is non-empty

## Editor State Management

The `useEditorHandlers` hook (`form-editor.tsx`) manages change propagation from individual field components back to the consumer.

### Latest Ref Pattern

```
const stateRef = useRef({ data, onChange, engine })
stateRef.current = { data, onChange, engine }
```

On every render, `stateRef.current` is updated with the latest `data`, `onChange`, and `engine`. Handlers created once (and cached in Maps) always read from `stateRef.current`, so they see fresh state without needing to be recreated.

### Handler Memoization

Three `useRef`-backed Maps cache handlers by key:

| Map | Key | Creates |
|---|---|---|
| `fieldOnChangeMap` | `String(fieldId)` | `(value) => void` — sets field value |
| `arrayHandlersMap` | `String(fieldId)` | `{ onAddItem, onRemoveItem, onMoveItem }` |
| `arrayItemOnChangeMap` | `` `${fieldId}-${index}` `` | `(value) => void` — sets array item value |

Handlers are created lazily on first access and never recreated. Because they close over `stateRef` (not over `data` directly), they remain stable across renders.

### onChange Propagation

```
Field component calls onChange(newValue)
  │
  ▼
Cached handler reads stateRef.current → { data, onChange, engine }
  │
  ▼
Constructs new FormDocument with updated values
  │
  ▼
Calls engine.validate(newDocument)
  │
  ▼
Calls consumer's onChange(newDocument, validationResult)
  │
  ▼
Consumer updates state → Form re-renders with new data
```

The consumer receives both the updated document and the validation result in a single callback, avoiding a separate validation pass.

## Component Map Injection

The viewer package is a **renderless library** — it contains no visual components. Consumers provide all UI components via `ViewerComponentMap` or `EditorComponentMap`.

### ViewerComponentMap

```
{
  string:   ComponentType<StringViewProps>      # Text display
  number:   ComponentType<NumberViewProps>      # Numeric display
  boolean:  ComponentType<BooleanViewProps>     # Toggle display
  date:     ComponentType<DateViewProps>        # Date display
  select:   ComponentType<SelectViewProps>      # Selection display
  array:    ComponentType<ArrayViewProps>       # Array container (receives children)
  file:     ComponentType<FileViewProps>        # File display
  section:  ComponentType<SectionViewProps>     # Section wrapper (receives children)
  error?:   ComponentType<ErrorProps>           # Inline validation error
}
```

### EditorComponentMap

Same shape as `ViewerComponentMap` but with edit-specific props: each field type adds an `onChange` handler; arrays add `onAddItem`, `onRemoveItem`, `onMoveItem`.

### Lookup Mechanism

`FormItems` resolves the component for each field by indexing into the component map using the field's `type` as the key:

```
const FieldComponent = components[item.type]   // e.g., components['string']
```

If `error` is not provided in the map, inline validation errors are suppressed (controlled by `showInlineValidation` prop on `Form`).

## Section Navigation

### ROOT Sentinel

```ts
export const ROOT: unique symbol = Symbol('ROOT')
```

`ROOT` is a unique symbol that represents "top-level fields not inside any section." It is used as a section ID in the `section` prop of `Form` and in `FormSections` entries.

### DEFAULT Sentinel

```ts
export const DEFAULT: unique symbol = Symbol('DEFAULT')
```

`DEFAULT` is a unique symbol that means "show the first visible section." At render time, `FormContent` resolves `DEFAULT` to the first visible section — root-level fields if any are visible, otherwise the first visible named section. `FormSections` marks the first entry as active when `section === DEFAULT`.

### FormContent Section Filtering

When `section` is provided to `FormContent`, it filters content before rendering:

```
section === undefined  → render all items (no filtering)
section === DEFAULT    → resolve to first visible section (root fields first, then named sections)
section === ROOT       → render only items where type !== 'section'
section === <number>   → findSection(items, id) → render that section's content
```

`findSection` (`form/utils.ts`) performs a depth-first recursive search through nested sections.

### FormSections

`FormSections` (`form-sections.tsx`) builds a navigation list of top-level sections:

```
definition.content
  │
  ├─ Non-section items with at least one visible → add ROOT entry
  │    (title from defaultSectionTitle prop, defaults to "General")
  │
  └─ Section items → add if visibilityMap.get(id) !== false
```

The component accepts `container` and `item` render components (renderless pattern). Each `item` receives `{ section, active, select }` — where `active` is `true` when `entry.id === section` from context, and `select` calls `onSelect(entry.id)`.

## Recursive Item Rendering

`FormItems` (`form/form-items.tsx`) walks the content item array and renders each visible item. Three branches:

### Sections (Nested Recursion)

```
item.type === 'section'
  → <SectionComponent section={item}>
      <FormItems items={item.content} .../>    ← recursive call
    </SectionComponent>
```

### Arrays (Synthetic Fields)

```
item.type === 'array'
  → <ArrayComponent field={item} value={...} itemDef={item.item} ...>
      {arrayValue.map((itemValue, index) => {
          synthetic = getArrayField(item, index)    ← projects ArrayItemDef → FieldContentItem
          → <ItemComponent field={synthetic} value={itemValue} .../>
          → <ErrorComponent /> (if errors exist)
      })}
    </ArrayComponent>
```

`getArrayField` (`form/utils.ts`) creates a synthetic `FieldContentItem` from the array's `item` definition, preserving the parent field's `id` while adopting the item's `type`, `label`, `description`, `validation`, and `options`.

### Scalar Fields

```
item.type === 'string' | 'number' | 'boolean' | 'date' | 'select' | 'file'
  → <FieldComponent field={item} value={values[id]} errors={...} .../>
  → <ErrorComponent /> (if errors exist)
```

For `select` fields, `options` is explicitly added to the props.

All branches skip hidden items: `if (!visibilityMap.get(item.id)) continue`.

## Validation Display

Two dedicated components render validation errors outside the form body.

### FormFieldsValidation

Renders field-level errors grouped by field:

```
<ContainerComponent>
  {fieldErrors
    .filter(visible)             ← skip hidden fields via visibilityMap
    .map(({ field, errors }) =>
      <FieldComponent field={engine.getFieldDef(fieldId)} errors={errors}>
        {errors.map(error => <ErrorComponent {...error} />)}
      </FieldComponent>
    )}
</ContainerComponent>
```

Accepts three render components: `container`, `field`, `error`. Returns `null` when there are no visible field errors.

### FormDocumentValidation

Renders document-level errors (schema issues, missing `submittedAt`, etc.):

```
<ContainerComponent>
  {documentErrors.map(error => <ErrorComponent {...error} />)}
</ContainerComponent>
```

Accepts two render components: `container`, `error`. Returns `null` when `documentErrors` is empty.
