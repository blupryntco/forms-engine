# Forms Engine — Custom Schema Specification

## 1. Top-Level Structure

```json
{
  "id": "string",
  "version": "1.0.0",
  "title": "string",
  "description": "string (optional)",
  "content": [ /* ContentItem[] */ ]
}
```

- `id` — unique schema identifier.
- `version` — schema version (semver, e.g. `"1.0.0"`, `"1.2.4"`).
- `title` — human-readable form title.
- `description` — optional form-level description.
- `content` — ordered list of content items (fields and sections). At least one item required.

---

## 2. Content Items

Every item in `content` has a `type`. Types are: `"string"`, `"number"`, `"boolean"`, `"date"`, `"select"`, `"multiselect"`, `"array"`, `"file"`, `"static"`, `"section"`.

Most types are **fields** — they produce values. Two are different:

- `"section"` is a **grouping container** — it holds nested content items and has no value of its own.
- `"static"` is a **display-only block** — it renders text inside the form but produces no value. It never appears in `values`, carries no `validation`, and cannot be referenced by another item's `condition`.

### 2.1 Common Properties (all types)

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `id` | `number` | yes | Unique numeric identifier across the entire schema. Must be a positive integer. |
| `type` | `string` | yes | One of: `"string"`, `"number"`, `"boolean"`, `"date"`, `"select"`, `"multiselect"`, `"array"`, `"file"`, `"static"`, `"blockchain"`, `"sustainability"`, `"section"`. |
| `condition` | `Condition` | no | Visibility condition. When present, the item is only visible (and validated) when the condition evaluates to `true`. See §5. |

### 2.2 Common Field Properties (all types except `"section"` and `"static"`)

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `label` | `string` | yes | Human-readable field label. |
| `description` | `string` | no | Help text or hint for the field. |
| `placeholder` | `string` | no | Placeholder shown inside the empty input control. |
| `answer_guidelines` | `string` | no | Guidance on how the field should be answered. Free text, not enforced. |
| `reference_id` | `string` | no | External reference, e.g. the regulation or questionnaire item this field came from. Opaque to the engine. |
| `validation` | `object` | no | Type-specific validation rules. Shape depends on `type`. See §3. |

`placeholder`, `answer_guidelines` and `reference_id` are presentation/authoring metadata: the engine never
reads them, they do not participate in validation or conditions, and they are all optional, so definitions
written before they existed remain valid.

### 2.2.1 Static Block Properties (`type: "static"`)

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `text` | `string` | yes | The text displayed inside the form. This is the block's content. |
| `label` | `string` | no | Optional heading rendered above `text`. Unlike every other field type, `label` is **not** required. |
| `description` | `string` | no | Optional secondary text. |
| `placeholder` | `string` | no | Presentation metadata. Opaque to the engine. |
| `answer_guidelines` | `string` | no | Presentation metadata. Opaque to the engine. |
| `reference_id` | `string` | no | External reference, e.g. the regulation this notice comes from. |

A static block accepts no `validation` and no `options`. It does accept a `condition`, so a notice can be
shown only when it applies. It produces no key in `values` and no validation errors.

### 2.3 Section Properties (`type: "section"`)

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `title` | `string` | yes | Human-readable section title. |
| `description` | `string` | no | Section description or instructions. |
| `placeholder` | `string` | no | Placeholder shown inside the empty input control. |
| `answer_guidelines` | `string` | no | Guidance on how the field should be answered. Free text, not enforced. |
| `reference_id` | `string` | no | External reference, e.g. the regulation or questionnaire item this field came from. Opaque to the engine. |
| `content` | `ContentItem[]` | yes | Nested content items (fields and/or sections). At least one item required. |

When a section's condition evaluates to `false`, all items within (including nested sections' fields) are hidden and excluded from validation.

---

## 3. Validation

The `validation` property contains all validation rules for a field. Its shape depends on the field's `type`.

### 3.1 String Validation

```json
{
  "id": 1,
  "type": "string",
  "label": "Full Name",
  "validation": {
    "required": true,
    "minLength": 2,
    "maxLength": 100,
    "pattern": "^[A-Za-z ]+$",
    "patternMessage": "Only letters and spaces allowed"
  }
}
```

