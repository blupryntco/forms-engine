# API Reference

## Constants

### ROOT

A unique symbol used to reference the "root" pseudo-section — i.e., top-level fields that are not inside any named section.

```ts
import { ROOT } from '@bluprynt/forms-viewer'
```

Used as the `section` prop value on `Form` to display only top-level non-section fields.

---

## Components

### Form

Context provider that compiles a `FormDefinition`, computes visibility, runs validation, and exposes results to child components via `useFormContext`.

```ts
import { Form } from '@bluprynt/forms-viewer'
```

#### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `definition` | `FormDefinition \| undefined` | — | The form schema. When `undefined`, children receive empty context. |
| `data` | `FormDocument \| undefined` | — | The form document with values. When `undefined`, validation and visibility are skipped. |
| `section` | `typeof ROOT \| number \| undefined` | `undefined` | Restricts rendered content to a specific section (or root-level fields when `ROOT`). |
| `showInlineValidation` | `boolean` | `true` | Whether inline validation errors are shown next to fields. |
| `children` | `ReactNode` | — | Child components (typically `FormViewer`, `FormEditor`, etc.). |

#### Behavior

- Creates a `FormEngine` from `definition` on mount (memoized).
- If the definition is invalid, catches `DocumentError` and exposes its errors via `documentErrors`.
- Computes `visibilityMap` and `validation` whenever `engine` or `data` changes.
- Merges definition-level and document-level errors into a single `documentErrors` array.

```tsx
<Form definition={schema} data={doc} section={ROOT} showInlineValidation>
  <FormViewer components={viewerComponents} />
</Form>
```

---

### FormViewer

Renders a form in **read-only** mode using the provided component map.

```ts
import { FormViewer } from '@bluprynt/forms-viewer'
```

#### Props

| Prop | Type | Description |
|------|------|-------------|
| `components` | `ViewerComponentMap` | Map of field-type components for read-only rendering. |

#### Behavior

- Reads context via `useFormContext`.
- Returns `null` when `definition` or `data` is missing, or when `documentErrors` is non-empty.
- Delegates rendering to `FormContent` in `"viewer"` mode, passing visibility, values, errors, and the active section.

```tsx
<Form definition={schema} data={doc}>
  <FormViewer components={viewerComponents} />
</Form>
```

---

### FormEditor

Renders a form in **editable** mode. Provides stable per-field and per-array-item `onChange` handlers.

```ts
import { FormEditor } from '@bluprynt/forms-viewer'
```

#### Props

| Prop | Type | Description |
|------|------|-------------|
| `components` | `EditorComponentMap` | Map of field-type components for editable rendering. |
| `onChange` | `(data: FormDocument, validation: FormValidationResult) => void` | Called after every field change with the updated document and fresh validation result. |

#### Behavior

- Reads context via `useFormContext`.
- Uses `useEditorHandlers` internally to produce stable `renderFieldProps` and `renderArrayItemProps` callbacks.
- Returns `null` when `definition` or `data` is missing, or when `documentErrors` is non-empty.
- On each field mutation, creates a new `FormDocument` (shallow copy of values), validates via `FormEngine`, and calls `onChange`.

```tsx
const [doc, setDoc] = useState(initialDoc)

const handleChange = (data: FormDocument, validation: FormValidationResult) => {
  setDoc(data)
}

<Form definition={schema} data={doc}>
  <FormEditor components={editorComponents} onChange={handleChange} />
</Form>
```

---

### FormSections

Renders a navigation list of top-level sections, including a synthetic "root" entry for non-section fields.

```ts
import { FormSections } from '@bluprynt/forms-viewer'
```

#### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `container` | `ComponentType<PropsWithChildren>` | — | Wrapper component for the section list. |
| `item` | `ComponentType<FormSectionItemProps>` | — | Component rendered for each section entry. |
| `defaultSectionTitle` | `string` | `'General'` | Title for the synthetic root section. |
| `defaultSectionDescription` | `string \| undefined` | `undefined` | Description for the synthetic root section. |
| `onSelect` | `(id: typeof ROOT \| number) => void` | — | Called when a section is selected. |

