# @bluprynt/forms-core

Framework-agnostic engine for JSON-driven dynamic forms. Given a form schema (JSON), the engine handles field visibility via conditional logic, validates user input against type-specific rules, and produces structured form documents (JSON).

## Key Capabilities

- **Schema compilation** — validates and compiles a JSON form definition into a runtime engine with dependency analysis and cycle detection.
- **Conditional visibility** — shows/hides fields and sections dynamically based on other field values, with cascading parent-child visibility and topological evaluation order.
- **Type-aware validation** — validates form values against per-field rules (required, min/max, pattern, date ranges, array constraints, etc.), skipping hidden fields automatically.
- **Document compatibility validation** — verifies that a form document's `form.id` and `form.version` match the engine's definition before field validation.
- **Form definition editing** — fluent builder API (`FormDefinitionEditor`) for programmatically constructing and modifying form schemas.
- **Form values editing** — fluent editor API (`FormValuesEditor`) for programmatically reading and writing form values against a definition, with array manipulation, validation, and visibility queries.
- **Relative dates** — date boundaries like `"+7d"` or `"-1m"` are resolved at evaluation time against the form's required `submittedAt` timestamp, enabling dynamic yet reproducible date constraints.

## Quick Start

```ts
import { FormEngine } from '@bluprynt/forms-core'

// 1. Compile the form definition
const engine = new FormEngine(formDefinition)

// 2. Create a form document (with optional initial values)
const doc = engine.createFormDocument({ "1": "Alice", "2": 30 })

// 3. Compute visibility
const visibility = engine.getVisibilityMap(doc)

// 4. Validate (checks document compatibility + field rules)
const result = engine.validate(doc)
if (!result.valid) {
  result.documentErrors?.forEach(e => console.log(`Document: ${e.message}`))
  for (const err of result.errors) {
    console.log(`Field ${err.fieldId}: ${err.message}`)
  }
}
```

### Editing Form Values

```ts
import { FormValuesEditor } from '@bluprynt/forms-core'

// 1. Create an editor (optionally pre-populate from an existing document)
const editor = new FormValuesEditor(formDefinition)

// 2. Set field values (fluent chaining)
editor
  .setFieldValue(1, 'Alice')
  .setFieldValue(2, 30)
  .addArrayItem(6, 'TypeScript')
  .addArrayItem(6, 'React')
  .setSubmittedAt('2025-01-01T00:00:00Z')

// 3. Validate and extract the document
const result = editor.validate()
const doc = editor.toJSON()
```

## Documentation

| Document | Description |
|----------|-------------|
| [Architecture](./docs/architecture.md) | Project structure, module dependency graph, key design patterns |
| [API Reference](./docs/api-reference.md) | Complete public API — classes, methods, types, error handling |
| [Validation & Conditions](./docs/validation-and-conditions.md) | How validation rules work per field type, condition operators, visibility resolution |
| [Schema Issue Codes](./docs/schema-issue-codes.md) | All `FormDefinitionError` issue codes, validation stages, error handling |
| [Development Guide](./docs/development-guide.md) | How to build, test, lint, and extend the engine (e.g., adding new field types) |

## Supported Field Types

| Type | Value | Description |
|------|-------|-------------|
| `string` | `string` | Free-text input |
| `number` | `number` | Numeric input |
| `boolean` | `boolean` | True/false toggle |
| `date` | `string` (ISO 8601) | Date picker |
| `select` | `string \| number` | Single selection from predefined options |
| `array` | `T[]` | Ordered list of scalar values |
| `file` | `FileValue` object | File upload metadata (name, mimeType, size, url) |