| Property | Type | Description |
|----------|------|-------------|
| `required` | `boolean` | Field must have a non-empty value. Default: `false`. |
| `minLength` | `integer >= 0` | Minimum character count. |
| `maxLength` | `integer >= 1` | Maximum character count. Must be >= `minLength` if both set. |
| `pattern` | `string` | Regular expression (without delimiters). Value must match fully. |
| `patternMessage` | `string` | Custom error message when `pattern` fails. Falls back to a generic message. |

**Value type:** `string`

### 3.2 Number Validation

```json
{
  "id": 2,
  "type": "number",
  "label": "Age",
  "validation": {
    "required": true,
    "min": 0,
    "max": 150
  }
}
```

| Property | Type | Description |
|----------|------|-------------|
| `required` | `boolean` | Field must have a value. Default: `false`. |
| `min` | `number` | Minimum value (inclusive). |
| `max` | `number` | Maximum value (inclusive). Must be >= `min` if both set. |

**Value type:** `number`

### 3.3 Boolean Validation

```json
{
  "id": 3,
  "type": "boolean",
  "label": "I agree to the terms",
  "validation": {
    "required": true
  }
}
```

| Property | Type | Description |
|----------|------|-------------|
| `required` | `boolean` | Field must be explicitly `true` or `false` (not `null`/`undefined`). Default: `false`. |

**Value type:** `boolean`

### 3.4 Date Validation

```json
{
  "id": 4,
  "type": "date",
  "label": "Start Date",
  "validation": {
    "required": true,
    "minDate": "2024-01-01T00:00:00.000Z",
    "maxDate": "2030-12-31T23:59:59.999Z"
  }
}
```

With relative dates:

```json
{
  "id": 4,
  "type": "date",
  "label": "Start Date",
  "validation": {
    "required": true,
    "minDate": "-5d",
    "maxDate": "+1y"
  }
}
```

| Property | Type | Description |
|----------|------|-------------|
| `required` | `boolean` | Field must have a value. Default: `false`. |
| `minDate` | `string` | Earliest allowed date (inclusive). Absolute ISO 8601 or relative. See §3.7. |
| `maxDate` | `string` | Latest allowed date (inclusive). Absolute ISO 8601 or relative. See §3.7. Must be >= `minDate` if both are absolute. |

**Value type:** `string` in ISO 8601 format (`YYYY-MM-DDTHH:mm:ss.sssZ`).

### 3.7 Date Formats

Date values and date validation boundaries support two formats:

**Absolute:** ISO 8601 datetime string — `"2024-01-01T00:00:00.000Z"`.

**Relative:** A shorthand offset from the current date/time at the moment of evaluation. Format: `[+|-][amount][unit]`.

| Unit | Meaning | Example | Description |
|------|---------|---------|-------------|
| `d` | days | `"-5d"` | 5 days ago |
| `w` | weeks | `"+1w"` | 1 week from now |
| `m` | months | `"-2m"` | 2 months ago |
| `y` | years | `"+3y"` | 3 years from now |

Relative dates must match the pattern `^[+-]\d+[dwmy]$`.

Relative dates are resolved to absolute ISO 8601 values at evaluation time (validation, condition evaluation). The reference timestamp is always `form.submittedAt` from the form document. The resolution happens on every evaluation — they are not cached.

### 3.8 File Validation

```json
{
  "id": 18,
  "type": "file",
  "label": "Resume",
  "validation": {
    "required": true
  }
}
```

| Property | Type | Description |
|----------|------|-------------|
| `required` | `boolean` | A file must be uploaded. Default: `false`. |

**Value type:** `object` with properties:

| Property | Type | Description |
|----------|------|-------------|
| `name` | `string` | Original file name. |
| `mimeType` | `string` | MIME type of the file. |
| `size` | `number` | File size in bytes. |
| `url` | `string` | URL where the file can be accessed. |

The engine does not handle actual file upload — the consumer handles upload and produces the file value object.

### 3.8.1 Blockchain Validation

```json
{
  "id": 19,
  "type": "blockchain",
  "label": "CAIP-19 asset identifier",
  "placeholder": "eip155:1/erc20:0x…",
  "validation": {
    "required": true
  }
}
```

| Property | Type | Description |
|----------|------|-------------|
| `required` | `boolean` | An address must be provided. Default: `false`. |

**Value type:** `string` — a CAIP address, stored verbatim.

The address format is **deliberately not validated**. There is no `pattern` rule and no CAIP-specific
error code: a `blockchain` field is an opaque string to the engine, so a malformed address is caught by
the consumer, not here. An empty string counts as absent, exactly as for `string`.