#### Behavior

- Reads context via `useFormContext`.
- Builds a list of `FormSectionEntry` items from the definition's top-level content.
- Includes a root entry (with `id: ROOT`) only when at least one top-level non-section field is visible.
- Skips sections where `visibilityMap` returns `false`.
- Returns `null` when `definition` or `data` is missing, or when `documentErrors` is non-empty.

```tsx
<FormSections
  container={SectionList}
  item={SectionTab}
  defaultSectionTitle="Overview"
  onSelect={(id) => setActiveSection(id)}
/>
```

---

### FormFieldsValidation

Renders field-level validation errors grouped by field. Only shows errors for visible fields.

```ts
import { FormFieldsValidation } from '@bluprynt/forms-viewer'
```

#### Props

| Prop | Type | Description |
|------|------|-------------|
| `container` | `ComponentType<PropsWithChildren>` | Wrapper component for the error list. |
| `field` | `ComponentType<PropsWithChildren<FieldValidationFieldEntry>>` | Component rendered for each field group. Receives `field` and `errors` props, and error children. |
| `error` | `ComponentType<FieldValidationError>` | Component rendered for each individual error. |

#### Behavior

- Reads context via `useFormContext`.
- Filters out errors for hidden fields (using `visibilityMap`).
- Returns `null` when there are no visible field errors.
- Resolves `FieldEntry` for each errored field via `engine.getFieldDef()`.

```tsx
<FormFieldsValidation
  container={ErrorList}
  field={FieldErrorGroup}
  error={ErrorItem}
/>
```

---

### FormDocumentValidation

Renders document-level validation errors (schema mismatches, `submittedAt` issues, definition errors).

```ts
import { FormDocumentValidation } from '@bluprynt/forms-viewer'
```

#### Props

| Prop | Type | Description |
|------|------|-------------|
| `container` | `ComponentType<PropsWithChildren>` | Wrapper component for the error list. |
| `error` | `ComponentType<DocumentValidationError>` | Component rendered for each document error. |

#### Behavior

- Reads context via `useFormContext`.
- Returns `null` when `documentErrors` is empty or undefined.

```tsx
<FormDocumentValidation
  container={ErrorBanner}
  error={DocumentErrorItem}
/>
```

---

## Hooks

### useFormContext

Returns the current form context value. Must be called within a `<Form>` provider.

```ts
import { useFormContext } from '@bluprynt/forms-viewer'
```

#### Return Type

| Property | Type | Description |
|----------|------|-------------|
| `definition` | `FormDefinition \| undefined` | The form schema passed to `<Form>`. |
| `data` | `FormDocument \| undefined` | The form document passed to `<Form>`. |
| `engine` | `FormEngine \| undefined` | Compiled engine instance. `undefined` if definition is missing or invalid. |
| `visibilityMap` | `Map<number, boolean>` | Authoritative visibility for all items. Empty map when engine/data is missing. |
| `validation` | `FormValidationResult \| undefined` | Full validation result. `undefined` when engine/data is missing. |
| `documentErrors` | `readonly DocumentValidationError[] \| undefined` | Merged definition + document errors. |
| `fieldErrors` | `Map<number, FieldValidationError[]>` | Field-level errors indexed by field ID. Empty map when no errors. |
| `section` | `typeof ROOT \| number \| undefined` | The active section from the `<Form>` provider. |
| `showInlineValidation` | `boolean` | Whether inline validation is enabled. |

**Throws:** `Error` if called outside a `<Form>` provider.

```ts
const { definition, data, fieldErrors, visibilityMap } = useFormContext()
```

---

## Types

### Base Types

| Type | Description |
|------|-------------|
| `BaseViewFieldProps` | Common props shared by all read-only field components: the field definition and its validation errors. |
| `BaseEditFieldProps` | Extends `BaseViewFieldProps` with an `onChange` handler for editable fields. |
| `ErrorProps` | Props for rendering validation errors associated with a specific field. |

### Viewer Types

Props for read-only field components used in `ViewerComponentMap`. Each type provides the field definition, validation errors, and a typed `value` matching the field type.

