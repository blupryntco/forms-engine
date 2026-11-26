# Validation & Conditions

## Document Compatibility Validation

Before field-level checks, `FormEngine.validate()` verifies the document is compatible with the engine's form definition:

1. `doc.form.id` must match the engine's `formId` — otherwise a `FORM_ID_MISMATCH` error is produced.
2. `doc.form.version` must match the engine's `formVersion` — otherwise a `FORM_VERSION_MISMATCH` error is produced.
3. `doc.form.submittedAt` must be present — otherwise a `FORM_SUBMITTED_AT_MISSING` error is produced.
4. `doc.form.submittedAt` must be a valid date — otherwise a `FORM_SUBMITTED_AT_INVALID` error is produced.
5. `options.now`, when passed, must be a valid date — otherwise a `NOW_INVALID` error is produced.

Checks 3 and 4 run even when `options.now` is passed.

These errors are collected in `result.documentErrors`. If any are present, `result.valid` is `false` and field validation is skipped entirely — `result.fieldErrors` will be an empty map.

This is a **document-time** check (runs when validating user-submitted data), as opposed to **definition-time** validation (JSON Schema and semantic checks that run in the `FormEngine` constructor). Use `createFormDocument()` to produce documents that are guaranteed compatible.

> `isVisible()` and `getVisibilityMap()` do not perform compatibility checks.

---

## Stray Values

Field validation only reads values that belong to visible fields. Anything else in `doc.values` passes by default, so a client can attach data the form never asked for and a consumer that stores the document keeps it. These stray values are:

| Stray value | Strict-mode error |
|-------------|-------------------|
| A key that matches no form item (including `"01"` and top-level keys equal to an `array_obj` sub-field id) | `UNKNOWN_VALUE_KEY` |
| A value stored under a `section` or `static` id | `NON_VALUE_ITEM_VALUE` |
| A value of a hidden field | `HIDDEN_FIELD_VALUE` |
| A key in an `array_obj` row that is not a declared value sub-field | `UNKNOWN_ROW_KEY` |

`FormEngine.sanitize(doc, options?)` returns a copy of the document with all of them removed, and cleans `suggestions` by the same rules. `FormValuesEditor.sanitize(options?)` does the same to the editor's document. Values of the wrong type are kept for `validate()` to report.

`validate(doc, { strict: true })` reports each stray value in `values` as a document error and sets `valid` to `false`; field errors are still returned. It finds exactly what `sanitize` removes from `values`. Suggestions are not checked.

On the server, persist the sanitized document:

```ts
const now = new Date()
const clean = engine.sanitize(doc, { now })
const result = engine.validate(clean, { now })
```

Hidden values are removed permanently, so call `sanitize` on save or submit, not on every edit. The UI keeps a field's value when the field becomes hidden, so strict validation rejects a document taken straight from the UI unless it was sanitized first.

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
| `required` | Value is `undefined`, `null`, or `""` | `REQUIRED` |
| type check | Value is not a `string` | `TYPE` |
| `minLength` | `value.length < minLength` | `MIN_LENGTH` |
| `maxLength` | `value.length > maxLength` | `MAX_LENGTH` |
| `pattern` | Value does not match regex | `PATTERN` |

If `pattern` fails and `patternMessage` is set, the custom message is used. Otherwise a generic message is generated.

The same rules apply to `array` items and `array_obj` cells of type `string`. Two rules keep `pattern` from running on long input:

- If `MAX_LENGTH` fails, it is the only error returned and the pattern is not run. `MIN_LENGTH` and `PATTERN` can still be reported together.
- If `pattern` is set without `maxLength`, a value longer than 10000 characters fails `PATTERN` without running the regex, even if it would match. Set `maxLength` to accept longer values.

