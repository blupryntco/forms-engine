# Schema Validation Issue Codes

Form definitions are validated in two stages before the engine can be used. All issues are collected and thrown together in a single `FormDefinitionError`.

## Stage 1: JSON Schema Validation

Validates structural correctness using AJV against `form-definition.schema.json`. Checks include:
- Required top-level properties (`id`, `version`, `title`, `content`)
- Version format (semver: `X.Y.Z`)
- Content array must be non-empty
- Field IDs must be positive integers
- Type-specific validation rule shapes
- Select fields must have non-empty `options`
- Array fields must have `item` definition; `item` cannot have `id` or `type: "array"`
- Condition structure and operator validity
- Section structure (`title`, non-empty `content`)

## Stage 2: Semantic Validation

Checks logical correctness that JSON Schema alone cannot express.

## Issue Codes

| Code | Stage | Description |
|------|:-----:|-------------|
| `SCHEMA_INVALID` | 1 | JSON Schema structural violation |
| `DUPLICATE_ID` | 2 | Two or more items share the same ID |
| `NESTING_DEPTH` | 2 | Section nested deeper than 3 levels |
| `UNKNOWN_FIELD_REF` | 2 | Condition references a field ID not in the schema |
| `CONDITION_REFS_SECTION` | 2 | Condition references a section (sections have no values) |
| `INVALID_RANGE_MIN_MAX_LENGTH` | 2 | String: `minLength > maxLength` |
| `INVALID_RANGE_MIN_MAX` | 2 | Number: `min > max` |
| `INVALID_RANGE_DATE` | 2 | Date: absolute `minDate > maxDate` |
| `INVALID_RANGE_ITEMS` | 2 | Array: `minItems > maxItems` |
| `INVALID_REGEX` | 2 | String: `pattern` is not a valid regex |
| `CIRCULAR_DEPENDENCY` | 2 | Condition dependencies form a cycle |

## Error Handling

```ts
import { FormEngine, FormDefinitionError } from '@bluprynt/forms-core'

try {
  const engine = new FormEngine(definition)
} catch (err) {
  if (err instanceof FormDefinitionError) {
    for (const issue of err.issues) {
      console.log(issue.code, issue.message, issue.itemId)
    }
  }
}
```

### `FormDefinitionError`

- Extends `Error`
- `message` — semicolon-separated summary of all issues
- `issues: FormDefinitionIssue[]` — structured list for programmatic access

### `FormDefinitionIssue`

```ts
{
  code: FormDefinitionIssueCode  // one of the codes above
  message: string                // human-readable description
  itemId?: number                // ID of the content item involved, when applicable
}
```

---

## Document Validation Errors

Separate from schema definition issues, `FormEngine.validate()` can produce **document-level** errors when the submitted `FormDocument` is incompatible with the engine's form definition. These appear in `result.documentErrors`.

| Code | Description |
|------|-------------|
| `FORM_ID_MISMATCH` | `doc.form.id` does not match the engine's form ID |
| `FORM_VERSION_MISMATCH` | `doc.form.version` does not match the engine's form version |
| `FORM_SUBMITTED_AT_MISSING` | `doc.form.submittedAt` is missing |
| `FORM_SUBMITTED_AT_INVALID` | `doc.form.submittedAt` is not a valid ISO 8601 string |

Each error includes `params: { expected, actual }` for debuggability.

```ts
const result = engine.validate(doc)
if (result.documentErrors?.length) {
  for (const err of result.documentErrors) {
    console.log(err.code, err.params) // e.g. "FORM_ID_MISMATCH" { expected: "my-form", actual: "other-form" }
  }
}
```

See `DocumentValidationError` in the [API Reference](./api-reference.md#validation) for the full type shape.