### 3.8.2 Sustainability Validation

```json
{
  "id": 20,
  "type": "sustainability",
  "label": "Sustainability references",
  "validation": {
    "required": true
  }
}
```

| Property | Type | Description |
|----------|------|-------------|
| `required` | `boolean` | The value's `address` must be a non-empty string. Default: `false`. |

**Value type:** `object` with properties:

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `address` | `string` | yes | CAIP address of the asset the data describes. Opaque to the engine, like a `blockchain` value. |
| `ccri` | `string` | no | CCRI (Crypto Carbon Ratings Institute) reference. |
| `cmc` | `string` | no | CoinMarketCap reference. |

`required` is satisfied by `address` alone: `{ "address": "eip155:1/erc20:0x…", "ccri": "", "cmc": "" }`
passes, while `{ "address": "", "ccri": "CCRI-1", "cmc": "" }` fails with `REQUIRED`. A missing `address`
key reads as an empty address rather than a type error, the same tolerance that makes `ccri` and `cmc`
optional. A value that is not an object, or whose properties are not strings, produces `TYPE`. There is no
per-property error channel — a sustainability field produces at most one field-level error.

### 3.5 Select Validation

```json
{
  "id": 5,
  "type": "select",
  "label": "Employment Type",
  "options": [
    { "value": "full-time", "label": "Full-time" },
    { "value": "part-time", "label": "Part-time" },
    { "value": "contract", "label": "Contract" }
  ],
  "validation": {
    "required": true
  }
}
```

| Property | Type | Description |
|----------|------|-------------|
| `required` | `boolean` | A selection must be made. Default: `false`. |

The `options` property is defined on the field itself (not inside `validation`). See §4.

**Value type:** matches the `value` type of the selected option.

### 3.5.1 Multiselect Validation

```json
{
  "id": 20,
  "type": "multiselect",
  "label": "Compliance programmes in place",
  "options": [
    { "value": "aml", "label": "Anti-Money Laundering" },
    { "value": "kyc", "label": "Know Your Customer" },
    { "value": "sanctions", "label": "Sanctions screening" }
  ],
  "validation": {
    "required": true
  }
}
```

| Property | Type | Description |
|----------|------|-------------|
| `required` | `boolean` | At least one option must be selected. An absent value **and an empty array** both fail. Default: `false`. |

`options` is defined on the field itself and is required, exactly as for `select` (§4.1). Every selected
value must appear in `options`; a value that does not produces a single field-level `INVALID_OPTION` error
for the field, not one error per offending entry.

**Value type:** `Array<string | number>` — the `value`s of the selected options. Order is not significant.

### 3.5.2 Static

A `static` block has no `validation` property; supplying one is a schema error. It never produces
validation errors.

### 3.6 Array Validation

```json
{
  "id": 6,
  "type": "array",
  "label": "Skills",
  "item": {
    "type": "string",
    "label": "Skill",
    "validation": {
      "minLength": 1,
      "maxLength": 50
    }
  },
  "validation": {
    "minItems": 1,
    "maxItems": 10
  }
}
```

| Property | Type | Description |
|----------|------|-------------|
| `minItems` | `integer >= 0` | Minimum number of items. |
| `maxItems` | `integer >= 1` | Maximum number of items. Must be >= `minItems` if both set. |

Array-level `validation` covers the array itself. Item-level validation lives inside the `item` definition (see §4.2).

**Value type:** `Array<T>` where T corresponds to `item.type`.

---

## 4. Type-Specific Configuration

Some field types have configuration properties beyond `validation`.

### 4.1 Select and Multiselect — `options`

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `options` | `SelectOption[]` | yes | List of selectable options. At least 1 required. Required for both `select` and `multiselect`. |

**SelectOption:**

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `value` | `string \| number` | yes | Stored value when selected. Must be unique within the options list. |
| `label` | `string` | yes | Human-readable display text. |

### 4.2 Array — `item`

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `item` | `object` | yes | Field definition for each array item. Same shape as any field (§2.2), excluding `id`. The types `"array"` (no nested arrays), `"multiselect"` (its value is already an array) and `"static"` (holds no value) are not allowed. |

The `item` object supports all field properties (`type`, `label`, `description`, `placeholder`, `answer_guidelines`, `reference_id`, `validation`, `options` for select) except `id` and `condition`. Its `type` must be one of `"string"`, `"number"`, `"boolean"`, `"date"`, `"select"`, `"file"`, `"blockchain"` or `"sustainability"`.

