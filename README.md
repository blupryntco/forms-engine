# Bluprynt Forms Engine

A system for defining custom form schemas (JSON), rendering forms from those schemas, and collecting validated user input (JSON). The engine supports conditional visibility, type-aware validation, nested sections, and drag-and-drop schema editing.

## Packages

| Package | Description |
|---------|-------------|
| [`@bluprynt/forms-core`](./packages/core/) | Framework-agnostic engine: schema compilation, conditional visibility, validation, relative dates. No UI dependencies. |
| [`@bluprynt/forms-viewer`](./packages/viewer/) | Headless React components for rendering and editing forms. Read-only viewer, editable editor, section navigation, validation display. |
| [`@bluprynt/forms-builder`](./packages/builder/) | Headless React component for building form schemas with drag-and-drop reordering and nested sections. |

### @bluprynt/forms-core

The foundation. Compiles a JSON form definition into a runtime engine that handles:
- Field visibility via conditional logic (simple and compound conditions)
- Type-aware validation (string, number, boolean, date, select, array, file)
- Dependency graph with cycle detection and topological ordering
- Fluent APIs for building schemas (`FormDefinitionEditor`) and editing values (`FormValuesEditor`)

### @bluprynt/forms-viewer

Headless React components that pair with `forms-core`. You provide the UI components, the viewer wires visibility, validation, and state management:
- `FormViewer` — read-only rendering
- `FormEditor` — editable forms with per-field `onChange` and live validation
- `FormSections` — section-based navigation
- `FormFieldsValidation` / `FormDocumentValidation` — validation error display

### @bluprynt/forms-builder

Headless React component for constructing form schemas visually. Provides drag-and-drop reordering with depth-aware nesting (max 3 levels), item CRUD, and automatic add-placeholders. All mutations go through `FormDefinitionEditor` from `forms-core`.

## Quick Start

### Install

```bash
npm install @bluprynt/forms-core @bluprynt/forms-viewer
```

### Display a form (read-only)

```tsx
import type { FC } from 'react'
import { Form, FormViewer } from '@bluprynt/forms-viewer'
import type { ViewerComponentMap } from '@bluprynt/forms-viewer'

const components: ViewerComponentMap = {
  string:  ({ field, value }) => <p>{field.label}: {value}</p>,
  number:  ({ field, value }) => <p>{field.label}: {value}</p>,
  boolean: ({ field, value }) => <p>{field.label}: {value ? 'Yes' : 'No'}</p>,
  date:    ({ field, value }) => <p>{field.label}: {value}</p>,
  select:  ({ field, value, options }) => (
    <p>{field.label}: {options.find(o => o.value === value)?.label}</p>
  ),
  array:   ({ field, children }) => <div>{field.label}: {children}</div>,
  file:    ({ field, value }) => <p>{field.label}: {value?.name}</p>,
  section: ({ section, children }) => (
    <fieldset><legend>{section.title}</legend>{children}</fieldset>
  ),
}

const App: FC = () => (
  <Form definition={formDefinition} data={formDocument}>
    <FormViewer components={components} />
  </Form>
)
```

### Edit a form

```tsx
import { useState, type FC } from 'react'
import { Form, FormEditor } from '@bluprynt/forms-viewer'
import type { EditorComponentMap, FormDocument, FormValidationResult } from '@bluprynt/forms-viewer'

const components: EditorComponentMap = {
  string:  ({ value, onChange }) => <input value={value ?? ''} onChange={e => onChange(e.target.value)} />,
  number:  ({ value, onChange }) => <input type="number" value={value ?? ''} onChange={e => onChange(Number(e.target.value))} />,
  boolean: ({ value, onChange }) => <input type="checkbox" checked={value ?? false} onChange={e => onChange(e.target.checked)} />,
  date:    ({ value, onChange }) => <input type="date" value={value ?? ''} onChange={e => onChange(e.target.value)} />,
  select:  ({ value, options, onChange }) => (
    <select value={value ?? ''} onChange={e => onChange(e.target.value)}>
      {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  ),
  array:   ({ children, onAddItem }) => <div>{children}<button onClick={onAddItem}>Add</button></div>,
  file:    ({ onChange }) => <input type="file" onChange={() => { /* handle */ }} />,
  section: ({ section, children }) => (
    <fieldset><legend>{section.title}</legend>{children}</fieldset>
  ),
}

const App: FC = () => {
  const [data, setData] = useState<FormDocument>(initialDocument)

  const handleChange = (doc: FormDocument, validation: FormValidationResult) => {
    setData(doc)
  }

  return (
    <Form definition={formDefinition} data={data}>
      <FormEditor components={components} onChange={handleChange} />
    </Form>
  )
}
```

## Setup

```bash
pnpm install
pnpm build        # build all packages
pnpm test         # run all tests
pnpm lint         # lint all packages
pnpm check-types  # type-check all packages
```

Requires Node.js >= 22 and pnpm 10+.
