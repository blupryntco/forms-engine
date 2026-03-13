# React Components for Forms Engine — PRD

## 1. Overview

Package `@bluprynt/forms-viewer` provides two headless React components — `FormViewer` (read-only) and `FormEditor` (editable) — that render forms based on `@bluprynt/forms-core` definitions. The components are **renderless**: they own layout logic, visibility, and validation orchestration, but delegate all visual rendering to consumer-supplied component types.

---

## 2. Exports

```ts
// Components
export { FormViewer } from './form-viewer'
export { FormEditor } from './form-editor'

// Symbol
export { ROOT } from './constants'

// Types (all prop/component types)
export type { ... } from './types'
```

No hooks are exported in v1. The API surface is intentionally minimal.

---

## 3. Core Design Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Component injection | `ComponentType<Props>` via `components` map | Type-safe, standard React pattern |
| State model (FormEditor) | Fully controlled | Parent owns `values` + `onChange` |
| Validation display | Errors in field props **and** optional error component | Maximum flexibility |
| Submit model | `onChange` only | No internal submit; consumer decides when to persist |
| Section filter | `undefined \| typeof ROOT \| number` | Symbol avoids collision |
| Array rendering | Wrapper + item delegation | Array component wraps; items rendered as typed field components |
| Component maps | Separate `ViewerComponentMap` / `EditorComponentMap` | Type-safe read-only vs editable props |
| Section header on filter | Configurable via `includeSectionHeader` prop | Consumer controls |

---

## 4. `ROOT` Symbol

```ts
export const ROOT: unique symbol = Symbol('ROOT')
export type ROOT = typeof ROOT
```

Used as a section filter value to display only top-level fields that are not inside any section.

---

## 5. Component Maps

### 5.1 Viewer Component Map

Consumer passes a `ViewerComponentMap` to `FormViewer`. Each key corresponds to a content item type. All entries are **required** (no defaults — the package is fully headless).

```ts
type ViewerComponentMap = {
  string:  ComponentType<StringViewProps>
  number:  ComponentType<NumberViewProps>
  boolean: ComponentType<BooleanViewProps>
  date:    ComponentType<DateViewProps>
  select:  ComponentType<SelectViewProps>
  array:   ComponentType<ArrayViewProps>
  section: ComponentType<SectionViewProps>
  error?:  ComponentType<ErrorProps>
}
```

### 5.2 Editor Component Map

Consumer passes an `EditorComponentMap` to `FormEditor`. Same structure but with editable props.

```ts
type EditorComponentMap = {
  string:  ComponentType<StringEditProps>
  number:  ComponentType<NumberEditProps>
  boolean: ComponentType<BooleanEditProps>
  date:    ComponentType<DateEditProps>
  select:  ComponentType<SelectEditProps>
  array:   ComponentType<ArrayEditProps>
  section: ComponentType<SectionEditProps>
  error?:  ComponentType<ErrorProps>
}
```

---

## 6. Component Props (Viewer)

All viewer field components receive read-only props. No `onChange`.

### 6.1 Common Viewer Field Props

Every viewer field component receives at minimum:

```ts
type BaseViewFieldProps = {
  /** Field definition from core (includes id, label, description, validation config) */
  field: FieldContentItem
  /** Validation errors for this field (empty array if valid or validation not displayed) */
  errors: FieldValidationError[]
}
```

### 6.2 Per-Type Viewer Props

```ts
type StringViewProps = BaseViewFieldProps & {
  value: string | undefined
}

type NumberViewProps = BaseViewFieldProps & {
  value: number | undefined
}

type BooleanViewProps = BaseViewFieldProps & {
  value: boolean | undefined
}

type DateViewProps = BaseViewFieldProps & {
  value: string | undefined  // ISO 8601
}

type SelectViewProps = BaseViewFieldProps & {
  value: string | number | undefined
  options: SelectOption[]    // from field definition
}

type ArrayViewProps = BaseViewFieldProps & {
  /** The raw array value */
  value: unknown[] | undefined
  /** Item definition (type, label, validation, options if select) */
  itemDef: ArrayItemDef
  /**
   * Pre-rendered item elements.
   * Each item is rendered using the appropriate typed component
   * (string, number, etc.) based on itemDef.type.
   */
  children: ReactNode
}
```