| Type | Description |
|------|-------------|
| `StringViewProps` | Read-only string field. Value is the text content. |
| `NumberViewProps` | Read-only number field. Value is the numeric content. |
| `BooleanViewProps` | Read-only boolean field. Value is the toggle state. |
| `DateViewProps` | Read-only date field. Value is an ISO 8601 date string. |
| `SelectViewProps` | Read-only select field. Includes the selected value and the list of available options. |
| `ArrayViewProps` | Read-only array field. Includes the array values, the item schema definition, and pre-rendered children for each item. |
| `FileViewProps` | Read-only file field. Value contains file metadata (name, MIME type, size, URL). |
| `SectionViewProps` | Read-only section wrapper. Receives the section definition and its children. |
| `ViewerComponentMap` | A mapping from each field type to its read-only component. Passed to `FormViewer`. Optional `error` component for inline validation. |

### Editor Types

Props for editable field components used in `EditorComponentMap`. Each type extends the viewer props with typed `onChange` handlers. Array fields additionally receive handlers for adding, removing, and reordering items.

| Type | Description |
|------|-------------|
| `StringEditProps` | Editable string field with typed `onChange`. |
| `NumberEditProps` | Editable number field with typed `onChange`. |
| `BooleanEditProps` | Editable boolean field with typed `onChange`. |
| `DateEditProps` | Editable date field with typed `onChange`. |
| `SelectEditProps` | Editable select field with typed `onChange` and available options. |
| `ArrayEditProps` | Editable array field with `onChange`, `onAddItem`, `onRemoveItem`, `onMoveItem`, and pre-rendered children. |
| `FileEditProps` | Editable file field with typed `onChange`. |
| `SectionEditProps` | Editable section wrapper. Receives the section definition and its children. |
| `EditorComponentMap` | A mapping from each field type to its editable component. Passed to `FormEditor`. Optional `error` component for inline validation. |
| `EditorFieldProps` | Change handlers provided to each field by the editor: `onChange` plus optional array manipulation handlers. |
| `EditorArrayItemProps` | Change handler provided for a single array item. |

### Section Types

| Type | Description |
|------|-------------|
| `FormSectionEntry` | Describes a section entry in the navigation list, including the synthetic root section. |
| `FormSectionItemProps` | Props for rendering a single section navigation item: the section data, whether it is active, and a callback to select it. |

### Validation Types

| Type | Description |
|------|-------------|
| `FieldValidationFieldEntry` | Groups a field definition with its validation errors. Used by `FormFieldsValidation`. |

### Re-exported from `@bluprynt/forms-core`

| Type | Description |
|------|-------------|
| `ArrayItemDef` | Schema describing items inside an array field. |
| `ContentItem` | A union of field and section nodes in a form definition. |
| `DocumentValidationError` | A document-level validation error with code, message, and optional params. |
| `DocumentValidationErrorCode` | Union of all possible document error codes. |
| `FieldContentItem` | A field node in a form definition tree. |
| `FieldEntry` | Flattened field registry entry produced by `FormEngine`. |
| `FieldType` | Union of all supported field type identifiers. |
| `FieldValidationError` | A field-level validation error with field ID, rule, message, and optional item index. |
| `FileValue` | File metadata: name, MIME type, size, and URL. |
| `FormDefinition` | Top-level form schema describing the entire form structure. |
| `FormDocument` | A submitted form: references the form schema and contains the user's values. |
| `FormSnapshot` | A pair of form definition and document, used for serialization. |
| `FormValidationResult` | Complete validation result: overall validity, field errors, and optional document errors. |
| `FormValues` | A record mapping field names to their values. |
| `SectionContentItem` | A section node in a form definition tree. |
| `SelectOption` | A single option in a select field: value and display label. |

### Re-exported from `@bluprynt/forms-core` (Classes)

| Export | Description |
|--------|-------------|
| `DocumentError` | Error thrown when a form document fails validation. Contains an array of document-level errors. |
| `FormValuesEditor` | Fluent API for reading and writing form values against a definition. |