A definition is rejected if a `pattern` is longer than 1000 characters (`SCHEMA_INVALID`), is not a valid regex (`INVALID_REGEX`) or nests a repeating quantifier inside a repeated group, such as `^(a+)+$` (`UNSAFE_REGEX`). See [Schema Validation Issue Codes](./schema-issue-codes.md). When `FieldValidator` is called directly, bypassing `FormEngine` and these checks, it does not run such a pattern; the value gets a `PATTERN` error instead.

If the field is empty and not required, no further rules are checked.

#### Number

| Rule | Condition | Error rule name |
|------|-----------|-----------------|
| `required` | Value is `undefined` or `null` | `REQUIRED` |
| type check | Value is not a `number` | `TYPE` |
| `min` | `value < min` | `MIN` |
| `max` | `value > max` | `MAX` |

#### Boolean

| Rule | Condition | Error rule name |
|------|-----------|-----------------|
| `required` | Value is not exactly `true` or `false` | `REQUIRED` |

Both `true` and `false` satisfy the `required` rule. Only `null`/`undefined` fail it.

#### Date

| Rule | Condition | Error rule name |
|------|-----------|-----------------|
| `required` | Value is `undefined`, `null`, or `""` | `REQUIRED` |
| type check | Value is not a `string` | `TYPE` |
| invalid date | `new Date(value)` produces `NaN` | `INVALID_DATE` |
| `minDate` | Value is earlier than resolved `minDate` | `MIN_DATE` |
| `maxDate` | Value is later than resolved `maxDate` | `MAX_DATE` |

