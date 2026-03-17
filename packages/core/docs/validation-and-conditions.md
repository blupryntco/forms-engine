# Validation & Conditions

## Document Compatibility Validation

Before field-level checks, `FormEngine.validate()` verifies the document is compatible with the engine's form definition:

1. `doc.form.id` must match the engine's `formId` — otherwise a `FORM_ID_MISMATCH` error is produced.
2. `doc.form.version` must match the engine's `formVersion` — otherwise a `FORM_VERSION_MISMATCH` error is produced.

These errors are collected in `result.documentErrors`. If any are present, `result.valid` is `false`. Field validation still runs regardless, so callers receive the full picture in a single call.

This is a **document-time** check (runs when validating user-submitted data), as opposed to **definition-time** validation (JSON Schema and semantic checks that run in the `FormEngine` constructor). Use `createFormDocument()` to produce documents that are guaranteed compatible.

> `isVisible()` and `getVisibilityMap()` do not perform compatibility checks.

---

## Field Validation

Validation is performed by `FieldValidator` and invoked through `FormEngine.validate()`. Only **visible** fields are validated — hidden fields are skipped entirely. Sections are never validated.

### Validation Flow

```
For each field in registry:
  1. Skip if type === 'section'
  2. Skip if visibilityMap.get(id) === false
  3. Dispatch to type-specific validator
  4. Collect errors
```

### Validation Rules by Field Type

#### String

| Rule | Condition | Error rule name |
|------|-----------|-----------------|
| `required` | Value is `undefined`, `null`, or `""` | `required` |
| `minLength` | `value.length < minLength` | `minLength` |
| `maxLength` | `value.length > maxLength` | `maxLength` |
| `pattern` | Value does not match regex | `pattern` |

If `pattern` fails and `patternMessage` is set, the custom message is used. Otherwise a generic message is generated.

If the field is empty and not required, no further rules are checked.

#### Number

| Rule | Condition | Error rule name |
|------|-----------|-----------------|
| `required` | Value is `undefined` or `null` | `required` |
| type check | Value is not a `number` | `type` |
| `min` | `value < min` | `min` |
| `max` | `value > max` | `max` |

#### Boolean

| Rule | Condition | Error rule name |
|------|-----------|-----------------|
| `required` | Value is not exactly `true` or `false` | `required` |

Both `true` and `false` satisfy the `required` rule. Only `null`/`undefined` fail it.

#### Date

| Rule | Condition | Error rule name |
|------|-----------|-----------------|
| `required` | Value is `undefined`, `null`, or `""` | `required` |
| invalid date | `new Date(value)` produces `NaN` | `invalidDate` |
| `minDate` | Value is earlier than resolved `minDate` | `minDate` |
| `maxDate` | Value is later than resolved `maxDate` | `maxDate` |