**Array of numbers with item validation:**

```json
{
  "id": 7,
  "type": "array",
  "label": "Test Scores",
  "item": {
    "type": "number",
    "label": "Score",
    "validation": {
      "min": 0,
      "max": 100
    }
  },
  "validation": {
    "minItems": 1,
    "maxItems": 5
  }
}
```

**Array of select:**

```json
{
  "id": 8,
  "type": "array",
  "label": "Preferred Days",
  "item": {
    "type": "select",
    "label": "Day",
    "options": [
      { "value": "mon", "label": "Monday" },
      { "value": "tue", "label": "Tuesday" },
      { "value": "wed", "label": "Wednesday" },
      { "value": "thu", "label": "Thursday" },
      { "value": "fri", "label": "Friday" }
    ]
  },
  "validation": {
    "minItems": 1,
    "maxItems": 3
  }
}
```

**Array of files:**

```json
{
  "id": 9,
  "type": "array",
  "label": "Attachments",
  "item": {
    "type": "file",
    "label": "Attachment"
  },
  "validation": {
    "minItems": 1,
    "maxItems": 5
  }
}
```

---

## 5. Conditions

Conditions control visibility of fields and sections.

### 5.1 Simple Condition

A leaf condition that evaluates a single field:

```json
{ "field": 5, "op": "eq", "value": "contract" }
```

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `field` | `number` | yes | ID of the field to evaluate. |
| `op` | `string` | yes | Comparison operator. See §5.2. |
| `value` | `any` | depends | Comparison value. Required for all operators except `set` and `notset`. |

### 5.2 Operators

| Operator | Description | Value required | Applicable types |
|----------|-------------|----------------|-----------------|
| `set` | Field has a value (not `null`, `undefined`, or `""`) | no | all |
| `notset` | Field has no value (`null`, `undefined`, or `""`) | no | all |
| `eq` | Field value equals `value` | yes | all |
| `ne` | Field value does not equal `value` | yes | all |
| `lt` | Field value is less than `value` | yes | number, date |
| `gt` | Field value is greater than `value` | yes | number, date |
| `lte` | Field value is less than or equal to `value` | yes | number, date |
| `gte` | Field value is greater than or equal to `value` | yes | number, date |
| `in` | Field value is contained in `value` (array) | yes (array) | string, number, date, select, multiselect, blockchain |
| `notin` | Field value is not contained in `value` (array) | yes (array) | string, number, date, select, multiselect, blockchain |

Conditions may only reference items that hold a value. Referencing a `section` produces a
`CONDITION_REFS_SECTION` error and referencing a `static` block a `CONDITION_REFS_STATIC` error (§8).
A `blockchain` and a `sustainability` field both hold a value, so both are legal condition targets.

**Object-valued fields** (`file`, `sustainability`) use the scalar rules, which means only `set` and
`notset` say anything useful: any object present counts as set — including a half-filled
`{ "address": "", "ccri": "", "cmc": "" }` — and `eq`/`ne`/`in`/`notin` compare by reference, so they
never match. A `blockchain` field is an ordinary string and keeps full scalar semantics.

**Type coercion:** No implicit coercion. The `value` in the condition must match the referenced field's value type. Date comparisons parse ISO 8601 strings to timestamps before comparing. Condition `value` for date fields can use absolute ISO 8601 or relative date formats (see §3.7).

### 5.2.1 Multiselect Operators

A `multiselect` field's value is a set, so the operators are interpreted as set operations rather than
scalar comparisons. No other type is affected — in particular an `array` field keeps the original scalar
behaviour.

| Operator | Meaning against a multiselect |
|----------|-------------------------------|
| `set` | At least one option is chosen. An empty array counts as **not** set. |
| `notset` | Nothing is chosen (absent value or empty array). |
| `eq` | The selection equals `value` as a set — same members, ignoring order and duplicates. A scalar `value` is read as a one-element set, so `{ "op": "eq", "value": "aml" }` means "`aml` is the *only* option chosen". |
| `ne` | Negation of `eq`. |
| `in` | **Any** chosen option appears in `value`. This is the operator for "is `x` selected?": `{ "op": "in", "value": ["x"] }`. |
| `notin` | No chosen option appears in `value`. |
| `lt` `gt` `lte` `gte` | Always `false` — ordering has no meaning for a set. |