Date boundaries support relative expressions (see [Relative Dates](#relative-dates)).

#### Select

| Rule | Condition | Error rule name |
|------|-----------|-----------------|
| `required` | Value is `undefined` or `null` | `REQUIRED` |
| invalid option | Value does not match any `options[].value` | `INVALID_OPTION` |

#### Multiselect

| Rule | Condition | Error rule name |
|------|-----------|-----------------|
| `required` | Value is `undefined`, `null` or an empty array | `REQUIRED` |
| type check | Value is present but not an array | `TYPE` (`params.expectedType: 'multiselect'`) |
| invalid option | Any selected value matches no `options[].value` | `INVALID_OPTION` (one field-level error, never per-entry) |

#### Static

Static blocks hold no value and have no validation rules. No validator is registered for them, so they
never appear in `fieldErrors`.

#### Array

| Rule | Condition | Error rule name |
|------|-----------|-----------------|
| type check | Value is not an array | `TYPE` |
| `minItems` | `value.length < minItems` | `MIN_ITEMS` |
| `maxItems` | `value.length > maxItems` | `MAX_ITEMS` |
| item validation | Each item validated against `item` definition | varies (per-item rule) |

Item validation errors include `itemIndex` (zero-based) so consumers can pinpoint which array element failed.
A `static` item is skipped — it holds no value.

#### Array of rows (`array_obj`)

| Rule | Condition | Error rule name |
|------|-----------|-----------------|
| type check | Value is not an array | `TYPE` |
| `minItems` | `value.length < minItems` | `MIN_ITEMS` |
| `maxItems` | `value.length > maxItems` | `MAX_ITEMS` |
| row shape | A row is present but is not an object | `TYPE` with `itemIndex` |
| sub-field validation | Each sub-field in `items` validated in every row | varies (per-sub-field rule) |

A sub-field error carries **both** `itemIndex` (the row) and `itemFieldId` (the sub-field), while its
`fieldId` stays the `array_obj` field's own id — which is also the key the error is stored under in
`fieldErrors`. Its `message` is prefixed with the sub-field's label, since every error for the field is
listed under one id. An absent row (`null` / `undefined`) is read as an empty one, so its `required`
sub-fields still report; a `static` sub-field is never validated.

#### File

| Rule | Condition | Error rule name |
|------|-----------|-----------------|
| `required` | Value is `undefined` or `null` | `REQUIRED` |
| type check | Value is not an object with `name`, `mimeType`, `size`, `url` | `TYPE` |

#### Blockchain

| Rule | Condition | Error rule name |
|------|-----------|-----------------|
| `required` | Value is `undefined`, `null` or `''` | `REQUIRED` |
| type check | Value is present but not a string | `TYPE` (`params.expectedType: 'blockchain'`) |

There is no format rule. A CAIP address is an opaque string to the engine, so a malformed address never
produces an error here — validate it at your own ingestion boundary if you need to.

#### Sustainability

| Rule | Condition | Error rule name |
|------|-----------|-----------------|
| `required` | Value is `undefined`/`null`, or its `address` is missing or `''` | `REQUIRED` |
| type check | Value is not an object, or `address`/`ccri`/`cmc` is present but not a string | `TYPE` (`params.expectedType: 'sustainability'`) |

`required` reads `address` alone — `ccri` and `cmc` are optional and never trigger it. A missing `address`
key is treated as an empty address rather than a type error. There is no per-property error channel, so a
sustainability field produces at most one field-level error.

### Error Shape

```ts
{
  fieldId: number     // field that failed
  rule: FieldValidationRule  // e.g., "REQUIRED", "MIN_LENGTH", "MIN", "PATTERN"
  message: string     // human-readable description
  params?: Record<string, unknown>  // e.g., { minLength: 5, actual: 3 }
  itemIndex?: number  // zero-based index for array items / array_obj rows
  itemFieldId?: number // array_obj only: the sub-field within that row
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

**Multiselect fields** are compared as sets rather than scalars — see the table below. Every other type,
including `array` and `array_obj`, keeps the scalar behaviour described here.

An `array_obj` **sub-field** id may not be referenced by a condition at all: its value is per-row, so a
form-level condition cannot say which row it means. The engine rejects such a definition with
`CONDITION_REFS_ARRAY_OBJ_ITEM`.

**Object-valued fields** (`file`, `sustainability`) take the scalar path too, which makes only `set` and
`notset` useful: any object present counts as set — including a half-filled
`{ address: '', ccri: '', cmc: '' }` — while `eq`/`ne`/`in`/`notin` compare by reference and never match.
A `blockchain` field is an ordinary string and keeps full scalar semantics.

| Operator | Meaning against a `multiselect` |
|----------|--------------------------------|
| `set` / `notset` | At least one option chosen / nothing chosen. An empty array is **not** set. |
| `eq` / `ne` | Set equality against `value`, ignoring order and duplicates. A scalar `value` is read as a one-element set. |
| `in` / `notin` | Any chosen option appears in `value` / none does. Use `in` for "is `x` selected?". |
| `lt` `gt` `lte` `gte` | Always `false`. |

A condition may not reference a `section` (`CONDITION_REFS_SECTION`) or a `static` block
(`CONDITION_REFS_STATIC`); neither holds a value.

**Comparison behavior:**
- Numbers are compared as numbers.
- Strings are first attempted as date parsing (ISO 8601). If both parse successfully, they are compared as timestamps. Otherwise, lexicographic comparison is used.
- No implicit type coercion between types.

### Compound Conditions

Combine conditions with `and` / `or`. Groups nest up to 16 levels deep and hold up to 100 conditions each.

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

Relative dates are resolved to absolute ISO 8601 strings **at evaluation time**. The reference timestamp is `options.now` when the caller passes it to `validate()`, `isVisible()` or `getVisibilityMap()`, and `doc.form.submittedAt` otherwise. The client controls `submittedAt`, so server-side validation must pass a trusted `now`, e.g. `engine.validate(doc, { now: new Date() })`.

They are **not cached** — every call to `validate()` or `getVisibilityMap()` resolves them fresh. Missing `submittedAt` produces a `FORM_SUBMITTED_AT_MISSING` document error; malformed values produce a `FORM_SUBMITTED_AT_INVALID` document error. Both are reported even when `now` is passed. An invalid `now` produces a `NOW_INVALID` document error in `validate()` and a `RangeError` in `isVisible()` and `getVisibilityMap()`.

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