Date boundaries support relative expressions (see [Relative Dates](#relative-dates)).

#### Select

| Rule | Condition | Error rule name |
|------|-----------|-----------------|
| `required` | Value is `undefined` or `null` | `required` |
| invalid option | Value does not match any `options[].value` | `invalidOption` |

#### Array

| Rule | Condition | Error rule name |
|------|-----------|-----------------|
| type check | Value is not an array | `type` |
| `minItems` | `value.length < minItems` | `minItems` |
| `maxItems` | `value.length > maxItems` | `maxItems` |
| item validation | Each item validated against `item` definition | varies (per-item rule) |

Item validation errors include `itemIndex` (zero-based) so consumers can pinpoint which array element failed.

#### File

| Rule | Condition | Error rule name |
|------|-----------|-----------------|
| `required` | Value is `undefined` or `null` | `required` |
| type check | Value is not an object with `name`, `mimeType`, `size`, `url` | `type` |

### Error Shape

```ts
{
  fieldId: number     // field that failed
  rule: string        // e.g., "required", "minLength", "min", "pattern"
  message: string     // human-readable description
  params?: Record<string, unknown>  // e.g., { minLength: 5, actual: 3 }
  itemIndex?: number  // zero-based index for array items
}
```

---

## Conditions

Conditions control the visibility of fields and sections. Each content item can have an optional `condition` property.

### Simple Conditions

A simple condition evaluates a single field:

```json
{ "field": 5, "op": "eq", "value": "contract" }
```

### Operators

| Operator | Description | Requires `value` |
|----------|-------------|:-:|
| `set` | Field has a value (not `null`, `undefined`, or `""`) | No |
| `notset` | Field has no value | No |
| `eq` | Strict equality | Yes |
| `ne` | Not equal | Yes |
| `lt` | Less than | Yes |
| `gt` | Greater than | Yes |
| `lte` | Less than or equal | Yes |
| `gte` | Greater than or equal | Yes |
| `in` | Value is in array | Yes (array) |
| `notin` | Value is not in array | Yes (array) |

**Comparison behavior:**
- Numbers are compared as numbers.
- Strings are first attempted as date parsing (ISO 8601). If both parse successfully, they are compared as timestamps. Otherwise, lexicographic comparison is used.
- No implicit type coercion between types.

### Compound Conditions

Combine conditions with `and` / `or`. Supports arbitrary nesting.

```json
{
  "and": [
    { "field": 5, "op": "eq", "value": "contract" },
    { "or": [
      { "field": 9, "op": "eq", "value": "admin" },
      { "field": 9, "op": "eq", "value": "manager" }
    ]}
  ]
}
```

- `and`: All child conditions must be `true`.
- `or`: At least one child condition must be `true`.

### Visibility Resolution

There are two visibility APIs with different semantics:

#### `isVisible(id, doc)` — Single-Item Check

1. If the item has no condition, it is visible.
2. Evaluates the item's condition against raw form values.
3. Walks up the parent chain — if any ancestor is hidden, the item is hidden.
4. **Does not** apply the hidden-field rule.

#### `getVisibilityMap(doc)` — Bulk Evaluation (Authoritative)

1. Iterates all items in **topological order** (dependencies first).
2. If a parent is already hidden → mark item hidden (skip condition evaluation).
3. Evaluates the item's condition with the **hidden-field rule**: if a referenced field is already determined hidden, its value is treated as "not set."
4. Returns `Map<number, boolean>` for all items.

**When to use which:**
- Use `getVisibilityMap()` when rendering the entire form or when accuracy of cascading logic matters.
- Use `isVisible()` for quick single-field checks where the hidden-field rule is not critical.

### Hidden-Field Rule in Detail

When `getVisibilityMap()` evaluates a condition and the referenced field is hidden:

| Operator | Result |
|----------|--------|
| `set` | `false` |
| `notset` | `true` |
| `eq`, `ne`, `lt`, `gt`, `lte`, `gte` | `false` |
| `in` | `false` |
| `notin` | `false` |

This prevents hidden fields' stale values from "leaking" into other fields' visibility decisions.

### Cascading Parent Visibility

If a section is hidden, all its descendants (fields and nested sections) are immediately hidden without evaluating their individual conditions. This is enforced by parent → child edges in the dependency graph.

---

## Relative Dates

Date validation boundaries (`minDate`, `maxDate`) and condition values support relative date expressions.

### Format

```
[+|-][amount][unit]
```

| Unit | Meaning | Example |
|------|---------|---------|
| `d` | days | `"+7d"` — 7 days from now |
| `w` | weeks | `"-2w"` — 2 weeks ago |
| `m` | months | `"+1m"` — 1 month from now |
| `y` | years | `"-1y"` — 1 year ago |

Pattern: `^[+-]\d+[dwmy]$`

### Resolution

Relative dates are resolved to absolute ISO 8601 strings **at evaluation time**. The reference timestamp is always `doc.form.submittedAt` — it is the sole source of truth and cannot be overridden.

They are **not cached** — every call to `validate()` or `getVisibilityMap()` resolves them fresh. Missing `submittedAt` produces a `FORM_SUBMITTED_AT_MISSING` document error; malformed values produce a `FORM_SUBMITTED_AT_INVALID` document error.

```ts
// "+7d" resolved from 2025-06-15 → "2025-06-22T00:00:00.000Z"
// "-1m" resolved from 2025-03-15 → "2025-02-15T00:00:00.000Z"
```

### Edge Cases

- Week unit (`w`) multiplies by 7 days.
- Month addition uses `setUTCMonth()` — may roll forward on month overflow (e.g., Jan 31 + 1m → Mar 3 in non-leap year).
- If the input does not match the relative pattern, it is returned unchanged (treated as absolute).

---

## Schema Validation

Form definitions are validated in two stages (JSON Schema structural checks, then semantic checks) before the engine can be used. All errors are collected and thrown as a single `DocumentError`.

See [Schema Issue Codes](./schema-issue-codes.md) for the full list of issue codes, validation stages, and error handling examples.
