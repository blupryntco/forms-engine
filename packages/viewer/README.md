# @bluprynt/forms-viewer

Headless React components for rendering and editing JSON-driven dynamic forms. Pairs with `@bluprynt/forms-core` to handle visibility, validation, and section navigation — you supply the UI components, the viewer wires everything together.

## Key Capabilities

- **Read-only rendering** — `FormViewer` renders a form from a definition and document using your custom view components, with automatic visibility and validation display.
- **Editable forms** — `FormEditor` renders an editable form with per-field `onChange` handlers, array item manipulation (add, remove, move), and live re-validation on every change.
- **Section navigation** — `FormSections` enumerates visible top-level sections (including a synthetic root for ungrouped fields) and tracks the active section.
- **Validation display** — `FormFieldsValidation` groups field-level errors by field; `FormDocumentValidation` renders document-level errors (schema mismatch, missing `submittedAt`, etc.).
- **Headless architecture** — all rendering is delegated to component maps you provide (`ViewerComponentMap`, `EditorComponentMap`), so the package has zero UI opinions.

## Quick Start

### Setting Up the Form Provider

The `Form` component compiles the definition, computes visibility, runs validation, and exposes everything via context.

```tsx
import type { FC } from 'react'
import { Form } from '@bluprynt/forms-viewer'
import type { FormDefinition, FormDocument } from '@bluprynt/forms-viewer'

const definition: FormDefinition = { /* ... */ }
const document: FormDocument = { /* ... */ }

const App: FC = () => {
  return (
    <Form definition={definition} data={document}>
      {/* FormViewer, FormEditor, FormSections, etc. */}
    </Form>
  )
}
```

`Form` props:

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `definition` | `FormDefinition` | — | The form schema |
| `data` | `FormDocument` | — | The form values document |
| `section` | `ROOT \| number` | — | Active section id (use `ROOT` for ungrouped fields) |
| `showInlineValidation` | `boolean` | `true` | Whether field components receive validation errors |
| `children` | `ReactNode` | — | Child components |

### Using FormViewer (Read-Only)

Use `FormViewer` when you only need to display submitted form values without editing. It renders each field through your component map in a read-only mode, applying visibility rules and showing validation state.

```tsx
import type { FC } from 'react'
import { Form, FormViewer } from '@bluprynt/forms-viewer'
import type { ViewerComponentMap } from '@bluprynt/forms-viewer'

const components: ViewerComponentMap = {
  string: ({ field, value }) => <p>{field.label}: {value}</p>,
  number: ({ field, value }) => <p>{field.label}: {value}</p>,
  boolean: ({ field, value }) => <p>{field.label}: {value ? 'Yes' : 'No'}</p>,
  date: ({ field, value }) => <p>{field.label}: {value}</p>,
  select: ({ field, value, options }) => (
    <p>{field.label}: {options.find(o => o.value === value)?.label}</p>
  ),
  array: ({ field, children }) => <div>{field.label}: {children}</div>,
  file: ({ field, value }) => <p>{field.label}: {value?.name}</p>,
  section: ({ section, children }) => (
    <fieldset>
      <legend>{section.title}</legend>
      {children}
    </fieldset>
  ),
}

const ReadOnlyForm: FC = () => {
  return (
    <Form definition={definition} data={document}>
      <FormViewer components={components} />
    </Form>
  )
}
```

### Using FormEditor (Editable)

Use `FormEditor` when users need to fill in or edit a form. It provides per-field `onChange` handlers and fires a callback on every change with the updated `FormDocument` JSON and current validation result.

```tsx
import { useState, type FC } from 'react'
import { Form, FormEditor } from '@bluprynt/forms-viewer'
import type { EditorComponentMap, FormDocument, FormValidationResult } from '@bluprynt/forms-viewer'

const components: EditorComponentMap = {
  string: ({ field, value, onChange }) => (
    <input value={value ?? ''} onChange={e => onChange(e.target.value)} />
  ),
  number: ({ field, value, onChange }) => (
    <input type="number" value={value ?? ''} onChange={e => onChange(Number(e.target.value))} />
  ),
  boolean: ({ field, value, onChange }) => (
    <input type="checkbox" checked={value ?? false} onChange={e => onChange(e.target.checked)} />
  ),
  date: ({ field, value, onChange }) => (
    <input type="date" value={value ?? ''} onChange={e => onChange(e.target.value)} />
  ),
  select: ({ field, value, options, onChange }) => (
    <select value={value ?? ''} onChange={e => onChange(e.target.value)}>
      {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  ),
  array: ({ field, children, onAddItem }) => (
    <div>
      {children}
      <button onClick={onAddItem}>Add item</button>
    </div>
  ),
  file: ({ field, value, onChange }) => (
    <input type="file" onChange={e => { /* handle file */ }} />
  ),
  section: ({ section, children }) => (
    <fieldset>
      <legend>{section.title}</legend>
      {children}
    </fieldset>
  ),
}

const EditableForm: FC = () => {
  const [data, setData] = useState<FormDocument>(initialDocument)

  const handleChange = (doc: FormDocument, validation: FormValidationResult) => {
    setData(doc)
    // validation.valid, validation.fieldErrors, etc.
  }

  return (
    <Form definition={definition} data={data}>
      <FormEditor components={components} onChange={handleChange} />
    </Form>
  )
}
```

### Using FormSections for Navigation

Use `FormSections` to render form sections as tabs, a sidebar menu, or any other navigation UI and let users switch between them. It enumerates visible top-level sections and tracks the active one.