### 6.3 Section Viewer Props

```ts
type SectionViewProps = {
  /** Section definition from core (includes id, title, description) */
  section: SectionContentItem
  /** Pre-rendered section content (fields and nested sections) */
  children: ReactNode
}
```

### 6.4 Error Props

```ts
type ErrorProps = {
  /** Validation errors for a single field */
  errors: FieldValidationError[]
  /** The field definition this error belongs to */
  field: FieldContentItem
}
```

When the `error` component is provided in the map, it is rendered adjacent to (after) each field that has validation errors. This is **in addition** to errors being passed as props to the field component itself.

---

## 7. Component Props (Editor)

Editor field components extend viewer props with mutation capabilities.

### 7.1 Common Editor Field Props

```ts
type BaseEditFieldProps = BaseViewFieldProps & {
  /** Callback to update this field's value */
  onChange: (value: unknown) => void
}
```

### 7.2 Per-Type Editor Props

```ts
type StringEditProps = BaseEditFieldProps & {
  value: string | undefined
  onChange: (value: string | undefined) => void
}

type NumberEditProps = BaseEditFieldProps & {
  value: number | undefined
  onChange: (value: number | undefined) => void
}

type BooleanEditProps = BaseEditFieldProps & {
  value: boolean | undefined
  onChange: (value: boolean | undefined) => void
}

type DateEditProps = BaseEditFieldProps & {
  value: string | undefined  // ISO 8601
  onChange: (value: string | undefined) => void
}

type SelectEditProps = BaseEditFieldProps & {
  value: string | number | undefined
  options: SelectOption[]
  onChange: (value: string | number | undefined) => void
}

type ArrayEditProps = BaseEditFieldProps & {
  value: unknown[] | undefined
  itemDef: ArrayItemDef
  /**
   * Pre-rendered item elements (each is an editor component for the item type).
   * FormEditor handles instantiation; ArrayEditProps.children contains them.
   */
  children: ReactNode
  /** Add a new item at the end */
  onAddItem: () => void
  /** Remove item at index */
  onRemoveItem: (index: number) => void
  /** Move item from one index to another */
  onMoveItem: (fromIndex: number, toIndex: number) => void
}
```

### 7.3 Section Editor Props

```ts
type SectionEditProps = {
  section: SectionContentItem
  children: ReactNode
}
```

Same as viewer — sections have no editable state.

### 7.4 Array Item Rendering (Editor)