```json
{ "field": 33, "op": "in", "value": ["travel-rule"] }
```

shows the dependent item whenever *Travel Rule* is among the chosen programmes.

### 5.3 Compound Conditions

Combine conditions with `and` / `or`. Supports arbitrary nesting.

```json
{
  "and": [
    { "field": 5, "op": "eq", "value": "contract" },
    { "field": 6, "op": "set" }
  ]
}
```

```json
{
  "or": [
    { "field": 9, "op": "eq", "value": "admin" },
    { "field": 9, "op": "eq", "value": "manager" }
  ]
}
```

**Nested:**

```json
{
  "and": [
    { "field": 10, "op": "eq", "value": "US" },
    {
      "or": [
        { "field": 11, "op": "eq", "value": "CA" },
        { "field": 11, "op": "eq", "value": "NY" }
      ]
    }
  ]
}
```

| Property | Type | Description |
|----------|------|-------------|
| `and` | `Condition[]` | All conditions must be `true`. |
| `or` | `Condition[]` | At least one condition must be `true`. |

A condition is either a **simple condition** (has `field` + `op`) or a **compound condition** (has `and` or `or`). They are mutually exclusive.

### 5.4 Condition Behavior

1. When a condition evaluates to `false`, the associated field or section is **hidden**.
2. When a condition evaluates to `true` (or no condition is set), the field or section is **visible**.
3. Hidden fields are **excluded from validation** entirely.
4. Hidden fields **retain their values** in the form values output. The consumer decides whether to strip them.
5. Conditions are **evaluated dynamically** as values change.
6. If a condition references a field that is itself hidden (due to its own condition), the referenced field's value is treated as **not set** (`notset` returns `true`, `set` returns `false`, all comparison operators return `false`).

---

## 6. Form Values

Form values document links to its form definition via `form` and contains field values in `values`:

```json
{
  "form": {
    "id": "employee-onboarding",
    "version": "1.0.0",
    "submittedAt": "2025-06-15T10:30:00.000Z"
  },
  "values": {
    "1": "John Doe",
    "2": 30,
    "3": true,
    "4": "2025-03-01T00:00:00.000Z",
    "5": "contract",
    "6": ["TypeScript", "React"],
    "18": {"name": "document.pdf", "mimeType": "application/pdf", "size": 1048576, "url": "https://storage.example.com/files/abc123/document.pdf"},
    "19": "eip155:1/erc20:0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48",
    "20": {"address": "eip155:1/erc20:0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48", "ccri": "CCRI-ETH-2025-04", "cmc": "3408"}
  },
  "suggestions": {
    "1": {
      "value": "Jonathan Doe",
      "confidence": 0.8,
      "source": "Passport MRZ, line 2."
    }
  }
}
```

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `form` | `object` | yes | Reference to the form schema. |
| `form.id` | `string` | yes | Must match the `id` of the form schema these values belong to. Validated by `FormEngine.validate()` — mismatch produces a `FORM_ID_MISMATCH` document error. |
| `form.version` | `string` | yes | Must match the `version` of the form schema (semver). Validated by `FormEngine.validate()` — mismatch produces a `FORM_VERSION_MISMATCH` document error. |
| `form.submittedAt` | `string` | yes | ISO 8601 timestamp of when the form was submitted. Used as the sole reference time for relative date resolution. Auto-populated by `createFormDocument()`. Missing `submittedAt` produces a `FORM_SUBMITTED_AT_MISSING` document error; malformed values produce a `FORM_SUBMITTED_AT_INVALID` document error. |
| `values` | `object` | yes | Flat key-value map. Keys are stringified field IDs, values match field types. |
| `suggestions` | `object` | no | Sparse map of machine-proposed answers, keyed like `values`. See §6.1. |

Field IDs are globally unique, so `values` is always flat regardless of section nesting. Sections affect only presentation/grouping — not the data structure.

Sections and `static` blocks never appear in `values` — neither holds a value. `FormValuesEditor.setFieldValue()` throws when given either id. A stray key left in a stored document is ignored rather than rejected, so documents written against an older schema keep loading.

A `multiselect` value is the array of chosen option values, e.g. `"33": ["aml", "kyc"]`. It is written wholesale: the array-item helpers (`addArrayItem` / `removeArrayItem` / `moveArrayItem`) apply only to `array` fields and throw for a multiselect.

