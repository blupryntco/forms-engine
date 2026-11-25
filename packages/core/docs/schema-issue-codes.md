# Schema Validation Issue Codes

Form definitions are validated in three stages before the engine can be used. Each stage throws its errors together in a single `DocumentError`. A stage runs only if the previous one passed.

## Stage 0: Limits

`FormDefinitionValidator.validateLimits()` walks the definition with an explicit stack instead of recursion, so a hostile definition cannot overflow the call stack. It checks:
- Sections nest at most 3 levels
- `and` / `or` groups nest at most 16 levels inside one condition
- The definition has at most 5000 nodes, counting content items, `array_obj` sub-fields, select / multiselect `options` entries (on a field, an `array` field's `item` and `array_obj` sub-fields) and condition nodes (both groups and simple conditions)

`FormDefinitionValidator.validateSchema()` runs this stage first, so `FormEngine` and `FormDefinitionEditor.validate()` both apply it. If it finds issues, `validateSchema()` returns them without running the JSON Schema check, and the constructor throws them without `SCHEMA_INVALID` issues alongside.

A `RangeError` thrown anywhere else while compiling the definition is also reported as `DEFINITION_TOO_LARGE`. Other errors propagate unchanged.

## Stage 1: JSON Schema Validation

Validates structural correctness using AJV against `form-definition.schema.json`. AJV stops at the first failing path, so this stage reports the first violation it meets (one or a few `SCHEMA_INVALID` issues), not every violation in the definition. Checks include:
- Required top-level properties (`id`, `version`, `title`, `content`)
- Version format (semver: `X.Y.Z`)
- Content array must be non-empty
- Field IDs must be positive integers
- Type-specific validation rule shapes
- Select fields must have non-empty `options`
- Array fields must have `item` definition; `item` cannot have `id` or `type: "array"`
- Condition structure and operator validity
- `and` / `or` groups hold at most 100 conditions each (`maxItems`)
- Every `options` array (on select / multiselect fields, `array` items and `array_obj` sub-fields), every `array_obj` `items` array and the `value` array of an `in` / `notin` condition hold at most 1000 entries each (`maxItems`)
- Section structure (`title`, non-empty `content`)

## Stage 2: Semantic Validation

Checks logical correctness that JSON Schema alone cannot express.

## Issue Codes

| Code | Stage | Description |
|------|:-----:|-------------|
| `DEFINITION_TOO_LARGE` | 0 | The definition has more than 5000 nodes (select options included). Also produced when compiling the definition throws a `RangeError` |
| `NESTING_DEPTH` | 0, 2 | Section nested deeper than 3 levels, or `and` / `or` groups nested deeper than 16 levels. For a condition, `itemId` is the item that owns it |
| `SCHEMA_INVALID` | 1 | JSON Schema structural violation |
| `DUPLICATE_ID` | 2 | Two or more items share the same ID. `array_obj` sub-field ids share the same id space and are checked with it |
| `UNKNOWN_FIELD_REF` | 2 | Condition references a field ID not in the schema |
| `CONDITION_REFS_SECTION` | 2 | Condition references a section (sections have no values) |
| `CONDITION_REFS_STATIC` | 2 | Condition references a static block (static blocks have no values) |
| `CONDITION_REFS_ARRAY_OBJ_ITEM` | 2 | Condition references an `array_obj` sub-field (its value is per-row, so no single value exists) |
| `INVALID_MIN_MAX` | 2 | A field's minimum constraint exceeds its maximum constraint |
| `INVALID_REGEX` | 2 | String: `pattern` is not a valid regex |
| `CIRCULAR_DEPENDENCY` | 2 | Condition dependencies form a cycle |

## Error Handling

```ts
import { FormEngine, DocumentError } from '@bluprynt/forms-core'

try {
  const engine = new FormEngine(definition)
} catch (err) {
  if (err instanceof DocumentError) {
    for (const error of err.errors) {
      console.log(error.code, error.message, error.itemId)
    }
  }
}
```

### `DocumentError`

- Extends `Error`
- `message` — `"Document validation failed: "` followed by semicolon-separated summary of all errors
- `errors: DocumentValidationError[]` — structured list for programmatic access

### `DocumentValidationError`

```ts
{
  code: DocumentValidationErrorCode  // one of the codes above
  message: string                    // human-readable description
  itemId?: number                    // ID of the content item involved, when applicable
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
| `NOW_INVALID` | `options.now` passed to `validate()` is not a valid date |
| `UNKNOWN_VALUE_KEY` | Strict mode only: a `values` key matches no form item |
| `NON_VALUE_ITEM_VALUE` | Strict mode only: a value is stored under a `section` or `static` id. `itemId` is that id |
| `HIDDEN_FIELD_VALUE` | Strict mode only: a hidden field holds a value. `itemId` is the field id |
| `UNKNOWN_ROW_KEY` | Strict mode only: an `array_obj` row holds a key that is not a declared value sub-field. `itemId` is the `array_obj` field id |

The last four are reported only by `validate(doc, { strict: true })`, next to any field errors. They cover the values `FormEngine.sanitize()` removes; see [Stray Values](./validation-and-conditions.md#stray-values).

Each error may include a `params` object for debuggability. The shape varies by code:

| Code | `params` |
|------|----------|
| `FORM_ID_MISMATCH` | `{ expected, actual }` |
| `FORM_VERSION_MISMATCH` | `{ expected, actual }` |
| `FORM_SUBMITTED_AT_MISSING` | _(none)_ |
| `FORM_SUBMITTED_AT_INVALID` | `{ actual }` |
| `NOW_INVALID` | _(none)_ |
| `UNKNOWN_VALUE_KEY` | `{ key }` |
| `NON_VALUE_ITEM_VALUE` | _(none)_ |
| `HIDDEN_FIELD_VALUE` | _(none)_ |
| `UNKNOWN_ROW_KEY` | `{ itemIndex, key }` — the zero-based row and the undeclared key |

```ts
const result = engine.validate(doc)
if (result.documentErrors?.length) {
  for (const err of result.documentErrors) {
    console.log(err.code, err.params) // e.g. "FORM_ID_MISMATCH" { expected: "my-form", actual: "other-form" }
  }
}
```

See `DocumentValidationError` in the [API Reference](./api-reference.md#validation) for the full type shape.
