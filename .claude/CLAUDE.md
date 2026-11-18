# Bluprynt Forms Engine

## 1. Overview

Forms Engine is a system that allows users to define custom form schemas, publish them, and enable other users to fill, validate, view, and edit forms based on those schemas. The engine operates on JSON-based form definitions and produces JSON-based form values.

See [Form Schema](./SCHEMA.md) for details of how form schemas are defined.

## 2. Core Concepts

### 2.1 Form Schema

A form schema is a JSON document that describes the structure of a form: its fields, sections, validation rules, and conditional visibility rules.

### 2.2 Form Values

Form values is a JSON document that contains user-submitted data corresponding to a specific form schema. Form documents carry a required `submittedAt` (ISO 8601) timestamp that serves as the reference time for relative date resolution (e.g., `"+7d"`, `"-1m"`) unless the caller passes a trusted `now` in `EvaluationOptions`. The client controls `submittedAt`, so server-side validation must pass `now`; an invalid `now` produces a `NOW_INVALID` document error. Missing `submittedAt` produces a `FORM_SUBMITTED_AT_MISSING` document error; invalid values produce a `FORM_SUBMITTED_AT_INVALID` document error.

`values` may hold data the form has no place for: unknown keys, values on `section`/`static` ids, values of hidden fields, undeclared keys in `array_obj` rows. `FormEngine.sanitize(doc, options?)` returns a copy without them (and cleans `suggestions` the same way); servers should persist `engine.sanitize(doc, { now: new Date() })`. Hidden values are dropped for good, so sanitize on save/submit, not on every edit. `validate(doc, { strict: true })` reports each such value as a document error (`UNKNOWN_VALUE_KEY`, `NON_VALUE_ITEM_VALUE`, `HIDDEN_FIELD_VALUE`, `UNKNOWN_ROW_KEY`); without `strict` they pass.

A form document may also carry an optional `suggestions` block alongside `values` — machine-proposed answers keyed by the same stringified field ids. Each entry is `{ value, confidence (0..1), source }`. Suggestions never affect validation or visibility; they are accepted (copied into `values`, suggestion kept) or rejected (removed, value untouched). See [Form Schema](./SCHEMA.md) §6.1.

### 2.3 Editors

- **`FormDefinitionEditor`** — fluent builder for programmatically constructing and modifying form schemas (`FormDefinition`). Operates on the schema structure: add/remove/move fields and sections, set validation rules, configure conditions and options.
- **`FormValuesEditor`** — fluent editor for programmatically reading and writing form values against a `FormDefinition`. Wraps a `FormEngine` and a mutable `FormDocument`. Supports setting/clearing field values, array item manipulation (add, remove, move, set — on `array` and `array_obj` alike), per-cell writes into `array_obj` rows, suggestion management (set/clear/accept/reject), validation, sanitizing (`sanitize`), and visibility queries.

## 3. Field Types

Every field and section also accepts four optional authoring-metadata properties: `description`, `placeholder`, `answer_guidelines` and `reference_id` (all strings). They are presentation metadata — the engine never reads them.

A `static` block is the one field type whose `label` is optional; it carries a required `text` property instead, and accepts no `validation` or `options`. Neither list type (`array`, `array_obj`) may be used as an item type — lists do not nest — but every other type may, including `static` and `multiselect`.

Each field in a form has a type. The following types must be supported:

| Type | Description |
|------|-------------|
| **string** | Text input |
| **number** | Numeric input |
| **boolean** | True/false toggle |
| **date** | Date picker |
| **select** | Single selection from a predefined list of options |
| **multiselect** | Any number of selections from a predefined list; the value is an array of the chosen options' values |
| **array** | A list of values (any of the existing field types described above, via `item`) |
| **array_obj** | A list of rows; each row holds one value per sub-field declared in `items`. Sub-fields carry their own globally unique `id`, which is the key their value takes inside each row object. An optional `kind` (`list` \| `table`, `list` by default) is a layout hint for the renderer — the engine never reads it. |
| **file** | File upload (stores name, MIME type, size, URL) |
| **static** | Display-only text (`text` property). Holds no value, is never validated, and cannot be referenced by a condition. |
| **blockchain** | A CAIP address identifying an on-chain asset. The value is an opaque string — the engine never checks its format. |
| **sustainability** | Sustainability references for an on-chain asset; the value is an object `{ address, ccri, cmc }`. |

Future consideration: custom field types with type-specific properties.

## 4. Validation Rules

Each field may have validation rules depending on its type:

| Type | Supported Validation Rules |
|------|---------------------------|
| **string** | required, min length, max length, pattern (regex) |
| **number** | required, min value, max value |
| **boolean** | required |
| **date** | required, min date, max date |
| **select** | required |
| **multiselect** | required (an absent value and an empty array both fail) |
| **array** | min items, max items |
| **array_obj** | min items, max items (counted in rows); each sub-field is validated in every row |
| **file** | required |
| **static** | *(none — static blocks hold no value)* |
| **blockchain** | required |
| **sustainability** | required (the value's `address` must be a non-empty string; `ccri` and `cmc` are always optional) |

## 5. Sections

- Fields can exist at the top level of the form or be grouped into sections.
- Sections can be nested up to **3 levels deep**.
- A form definition holds at most **5000 nodes**, counting content items, `array_obj` sub-fields and condition nodes. Larger definitions fail with `DEFINITION_TOO_LARGE`.
- A section contains fields and/or child sections.
- A section is shown only while at least one visible value field (any type except `static`) remains beneath it, at any depth. An empty section, one holding only `static` blocks, or one whose fields and child sections are all hidden is hidden, together with everything inside it. See §6.2.

## 6. Conditionals

Conditionals control the visibility of individual fields or entire sections based on the values of other fields.

### 6.1 Supported Condition Operators

| Operator | Description |
|----------|-------------|
| **set** | Field has a value |
| **notset** | Field has no value |
| **eq** | Field value equals a given value |
| **ne** | Field value does not equal a given value |
| **lt** | Field value is less than a given value |
| **gt** | Field value is greater than a given value |
| **lte** | Field value is less than or equal to a given value |
| **gte** | Field value is greater than or equal to a given value |
| **in** | Field value is contained in a given array |
| **notin** | Field value is not contained in a given array |

Conditions combine with `and` / `or` groups. Groups nest up to **16 levels deep** and hold up to **100 conditions** each.

### 6.2 Conditional Behavior

- A conditional references another field in the form by its identifier. Sections and `static` blocks hold no value and cannot be referenced. An `array_obj` **sub-field** id cannot be referenced either — its value is per-row, so a form-level condition cannot say which row it means. Sub-fields carry no `condition` of their own; they inherit the `array_obj` field's visibility.
- When a conditional evaluates to false, the associated field or section must be hidden.
- When a conditional evaluates to true, the associated field or section must be shown (a section only if it still has a visible value field beneath it, see §5).
- Conditionals must be evaluated dynamically as form values change.
- When a conditional field is hidden we do not consider it in form validation at all.
- Section visibility follows from content: `getVisibilityMap` / `isVisible` hide a section with no visible value field beneath it (§5), so the viewer and editor never render an empty section. In section-grouping mode (`FormSections`) such a section gets no tab, and the top-level "General" group appears only when at least one top-level value field is visible — `static` blocks alone do not create it. Validation is unaffected. Because a section's visibility can change with its content's, `getAffectedIds(fieldId)` also returns the ancestor sections of affected items.
- Against an object-valued field (`file`, `sustainability`) only `set` and `notset` are meaningful: any object present counts as set, and the comparison operators compare by reference so they never match. A half-filled `{ address: "", ccri: "", cmc: "" }` therefore still counts as set.
- Against a `multiselect` field the operators are set-oriented: `set` means at least one option is chosen, `eq`/`ne` compare the whole selection as a set (order- and duplicate-insensitive), `in`/`notin` test whether *any* chosen option appears in the given list, and the ordering operators are always false. Every other type — including `array` and `array_obj` — keeps scalar semantics.

## 7. Workflows

### 7.1 Define Form Schema

A user creates a form schema via a UI by composing fields, organizing them into sections, configuring validation rules, and setting up conditionals. The output is a JSON file representing the form schema.

### 7.2 Publish Form Schema

The user publishes the form schema so that it becomes available to other users.

### 7.3 Fill a New Form

Another user receives a published form schema. The system renders a form UI based on the schema. Requirements:

- All conditional rules must be enforced in real time (fields/sections show/hide dynamically).
- The user fills in the form and submits it.
- On submission, validation rules must be evaluated against the entered values.
- If validation fails, the system must clearly indicate which fields are invalid and why. JSON file with values should be produced anyway.
- If validation passes, the system produces a JSON file containing the form values.

### 7.4 View a Filled Form (Read-Only)

Given a form schema and a set of form values, the system must render the form in a read-only view. Requirements:

- Conditional rules must be applied — only fields/sections whose conditions are met should be visible.
- Validation state must be displayable (highlight invalid fields if requested).

### 7.5 Edit an Existing Form

Given a form schema and an existing set of form values, the system must render an editable form pre-populated with the existing values. Requirements:

- All conditional rules must be enforced dynamically.
- Validation rules must be evaluated on re-submission.
- The output is an updated JSON file with the new form values.