A `blockchain` value is a plain string and behaves exactly like a `string` value in storage. A
`sustainability` value is an object written wholesale, like a `file` value; `ccri` and `cmc` may be blank
or absent, and a UI that clears every input should emit `undefined` rather than an all-blank object so
that `required` behaves the way it does for every other type.

### 6.1 Suggestions

`suggestions` is optional and sparse: it may be absent entirely (documents written before suggestions
existed), and when present only some fields have an entry. Keys are stringified field IDs, in the same key
space as `values`. Sections never have suggestions — they hold no value.

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `value` | any | yes | The proposed value, shaped like the field's own value. For an `array` field this is the whole array, not a single item. |
| `confidence` | `number` | yes | How confident the producer is, as a `0..1` fraction (`0.3` means 30%). |
| `source` | `string` | yes | Human-readable explanation of why the value was proposed. |

Suggestions never affect validation or visibility: a suggestion cannot satisfy a `required` rule, and
`FormEngine.validate()` returns the same result whether or not the block is present.

`confidence` is range-checked only on write — `FormValuesEditor.setSuggestion()` and the core
`setSuggestion()` helper throw outside `0..1`. There is **no** JSON schema for form values, so a stored
document with `confidence: 1.5` loads and renders without complaint.

Two operations are defined on a suggestion:

- **Accept** copies `value` into `values` under the same key and **keeps** the suggestion, so the origin of
  the answer stays visible.
- **Reject** removes the suggestion and leaves the field's value untouched. When the last entry is removed,
  the `suggestions` key is dropped from the document rather than left as `{}`.

---

## 7. Constraints Summary

| Constraint | Limit |
|------------|-------|
| Section nesting depth | 3 levels |
| ID format | Positive integer |
| ID uniqueness | Global across entire schema (all fields and sections) |
| Select / multiselect options minimum | 1 |
| Select / multiselect option values | Unique within the field's options list |
| Array item types | `string`, `number`, `boolean`, `date`, `select`, `file`, `blockchain`, `sustainability` (not `array`, `multiselect` or `static`) |
| Static block required properties | `id`, `type`, `text` (`label` is optional) |
| Suggestion `confidence` | `0..1` (checked on write only) |
| Blockchain address format | Not validated — an opaque string |
| Sustainability required properties | `address` only (`ccri` and `cmc` are optional) |

---

## 8. Schema Validation Rules

The engine must validate the schema itself before use. Invalid schemas must be rejected with clear error messages.

| Rule | Error |
|------|-------|
| Duplicate IDs | `Duplicate id: "{id}"` |
| Condition references non-existent field | `Condition references unknown field: "{field}"` |
| Section nesting exceeds 3 levels | `Section nesting exceeds maximum depth of 3: "{id}"` |
| `maxLength` < `minLength` | `maxLength must be >= minLength for field "{id}"` |
| `max` < `min` | `max must be >= min for field "{id}"` |
| `maxDate` < `minDate` | `maxDate must be >= minDate for field "{id}"` |
| `maxItems` < `minItems` | `maxItems must be >= minItems for field "{id}"` |
| Select or multiselect field with no options | `Select field "{id}" must have at least one option` |
| Static field with no `text` | Schema error: missing required property `"text"` |
| Static field with `validation` or `options` | Schema error: unsupported property |
| Array field with missing `item` | `Array field "{id}" must specify item` |
| Array item with `type: "array"`, `"multiselect"` or `"static"` | Schema error: the item does not match any allowed array item type |
| Array item with `id` | `Array field "{id}" item must not have an id` |
| Invalid field type | `Unknown field type: "{type}" for field "{id}"` |
| Invalid operator | `Unknown operator: "{op}" in condition for "{id}"` |
| Condition `value` missing when required | `Condition operator "{op}" requires a value` |
| Condition references a section | `CONDITION_REFS_SECTION` — sections have no value |
| Condition references a static field | `CONDITION_REFS_STATIC` — static blocks have no value |
| Circular condition dependency | `Circular condition dependency detected: {path}` |
| Empty section (no content) | `Section "{id}" must have at least one content item` |
| `pattern` is invalid regex | `Invalid regex pattern for field "{id}": {error}` |
| `minDate`/`maxDate` not valid ISO 8601 or relative date | `Invalid date format for "{property}" in field "{id}"` |
| Section with `label` or field with `title` | `Invalid property for type "{type}" on "{id}"` |