For arrays, each item is rendered using the appropriate **editor** component for the item's type (e.g., `StringEditProps` for `item.type === 'string'`). The item components receive:
- `field` — a synthetic `FieldContentItem` derived from the `ArrayItemDef` (with the array field's id and an appended item index context)
- `value` — the individual item value
- `onChange` — updates that specific item's value
- `errors` — validation errors for that specific item index (filtered from the array field's errors by `itemIndex`)

These rendered items are passed as `children` to the `ArrayEditProps` / `ArrayViewProps` component.

---

## 8. `FormViewer` Component

### 8.1 Props

```ts
type FormViewerProps = {
  /** Parsed form definition (JSON) */
  definition: FormDefinition
  /** Form values object */
  values: FormValues
  /** Component map for rendering */
  components: ViewerComponentMap
  /**
   * Section filter:
   * - undefined: show all content
   * - ROOT: show only top-level fields not inside any section
   * - number: show content of the section with this id
   */
  section?: typeof ROOT | number
  /**
   * When section filter is a specific section id, controls whether
   * the section's own wrapper (title, description) is rendered.
   * Default: true
   */
  includeSectionHeader?: boolean
  /**
   * Whether to display validation state.
   * - true: validate values against definition and pass errors to components
   * - false (default): no validation errors are passed to components
   */
  showValidation?: boolean
}
```

### 8.2 Behavior

1. **Instantiate `FormEngine`** from `definition` (memoized — only re-created when `definition` changes).
2. **Compute visibility map** from `engine.getVisibilityMap(values)`.
3. **Optionally validate** via `engine.validate(values)` when `showValidation === true`.
4. **Walk the content tree** of the definition:
   - For each content item, check visibility map. If hidden, skip.
   - Apply section filter logic (see §10).
   - For fields: render the corresponding component from `components` map with the appropriate viewer props.
   - For sections: render the `section` component, recursively rendering its content as `children`.
   - For array fields: render each array item using the typed component for `itemDef.type`, pass rendered items as `children` to the `array` component.
   - If `showValidation` and a field has errors and `components.error` is provided, render the error component after the field.
5. **No HTML wrapper** — FormViewer renders its content directly (fragment). Consumer wraps in desired container.

### 8.3 Memoization

- `FormEngine` instance: memoized on `definition` reference.
- Visibility map: recomputed on every render (depends on `values`).
- Validation result: recomputed when `values` change and `showValidation` is true.
- Individual field components: should be memoized based on their props (field def + value + errors) to avoid unnecessary re-renders.

---

## 9. `FormEditor` Component

### 9.1 Props

```ts
type FormEditorProps = {
  /** Parsed form definition (JSON) */
  definition: FormDefinition
  /** Current form values (controlled) */
  values: FormValues
  /** Component map for rendering */
  components: EditorComponentMap
  /**
   * Called on every field value change.
   * Receives updated values and current validation result.
   */
  onChange: (values: FormValues, validation: FormValidationResult) => void
  /** Section filter (same as FormViewer) */
  section?: typeof ROOT | number
  /** Include section header when filtering (same as FormViewer). Default: true */
  includeSectionHeader?: boolean
  /**
   * Whether to display validation errors to field components.
   * - true: pass errors to field components and render error components
   * - false (default): errors still computed for onChange but not passed to field components
   */
  showValidation?: boolean
}
```

### 9.2 Behavior

1. **Instantiate `FormEngine`** from `definition` (memoized).
2. **Compute visibility map** from `engine.getVisibilityMap(values)`.
3. **Validate** via `engine.validate(values)` — always computed (needed for `onChange` callback), but errors are only passed to components when `showValidation === true`.
4. **Walk the content tree** — same as FormViewer but with editor components and `onChange` wiring.
5. **Field onChange handling**:
   - When a field component calls its `onChange(newValue)`, FormEditor:
     a. Constructs new `FormValues` with the updated field value.
     b. Recomputes validation on the new values.
     c. Calls `props.onChange(newValues, newValidation)`.
   - The parent updates state, new `values` prop flows back down (controlled loop).
6. **Array mutation handlers** (`onAddItem`, `onRemoveItem`, `onMoveItem`):
   - Construct new array value with the mutation applied.
   - Follow same onChange flow as field changes.

### 9.3 Memoization

Same as FormViewer, plus:
- Per-field `onChange` callbacks: must be stable (memoized per field id) to prevent unnecessary child re-renders.
- Array mutation handlers: stable per array field id.

---

## 10. Section Filter Logic

The `section` prop controls which portion of the form content tree is rendered.

### 10.1 `section={undefined}` — Show All

Render the entire content tree. All visible sections, fields, and nested content.

### 10.2 `section={ROOT}` — Root Fields Only

Render only top-level content items that are **not** sections. Top-level sections and all their content are excluded.

[assumption: ROOT shows top-level non-section items only; top-level sections are hidden entirely]

### 10.3 `section={<number>}` — Specific Section

Render the content of the section with the given numeric `id`.

- If `includeSectionHeader` is `true` (default): render the section component wrapping its content.
- If `includeSectionHeader` is `false`: render only the section's inner content (fields and sub-sections) without the section wrapper.
- If the section id doesn't exist or the section is hidden by conditions, render nothing.

### 10.4 Visibility Interaction

Section filter is applied **after** visibility evaluation. A section that is hidden by conditions renders nothing regardless of the filter value.

---

## 11. Validation Display Flow

```
                          FormViewer/FormEditor
                                  |
                     engine.validate(values)
                                  |
                    FormValidationResult { errors[] }
                                  |
                  +---------------+---------------+
                  |                               |
         Field component                   Error component
    receives errors[] prop            (if components.error provided)
    (always, when showValidation)     rendered after the field
```

- `showValidation=false` (default): field components receive `errors: []`. Error components are not rendered.
- `showValidation=true`: field components receive their matching errors. If `components.error` is provided, it is also rendered after each invalid field.
- In FormEditor, validation is always computed internally for the `onChange` callback regardless of `showValidation`.

---

## 12. Content Tree Rendering Algorithm

Pseudocode for the rendering walk:

```
function renderContent(items: ContentItem[], visibilityMap, values, errors):
  for each item in items:
    if not visibilityMap.get(item.id):
      continue  // hidden by condition

    if item.type === 'section':
      childContent = renderContent(item.content, visibilityMap, values, errors)
      yield <components.section section={item} children={childContent} />

    else if item.type === 'array':
      itemElements = renderArrayItems(item, values, errors)
      fieldErrors = errors.filter(e => e.fieldId === item.id && e.itemIndex == null)
      yield <components.array field={item} value={values[item.id]} itemDef={item.item} children={itemElements} errors={fieldErrors} />
      if components.error && fieldErrors.length > 0:
        yield <components.error errors={fieldErrors} field={item} />

    else:
      fieldErrors = errors.filter(e => e.fieldId === item.id)
      yield <components[item.type] field={item} value={values[item.id]} errors={fieldErrors} />
      if components.error && fieldErrors.length > 0:
        yield <components.error errors={fieldErrors} field={item} />

function renderArrayItems(arrayField, values, errors):
  arrayValue = values[arrayField.id] ?? []
  for each (itemValue, index) in arrayValue:
    itemErrors = errors.filter(e => e.fieldId === arrayField.id && e.itemIndex === index)
    yield <components[arrayField.item.type]
      field={syntheticFieldDef(arrayField, index)}
      value={itemValue}
      errors={itemErrors}
      // + onChange, onAddItem, etc. for editor
    />
```

---

## 13. Type Exports Summary

The package exports the following types:

```ts
// Symbol
ROOT

// Component props — Viewer
StringViewProps, NumberViewProps, BooleanViewProps,
DateViewProps, SelectViewProps, ArrayViewProps,
SectionViewProps

// Component props — Editor
StringEditProps, NumberEditProps, BooleanEditProps,
DateEditProps, SelectEditProps, ArrayEditProps,
SectionEditProps

// Shared
ErrorProps

// Component maps
ViewerComponentMap, EditorComponentMap

// Top-level props
FormViewerProps, FormEditorProps
```

All core types (`FormDefinition`, `FormValues`, `FieldValidationError`, `FormValidationResult`, etc.) are re-exported from `@bluprynt/forms-core` for consumer convenience.

---

## 14. Non-Goals (v1)

- No built-in UI components (fully headless).
- No hooks exported.
- No internal state management in FormEditor (fully controlled).
- No submit/reset actions.
- No form-level error summary component.
- No default styling or CSS.
- No server-side rendering considerations beyond standard React SSR compatibility.

---

## 15. File Structure

```
packages/viewer/src/
  index.ts                 — public exports
  constants.ts             — ROOT symbol
  types.ts                 — all type definitions
  form-viewer.tsx           — FormViewer component (arrow function)
  form-editor.tsx           — FormEditor component (arrow function)
  use-form-engine.ts        — internal hook: memoized FormEngine instantiation (arrow function)
  render-content.tsx        — shared content tree rendering logic (arrow functions)
  render-content.test.tsx   — tests for rendering logic
  form-viewer.test.tsx      — FormViewer tests
  form-editor.test.tsx      — FormEditor tests
```

### 15.1 Code Style

- All components and functions use **arrow function** syntax.
- File names use **kebab-case**.

```ts
// Example
export const FormViewer: FC<FormViewerProps> = ({ definition, values, ... }) => {
  // ...
}
```

---

## 16. Dependencies

- **Peer**: `react` (^18.0.0 || ^19.0.0), `@bluprynt/forms-core` (workspace)
- **Dev**: `@testing-library/react`, `react-dom`, existing test infra
- **Runtime**: none beyond peers