```tsx
import { useState, type FC } from 'react'
import { Form, FormViewer, FormSections, ROOT } from '@bluprynt/forms-viewer'

const FormWithSections: FC = () => {
  const [activeSection, setActiveSection] = useState<typeof ROOT | number>(ROOT)

  return (
    <Form definition={definition} data={document} section={activeSection}>
      <FormSections
        container={({ children }) => <nav>{children}</nav>}
        item={({ section, active, select }) => (
          <button onClick={select} style={{ fontWeight: active ? 'bold' : 'normal' }}>
            {section.title}
          </button>
        )}
        defaultSectionTitle="General"
        onSelect={setActiveSection}
      />
      <FormViewer components={viewerComponents} />
    </Form>
  )
}
```

### Using FormFieldsValidation and FormDocumentValidation

Use `FormDocumentValidation` to display document-level errors — schema mismatch, invalid version, missing `submittedAt`, and similar structural issues. Use `FormFieldsValidation` to display field-level errors — values that don't match validation rules defined in the form (required, min/max, pattern, etc.).

```tsx
import type { FC } from 'react'
import { Form, FormFieldsValidation, FormDocumentValidation } from '@bluprynt/forms-viewer'

const ValidationSummary: FC = () => {
  return (
    <Form definition={definition} data={document}>
      <FormDocumentValidation
        container={({ children }) => <div className="doc-errors">{children}</div>}
        error={({ code, message }) => <p>{message} ({code})</p>}
      />
      <FormFieldsValidation
        container={({ children }) => <div className="field-errors">{children}</div>}
        field={({ field, errors, children }) => (
          <div>
            <strong>{field?.label}</strong>
            {children}
          </div>
        )}
        error={({ message, rule }) => <p>{message} [{rule}]</p>}
      />
    </Form>
  )
}
```

## Component Map Types

### ViewerComponentMap

Component map for read-only rendering. Each key maps a field type to a React component.

| Key | Props Type | Description |
|-----|-----------|-------------|
| `string` | `StringViewProps` | Text field display |
| `number` | `NumberViewProps` | Numeric field display |
| `boolean` | `BooleanViewProps` | Boolean field display |
| `date` | `DateViewProps` | Date field display |
| `select` | `SelectViewProps` | Select field display (receives `options`) |
| `array` | `ArrayViewProps` | Array field display (receives `children` for items, `itemDef`) |
| `file` | `FileViewProps` | File field display |
| `section` | `SectionViewProps` | Section wrapper (receives `children`) |
| `error?` | `ErrorProps` | Optional inline error renderer |

All view field props extend `BaseViewFieldProps` which provides `field: FieldContentItem` and `errors: FieldValidationError[]`.

### EditorComponentMap

Component map for editable rendering. Extends view props with mutation callbacks.

| Key | Props Type | Description |
|-----|-----------|-------------|
| `string` | `StringEditProps` | Text input with `onChange(value)` |
| `number` | `NumberEditProps` | Numeric input with `onChange(value)` |
| `boolean` | `BooleanEditProps` | Boolean input with `onChange(value)` |
| `date` | `DateEditProps` | Date input with `onChange(value)` |
| `select` | `SelectEditProps` | Select input with `onChange(value)` and `options` |
| `array` | `ArrayEditProps` | Array editor with `onAddItem`, `onRemoveItem(index)`, `onMoveItem(from, to)` |
| `file` | `FileEditProps` | File input with `onChange(value)` |
| `section` | `SectionEditProps` | Section wrapper (receives `children`) |
| `error?` | `ErrorProps` | Optional inline error renderer |

All edit field props extend `BaseEditFieldProps` which adds `onChange(value)` to the base view props.

## Exported API

| Export | Kind | Description |
|--------|------|-------------|
| `Form` | Component | Context provider — compiles definition, computes visibility and validation |
| `useFormContext` | Hook | Access form context (definition, data, engine, visibility, validation) |
| `FormViewer` | Component | Read-only form renderer |
| `FormEditor` | Component | Editable form renderer with change callbacks |
| `FormSections` | Component | Section navigation list |
| `FormFieldsValidation` | Component | Field-level validation error display |
| `FormDocumentValidation` | Component | Document-level validation error display |
| `ROOT` | Symbol | Identifies the root (ungrouped fields) section |
| `ViewerComponentMap` | Type | Component map for `FormViewer` |
| `EditorComponentMap` | Type | Component map for `FormEditor` |
| `BaseViewFieldProps` | Type | Base props for view field components |
| `BaseEditFieldProps` | Type | Base props for edit field components |
| `ErrorProps` | Type | Props for inline error components |
| `FormSectionEntry` | Type | Section entry in `FormSections` |
| `FormSectionItemProps` | Type | Props for section item renderer |
| `FieldValidationFieldEntry` | Type | Field + errors group in `FormFieldsValidation` |
| `FormValuesEditor` | Class | Fluent editor for reading and writing form values against a definition |
| `DocumentError` | Class | Error representing a document-level validation failure |
| `FormDefinition` | Type | JSON schema describing form structure, fields, sections, and rules |
| `FormDocument` | Type | JSON document containing user-submitted form values |
| `FormValidationResult` | Type | Validation outcome with document-level and field-level errors |
| `FieldType` | Type | Union of supported field types (`string`, `number`, `boolean`, `date`, `select`, `array`, `file`) |
| `FileValue` | Type | File field value containing name, MIME type, size, and URL |

## Documentation

- [API Reference](docs/api-reference.md) — detailed description of all exported components, hooks, and types
- [Architecture](docs/architecture.md) — internal design, data flow, and component structure
- [Development Guide](docs/development-guide.md) — setup, testing, and contribution guidelines