---

## 9. Complete Example

```json
{
  "id": "employee-onboarding",
  "version": "1.0.0",
  "title": "Employee Onboarding",
  "description": "New employee registration form",
  "content": [
    {
      "id": 1,
      "type": "section",
      "title": "Personal Information",
      "content": [
        {
          "id": 2,
          "type": "string",
          "label": "Full Name",
          "validation": {
            "required": true,
            "minLength": 2,
            "maxLength": 100
          }
        },
        {
          "id": 3,
          "type": "date",
          "label": "Date of Birth",
          "validation": {
            "maxDate": "2010-01-01T00:00:00.000Z"
          }
        },
        {
          "id": 4,
          "type": "string",
          "label": "Email",
          "validation": {
            "required": true,
            "pattern": "^[^@]+@[^@]+\\.[^@]+$",
            "patternMessage": "Must be a valid email address"
          }
        }
      ]
    },
    {
      "id": 5,
      "type": "section",
      "title": "Employment Details",
      "content": [
        {
          "id": 6,
          "type": "select",
          "label": "Employment Type",
          "options": [
            { "value": "full-time", "label": "Full-time" },
            { "value": "part-time", "label": "Part-time" },
            { "value": "contract", "label": "Contract" }
          ],
          "validation": {
            "required": true
          }
        },
        {
          "id": 7,
          "type": "date",
          "label": "Start Date",
          "validation": {
            "required": true,
            "minDate": "2024-01-01T00:00:00.000Z"
          }
        },
        {
          "id": 8,
          "type": "date",
          "label": "Contract End Date",
          "condition": { "field": 6, "op": "eq", "value": "contract" },
          "validation": {
            "required": true
          }
        },
        {
          "id": 9,
          "type": "number",
          "label": "Weekly Hours",
          "condition": { "field": 6, "op": "eq", "value": "part-time" },
          "validation": {
            "required": true,
            "min": 1,
            "max": 40
          }
        }
      ]
    },
    {
      "id": 10,
      "type": "section",
      "title": "Skills & Qualifications",
      "content": [
        {
          "id": 11,
          "type": "boolean",
          "label": "Do you have professional certifications?"
        },
        {
          "id": 12,
          "type": "array",
          "label": "Certifications",
          "item": {
            "type": "string",
            "label": "Certification"
          },
          "condition": { "field": 11, "op": "eq", "value": true },
          "validation": {
            "minItems": 1,
            "maxItems": 10
          }
        },
        {
          "id": 13,
          "type": "select",
          "label": "Primary Skill",
          "options": [
            { "value": "engineering", "label": "Engineering" },
            { "value": "design", "label": "Design" },
            { "value": "management", "label": "Management" }
          ],
          "validation": {
            "required": true
          }
        },
        {
          "id": 14,
          "type": "number",
          "label": "Years of Experience",
          "condition": {
            "and": [
              { "field": 13, "op": "set" },
              { "field": 13, "op": "ne", "value": "management" }
            ]
          },
          "validation": {
            "required": true,
            "min": 0,
            "max": 50
          }
        }
      ]
    },
    {
      "id": 15,
      "type": "section",
      "title": "Agreement",
      "content": [
        {
          "id": 16,
          "type": "boolean",
          "label": "I agree to the terms and conditions",
          "validation": {
            "required": true
          }
        },
        {
          "id": 17,
          "type": "boolean",
          "label": "I agree to the NDA",
          "condition": {
            "or": [
              { "field": 6, "op": "eq", "value": "full-time" },
              { "field": 6, "op": "eq", "value": "contract" }
            ]
          },
          "validation": {
            "required": true
          }
        }
      ]
    }
  ]
}
```

Corresponding values:

```json
{
  "form": {
    "id": "employee-onboarding",
    "version": "1.0.0",
    "submittedAt": "2025-06-15T10:30:00.000Z"
  },
  "values": {
    "2": "Jane Smith",
    "3": "1990-05-15T00:00:00.000Z",
    "4": "jane@example.com",
    "6": "contract",
    "7": "2025-04-01T00:00:00.000Z",
    "8": "2025-12-31T00:00:00.000Z",
    "11": true,
    "12": ["PMP", "AWS Solutions Architect"],
    "13": "engineering",
    "14": 8,
    "16": true,
    "17": true
  }
}
```
