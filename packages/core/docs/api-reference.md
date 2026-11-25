# API Reference

## Classes

### FormEngine

The main entry point. Compiles a `FormDefinition` into a runtime engine.

```ts
import { FormEngine } from '@bluprynt/forms-core'
```

#### `constructor(definition: FormDefinition)`

Compiles the form definition. Performs JSON schema validation, semantic validation, and cycle detection.

**Throws:** `DocumentError` if the definition is invalid.

```ts
const engine = new FormEngine(definition)
```

#### `contentOrder: readonly number[]`

All content item IDs in depth-first document order.

#### `createFormDocument(values?: FormValues): FormDocument`

Creates a `FormDocument` pre-populated with the schema's `id`, `version`, and `submittedAt` (set to `new Date().toISOString()`). Documents created this way are guaranteed to pass the compatibility check in `validate()`.

```ts
const doc = engine.createFormDocument({ "1": "Alice" })
// { form: { id: "my-form", version: "1.0.0", submittedAt: "2025-06-15T10:30:00.000Z" }, values: { "1": "Alice" } }
```

#### `dumpDocument(doc: FormDocument): FormSnapshot`

Serializes the form definition and document into a single `FormSnapshot`. The snapshot contains the original `FormDefinition` used to construct the engine and the provided `FormDocument`. No validation is performed; call `validate()` separately if needed.

| Parameter | Type | Description |
|-----------|------|-------------|
| `doc` | `FormDocument` | The form document to include in the snapshot. |

**Returns:** `FormSnapshot` — a snapshot containing both the definition and the document.

```ts
const doc = engine.createFormDocument({ "1": "Alice" })
const snapshot = engine.dumpDocument(doc)
// { definition: { id: "my-form", version: "1.0.0", ... }, document: { form: { ... }, values: { "1": "Alice" } } }
```

#### `loadDocument(snapshot: FormSnapshot): FormDocument`

Loads a `FormDocument` from a previously created `FormSnapshot`. Verifies that the snapshot's form definition matches the engine's compiled definition by comparing `id` and `version`.

| Parameter | Type | Description |
|-----------|------|-------------|
| `snapshot` | `FormSnapshot` | A snapshot previously produced by `dumpDocument()`. |

**Returns:** `FormDocument` — the form document from the snapshot.

**Throws:** `DocumentError` if the snapshot's definition `id` or `version` does not match the engine's.

```ts
// Round-trip: dump and load
const doc = engine.createFormDocument({ "1": "Alice" })
const snapshot = engine.dumpDocument(doc)

// Later, with the same engine (or one built from the same definition):
try {
  const restored = engine.loadDocument(snapshot)
  console.log(restored.values) // { "1": "Alice" }
} catch (err) {
  if (err instanceof DocumentError) {
    err.errors.forEach(e => console.log(e.code, e.message))
  }
}
```

#### `isVisible(id: number, doc: FormDocument, options?: EvaluationOptions): boolean`

Checks whether a single item is visible. Evaluates the item's own condition and walks up the parent chain. **Does not apply the hidden-field rule** — use `getVisibilityMap()` for authoritative cascading visibility.

Relative dates in conditions resolve against `options.now` when given, otherwise against `doc.form.submittedAt`. Throws `RangeError` if `options.now` is an invalid date.

```ts
if (engine.isVisible(5, doc)) {
  // render field 5
}
```

#### `getVisibilityMap(doc: FormDocument, options?: EvaluationOptions): Map<number, boolean>`

Computes visibility for all items in topological order. Applies the [hidden-field rule](./architecture.md#hidden-field-rule) and cascading parent visibility. This is the authoritative visibility source. `options.now` works as in `isVisible()`, including the `RangeError` on an invalid date.

```ts
const vis = engine.getVisibilityMap(doc)
for (const [id, visible] of vis) {
  console.log(`Field ${id}: ${visible ? 'shown' : 'hidden'}`)
}
```

#### `getAffectedIds(fieldId: number): Set<number>`

Returns IDs of items whose visibility is transitively affected when `fieldId` changes. Results are **memoized** for the engine's lifetime.

```ts
const affected = engine.getAffectedIds(6)
// Re-evaluate visibility only for these items after field 6 changes
```

#### `validate(doc: FormDocument, options?: EvaluationOptions): FormValidationResult`

Validates a form document in two phases:

1. **Compatibility check** — verifies `doc.form.id` matches the engine's form ID, `doc.form.version` matches the engine's form version, `doc.form.submittedAt` is present and valid, and `options.now`, when given, is a valid date. Mismatches/issues are reported in `result.documentErrors`.
2. **Field validation** — validates all **visible** fields against their validation rules. Hidden fields are skipped.

Field validation runs only when the compatibility check passes. If it finds any document errors, `validate` returns right away with `result.valid` set to `false`, those `documentErrors` and an empty `fieldErrors` map.

```ts
const result = engine.validate(doc)
if (!result.valid) {
  // Check document-level errors (id/version mismatch, submittedAt issues)
  result.documentErrors?.forEach(e => console.log(e.code, e.message))
  // Check field-level errors
  result.fieldErrors.forEach((errors, fieldId) => errors.forEach(e => console.log(fieldId, e.rule, e.message)))
}
```

**Relative date resolution:** Relative dates (e.g., `"+7d"`) resolve against `options.now` when it is given, and against `doc.form.submittedAt` otherwise. The client controls `submittedAt`, so server-side validation must pass a trusted `now`:

```ts
const result = engine.validate(doc, { now: new Date() })
```

`submittedAt` must still be present and valid when `now` is passed: `FORM_SUBMITTED_AT_MISSING` and `FORM_SUBMITTED_AT_INVALID` are reported either way. An invalid `options.now` produces a `NOW_INVALID` document error.

**Strict mode:** By default, `validate` accepts values the definition has no place for (see [`sanitize()`](#sanitizedoc-formdocument-options-evaluationoptions-formdocument)). With `options.strict: true`, every value that `sanitize()` would remove from `values` becomes a document error (`UNKNOWN_VALUE_KEY`, `NON_VALUE_ITEM_VALUE`, `HIDDEN_FIELD_VALUE`, `UNKNOWN_ROW_KEY`) and `result.valid` is `false`. Field errors are still returned alongside them. Strict mode does not check `suggestions`, and it does not run when the compatibility check fails.

```ts
const result = engine.validate(doc, { now: new Date(), strict: true })
```

The UI keeps a field's value when the field becomes hidden, so a document saved straight from the form fails strict validation with `HIDDEN_FIELD_VALUE`. Run `sanitize()` first if you want such documents to pass.

> **Note:** `isVisible()` and `getVisibilityMap()` do not perform compatibility checks.

#### `sanitize(doc: FormDocument, options?: EvaluationOptions): FormDocument`

Returns a copy of the document without the values the definition does not accept. Removed from `values`:

- keys that match no form item, including non-canonical keys such as `"01"` and top-level keys equal to an `array_obj` sub-field id;
- values stored under a `section` or `static` id;
- values of hidden fields;
- keys in `array_obj` rows that are not a declared value sub-field (keys of `static` sub-fields are removed too).

`suggestions` is cleaned by the same rules, applied to each suggestion's `value`, and the key is dropped when nothing is left. Values of the wrong type are kept; `validate()` reports them as `TYPE`. `doc.form` is copied unchanged: `sanitize` does not check `id`, `version` or `submittedAt`.

The result is a deep (JSON) copy, and the input is not mutated. Visibility uses `options.now` when given, otherwise `doc.form.submittedAt`.

**Throws:** `RangeError` if `options.now` is an invalid date.

Hidden values are dropped for good, so call `sanitize` when saving or submitting, not on every edit. Servers should persist the sanitized document:

```ts
const clean = engine.sanitize(doc, { now: new Date() })
const result = engine.validate(clean, { now: new Date() })
```

#### `getFieldDef(id: number): FieldEntry | undefined`

Retrieves the internal `FieldEntry` for a given ID.

```ts
const def = engine.getFieldDef(3)
// { id: 3, type: 'number', validation: { min: 0, max: 100 }, ... }
```

---

### FormDefinitionEditor

Fluent builder for programmatically constructing and modifying form schemas. All mutation methods return `this` for chaining.

```ts
import { FormDefinitionEditor } from '@bluprynt/forms-core'
```

#### `constructor(definition: FormDefinition)`

Creates an editor wrapping a **deep clone** of the input definition. The original is never mutated.

#### Metadata Methods

```ts
editor
  .setId('my-form')
  .setTitle('My Form')
  .setDescription('A sample form')
  .setVersion('1.0.0')
```

#### `nextId(): number`

Returns the next available ID (max existing ID + 1).

#### `addField(descriptor: FieldDescriptor, parentId?: number, index?: number): this`

Adds a field. If `descriptor.id` is omitted, auto-assigns via `nextId()`. `parentId` places it inside a section. `index` controls insertion position.

```ts
editor.addField({ type: 'string', label: 'Name' })                      // auto-ID, top-level
editor.addField({ type: 'number', label: 'Age' }, sectionId)            // inside section
editor.addField({ id: 10, type: 'boolean', label: 'Active' }, null, 0)  // explicit ID, first position
```

#### `addSection(descriptor: SectionDescriptor, parentId?: number, index?: number): this`

Adds a section. Same ID and positioning logic as `addField`.

```ts
editor.addSection({ title: 'Personal Info' })
```

#### `updateField(id: number, updates: Partial<Omit<FieldContentItem, 'id' | 'type'>>): this`

Partially updates a field. Copies only the keys the field's kind accepts and silently ignores the rest,
including `id`, `type`, `__proto__`, `constructor` and `prototype`:

- value field: `label`, `description`, `placeholder`, `answer_guidelines`, `reference_id`, `condition`,
  `validation`, `options`, `item`, `items`, `kind`;
- `static` block: `text`, `label`, `description`, `placeholder`, `answer_guidelines`, `reference_id`, `condition`.

```ts
editor.updateField(3, { label: 'Full Name', validation: { required: true } })
```

#### `updateSection(id: number, updates: Partial<Omit<SectionContentItem, 'id' | 'type' | 'content'>>): this`

Partially updates a section. Copies only `title`, `description`, `placeholder`, `answer_guidelines`,
`reference_id` and `condition`; other keys, including `id`, `type` and `content`, are silently ignored.

#### `removeItem(id: number): this`

Removes a field or section and all its descendants.

#### `moveItem(id: number, targetParentId: number | undefined, index?: number): this`

Moves an item to a different parent (or top-level with `undefined`). Prevents moving a section into itself or its own descendants.

```ts
editor.moveItem(5, 1)            // move field 5 into section 1
editor.moveItem(5, undefined, 0) // move field 5 to top-level, first position
```

#### Field-Specific Setters

```ts
editor.setValidation(3, { required: true, minLength: 2 })
editor.setCondition(5, { field: 3, op: 'set' })
editor.setOptions(7, [{ value: 'a', label: 'A' }, { value: 'b', label: 'B' }])   // select or multiselect
editor.setArrayItem(8, { type: 'string', label: 'Item' })                      // array fields only
editor.setArrayItems(12, [{ id: 121, type: 'string', label: 'Name' }])         // array_obj fields only
editor.setLabel(3, 'New Label')
editor.setText(9, 'Answers are checked against your filings.')   // static blocks only
editor.setFieldDescription(3, 'Help text')
editor.setPlaceholder(3, 'e.g. Acme Ltd')
editor.setAnswerGuidelines(3, 'Use the name as registered')
editor.setReferenceId(3, 'KYI-3.1.a')
```

Pass `undefined` to `setValidation` or `setCondition` to clear the value.

`setFieldDescription`, `setPlaceholder`, `setAnswerGuidelines` and `setReferenceId` work on both fields and
sections, and also clear on `undefined`. Prefer them over `updateField` / `updateSection` when a property
needs removing: those copy allowed keys onto the item and cannot delete one. A key passed as `undefined` is
assigned and then dropped by `toJSON()`.

#### `array_obj` Sub-Field Methods

All five throw when the id is unknown or does not refer to an `array_obj` field.

```ts
editor.getArrayItems(12)                                          // ArrayObjItemDef[]
editor.setArrayItems(12, [{ id: 121, type: 'string', label: 'Name' }])   // replaces the whole list
editor.setArrayKind(12, 'table')                                        // 'list' | 'table' | undefined
editor.addArrayItemField(12, { type: 'date', label: 'Appointed' }) // → the new sub-field id
editor.updateArrayItemField(12, 121, { label: 'Full name' })       // merges; id and type never change
editor.removeArrayItemField(12, 121)
editor.moveArrayItemField(12, 1, 0)
editor.setArrayKind(12, 'table')                                   // undefined removes the key
```

`addArrayItemField` assigns the sub-field id from `nextId()` when one is not supplied, and rejects an
explicit id that is already taken anywhere in the definition. `nextId()` itself counts sub-field ids, so a
new top-level field can never collide with one. `updateArrayItemField` merges like `updateField`: a
property left out is kept, so pass it explicitly as `undefined` to clear it.

Its `patch` is typed `Partial<Omit<ValueArrayObjItemDef, 'id' | 'type'>> | Partial<Omit<StaticArrayObjItemDef, 'id' | 'type'>>`,
so it cannot change a sub-field's `type`; to do that, remove the sub-field and add a new one. Only these keys are
copied, the rest are silently ignored:

- value sub-field: `label`, `description`, `placeholder`, `answer_guidelines`, `reference_id`, `validation`, `options`;
- `static` sub-field: `text`, `label`, `description`, `placeholder`, `answer_guidelines`, `reference_id`.

#### Listing Methods

```ts
editor.listAll()       // ContentItemInfo[] — all items with parent info
editor.listFields()    // ContentItemInfo[] — fields only
editor.listSections()  // ContentItemInfo[] — sections only
editor.getItem(3)      // ContentItem | undefined
```

`ContentItemInfo` shape: `{ id, type, label?, title?, parentId }`.

#### `toJSON(): FormDefinition`

Returns a deep clone of the current definition.

#### `validate(): DocumentValidationError[]`

Checks the current definition against the depth and size limits, then the form definition JSON Schema, through
`FormDefinitionValidator.validateSchema()`. Returns `NESTING_DEPTH` / `DEFINITION_TOO_LARGE` issues when the
definition is over the limits, otherwise `SCHEMA_INVALID` issues for the first violation found, or an empty array
when it conforms. Semantic checks such as duplicate ids and condition references run only when
`FormEngine` compiles the definition.

```ts
const errors = editor.validate()
if (errors.length === 0) save(editor.toJSON())
```

---

### FormValuesEditor

Fluent editor for programmatically reading and writing form values against a form definition. Wraps a `FormEngine` and a mutable `FormDocument`. All mutating methods return `this` for chaining.

```ts
import { FormValuesEditor } from '@bluprynt/forms-core'
```

#### `constructor(definition: FormDefinition, doc?: FormDocument)`

Creates a new editor for the given form definition. If `doc` is provided, it is deep-cloned internally. When omitted, a blank document is created via `FormEngine.createFormDocument()`.

```ts
// Start from scratch
const editor = new FormValuesEditor(definition)

// Pre-populate from an existing document
const editor = new FormValuesEditor(definition, existingDoc)
```

#### Field Value Methods

##### `getFieldValue(fieldId: number): unknown`

Returns the current value of a field, or `undefined` if not set.

```ts
const name = editor.getFieldValue(1) // "Alice"
```

##### `setFieldValue(fieldId: number, value: unknown): this`

Sets the value of a field.

**Throws:** If `fieldId` is unknown or references a section.

```ts
editor.setFieldValue(1, 'Alice').setFieldValue(2, 30)
```

##### `clearFieldValue(fieldId: number): this`

Removes the value of a field (deletes the key from the values map).

```ts
editor.clearFieldValue(1)
```

#### Array Methods

These work on both `array` and `array_obj` fields; for an `array_obj` an "item" is a row object.

##### `addArrayItem(fieldId: number, value?: unknown): this`

Appends an item to an array field. Initializes the field to `[]` if no value is currently set. With no
explicit value, appends `undefined` for an `array` field and an empty row (`{}`) for an `array_obj`.

**Throws:** If `fieldId` is not an array field.

```ts
editor.addArrayItem(6, 'TypeScript').addArrayItem(6, 'React')
```

##### `removeArrayItem(fieldId: number, index: number): this`

Removes an item from an array field by zero-based index.

**Throws:** If `fieldId` is not an array field or the index is out of bounds.

```ts
editor.removeArrayItem(6, 0)
```

##### `moveArrayItem(fieldId: number, fromIndex: number, toIndex: number): this`

Moves an item within an array field from one index to another.

**Throws:** If `fieldId` is not an array field or either index is out of bounds.

```ts
editor.moveArrayItem(6, 0, 2) // move first item to third position
```

##### `setArrayItem(fieldId: number, index: number, value: unknown): this`

Sets the value of an item at a specific index in an array field.

**Throws:** If `fieldId` is not an array field or the index is out of bounds.

```ts
editor.setArrayItem(6, 0, 'Updated Value')
```

#### Array-of-Rows Methods

##### `getArrayObjValue(fieldId, index, subFieldId): unknown`
##### `setArrayObjValue(fieldId, index, subFieldId, value): this`
##### `clearArrayObjValue(fieldId, index, subFieldId): this`

Read, write and remove one cell of one row of an `array_obj` field. A row that is absent or not an object
is replaced with a fresh one before writing.

**Throws:** If `fieldId` is not an `array_obj` field, the row index is out of bounds, or `subFieldId` does
not belong to that field or is a `static` sub-field.

```ts
editor.addArrayItem(12).setArrayObjValue(12, 0, 121, 'Jane Roe')
```

#### Suggestions

Machine-proposed answers carried in the document's optional `suggestions` block. A suggestion never affects
validation or visibility.

##### `getSuggestion(fieldId: number): FieldSuggestion | undefined`

##### `getSuggestions(): FormSuggestions`

Returns a copy of every suggestion, keyed by stringified field id. Empty when the document has none.

##### `setSuggestion(fieldId: number, suggestion: FieldSuggestion): this`

**Throws:** If `fieldId` is unknown, references a section, or `confidence` falls outside `0..1`.

##### `clearSuggestion(fieldId: number): this`

##### `acceptSuggestion(fieldId: number): this`

Copies the suggested value into the field's value and **keeps** the suggestion. No-op when there is none.

##### `rejectSuggestion(fieldId: number): this`

Removes the suggestion, leaving the field's value untouched. No-op when there is none.

```ts
editor.setSuggestion(3, { value: 'Acme Ltd', confidence: 0.9, source: 'Certificate of incorporation, p.1' })
editor.acceptSuggestion(3)   // values['3'] === 'Acme Ltd', suggestion still present
editor.rejectSuggestion(3)   // suggestion gone, values['3'] unchanged
```

When the last suggestion is removed the `suggestions` key is dropped from the document, so a document that
never had suggestions round-trips through `toJSON()` unchanged.

#### Document Metadata

##### `setSubmittedAt(submittedAt: string): this`

Sets the `submittedAt` ISO 8601 timestamp on the document.

```ts
editor.setSubmittedAt('2025-01-01T00:00:00Z')
```

#### Validation & Visibility

##### `validate(options?: EvaluationOptions): FormValidationResult`

Validates the current document against the form definition. Delegates to `FormEngine.validate()`, passing `options` through.

```ts
const result = editor.validate()
if (!result.valid) {
  result.fieldErrors.forEach((errors, fieldId) => errors.forEach(e => console.log(fieldId, e.message)))
}
```

##### `sanitize(options?: EvaluationOptions): this`

Replaces the current document with a copy that has no values the definition does not accept. Delegates to `FormEngine.sanitize()`, passing `options` through.

**Throws:** `RangeError` if `options.now` is an invalid date.

```ts
const doc = editor.sanitize({ now: new Date() }).toJSON()
```

##### `getVisibilityMap(options?: EvaluationOptions): Map<number, boolean>`

Computes visibility for every field and section. Delegates to `FormEngine.getVisibilityMap()`, passing `options` through.

```ts
const vis = editor.getVisibilityMap()
```

##### `isVisible(id: number, options?: EvaluationOptions): boolean`

Determines whether a field or section is visible given current values. Delegates to `FormEngine.isVisible()`, passing `options` through.

```ts
if (editor.isVisible(5)) {
  // render field 5
}
```

#### Output

##### `toJSON(): FormDocument`

Returns a deep clone of the current form document.

```ts
const doc = editor.toJSON()
```

---

### ConditionEvaluator

Evaluates conditions against form values. Used internally by `VisibilityResolver`, but exported for advanced use cases.

```ts
import { ConditionEvaluator } from '@bluprynt/forms-core'
```

#### `evalCondition(condition: Condition, ctx: EvaluationContext): boolean`

Evaluates a simple or compound condition.

```ts
const evaluator = new ConditionEvaluator()
const visible = evaluator.evalCondition(
  { field: 3, op: 'eq', value: 'yes' },
  { values: { '3': 'yes' }, now: new Date() }
)
```

`EvaluationContext` shape:

```ts
type EvaluationContext = {
  values: Record<string, unknown>   // form values keyed by stringified field ID
  visibilityMap?: Map<number, boolean>  // enables hidden-field rule
  now: Date                         // reference date for relative dates (options.now, or form.submittedAt)
}
```

---

### VisibilityResolver

Computes field/section visibility. Used internally by `FormEngine`, but exported for advanced use.

#### `constructor(registry: Map<number, FieldEntry>, conditionEvaluator: ConditionEvaluator, topologicalOrder: number[])`

Creates a new resolver from the engine's field registry, a condition evaluator, and the topological ordering from `DependencyGraph`.

#### `isVisible(id: number, values: FormValues, now: Date): boolean`

Single-item check. No hidden-field rule.

#### `getVisibilityMap(values: FormValues, now: Date): Map<number, boolean>`

Bulk evaluation in topological order. Applies hidden-field rule and cascading parent visibility.

---

### FieldValidator

Validates form values against schema rules. Used internally by `FormEngine`, but exported for advanced use.

#### `validate(values: FormValues, visibilityMap: Map<number, boolean>, now: Date = new Date()): FormValidationResult`

Validates all visible fields. Returns `{ valid: boolean, fieldErrors: Map<number, FieldValidationError[]> }`.

---

### DependencyGraph

Builds and queries the condition dependency DAG.

#### `static extractFieldRefs(condition: Condition): Set<number>`

Extracts all field IDs referenced in a condition tree.

#### `static detectCycle(registry: Map<number, FieldEntry>): number[] | undefined`

Detects circular dependencies. Returns an array of field IDs forming the cycle, or `undefined` if no cycle exists.

#### `getAffectedIds(fieldId: number): Set<number>`

Returns transitive dependents via BFS. Results are memoized.

#### `readonly topologicalOrder: number[]`

All item IDs in topological order.

#### `readonly graph: Map<number, Set<number>>`

Forward adjacency map: key is a field ID, value is the set of item IDs whose conditions reference that field.

---

### FormDefinitionValidator

Validates form definitions at both the structural (JSON Schema) and semantic levels.

#### `validateLimits(input: unknown): DocumentValidationError[]`

Checks depth and size limits with a stack-based walk, so deeply nested input cannot overflow the call stack. Returns `NESTING_DEPTH` for sections nested deeper than 3 levels or `and`/`or` groups nested deeper than 16, and a single `DEFINITION_TOO_LARGE` for more than 5000 nodes. Nodes are content items, `array_obj` sub-fields, select / multiselect `options` entries and condition nodes. `validateSchema()` runs it first.

#### `validateSchema(input: unknown): DocumentValidationError[]`

Runs `validateLimits()` first and returns its issues if there are any. Otherwise validates raw input against the JSON Schema (`form-definition.schema.json`) using AJV and returns errors with code `SCHEMA_INVALID`. AJV stops at the first failing path, so the result describes the first violation it meets, not every one.

#### `validate(definition: FormDefinition, registry: Map<number, FieldEntry>): DocumentValidationError[]`

Performs semantic checks. Returns an array of errors. See [Schema Issue Codes](./schema-issue-codes.md) for all error codes.

---

## Suggestion Helpers

Pure `FormDocument -> FormDocument` functions, exported from `@bluprynt/forms-core`. `FormValuesEditor`
delegates to them, and consumers that hold a plain document (such as the viewer's editor handlers) can use
them directly without constructing an engine.

```ts
import { applySuggestion, getSuggestion, getSuggestions, removeSuggestion, setSuggestion } from '@bluprynt/forms-core'
```

| Function | Description |
|----------|-------------|
| `getSuggestion(doc, fieldId)` | The field's suggestion, or `undefined`. |
| `getSuggestions(doc)` | Copy of every suggestion; `{}` when the document has none. |
| `setSuggestion(doc, fieldId, suggestion)` | New document carrying the suggestion. Throws when `confidence` is outside `0..1`. |
| `removeSuggestion(doc, fieldId)` | New document without it; drops the `suggestions` key when it empties. Returns `doc` itself when there was nothing to remove. |
| `applySuggestion(doc, fieldId)` | New document with the suggested value deep-copied into `values`, suggestion kept. Returns `doc` itself when the field has none. |

None of these validate that `fieldId` refers to an existing, non-section field — that check belongs to
`FormValuesEditor`, which calls it before delegating. Writers never mutate their input.

## Types

### Form Structure

| Type | Description |
|------|-------------|
| `FormDefinition` | Top-level schema: `{ id, version, title, description?, content[] }` |
| `ContentItem` | Union: `AnyFieldContentItem \| SectionContentItem` |
| `AnyFieldContentItem` | Union: `FieldContentItem \| StaticFieldContentItem` — every non-section node |
| `FieldContentItem` | Value-producing field node: `{ id, type, label, description?, placeholder?, answer_guidelines?, reference_id?, condition?, validation?, options?, item? }`. `type` excludes `'static'`. |
| `StaticFieldContentItem` | Display-only block: `{ id, type: 'static', text, label?, description?, placeholder?, answer_guidelines?, reference_id?, condition? }` — no value, no validation, no options |
| `SectionContentItem` | Section node: `{ id, type: 'section', title, description?, placeholder?, answer_guidelines?, reference_id?, condition?, content[] }` |
| `FieldType` | `'string' \| 'number' \| 'boolean' \| 'date' \| 'select' \| 'multiselect' \| 'array' \| 'array_obj' \| 'file' \| 'static' \| 'blockchain' \| 'sustainability'` |
| `ContentItemType` | `FieldType \| 'section'` |
| `FormValues` | `Record<string, unknown>` — flat map keyed by stringified field ID |
| `FormDocument` | `{ form: { id, version, submittedAt }, values: FormValues, suggestions?: FormSuggestions }` |
| `FormSnapshot` | `{ definition: FormDefinition, document: FormDocument }` |
| `FieldSuggestion` | `{ value: unknown, confidence: number, source: string }` — `confidence` is a `0..1` fraction |
| `FormSuggestions` | `Record<string, FieldSuggestion>` — sparse, keyed like `FormValues` |

### Conditions

| Type | Description |
|------|-------------|
| `Condition` | `SimpleCondition \| CompoundCondition` |
| `SimpleCondition` | `{ field: number, op: string, value?: unknown }` |
| `CompoundCondition` | `{ and: Condition[] } \| { or: Condition[] }` |

### Validation

| Type | Description |
|------|-------------|
| `FormValidationResult` | `{ valid: boolean, fieldErrors: Map<number, FieldValidationError[]>, documentErrors?: DocumentValidationError[] }` |
| `FieldValidationError` | `{ fieldId, rule, message, params?, itemIndex? }` |
| `DocumentValidationErrorCode` | `'SCHEMA_INVALID' \| 'DUPLICATE_ID' \| 'NESTING_DEPTH' \| 'DEFINITION_TOO_LARGE' \| 'UNKNOWN_FIELD_REF' \| 'CONDITION_REFS_SECTION' \| 'CONDITION_REFS_STATIC' \| 'CONDITION_REFS_ARRAY_OBJ_ITEM' \| 'INVALID_MIN_MAX' \| 'INVALID_REGEX' \| 'UNSAFE_REGEX' \| 'CIRCULAR_DEPENDENCY' \| 'FORM_ID_MISMATCH' \| 'FORM_VERSION_MISMATCH' \| 'FORM_SUBMITTED_AT_MISSING' \| 'FORM_SUBMITTED_AT_INVALID' \| 'NOW_INVALID' \| 'UNKNOWN_VALUE_KEY' \| 'NON_VALUE_ITEM_VALUE' \| 'HIDDEN_FIELD_VALUE' \| 'UNKNOWN_ROW_KEY'` |
| `DocumentValidationError` | `{ code: DocumentValidationErrorCode, message: string, params?: Record<string, unknown>, itemId?: number }` |
| `StringValidation` | `{ required?, minLength?, maxLength?, pattern?, patternMessage? }` |
| `NumberValidation` | `{ required?, min?, max? }` |
| `BooleanValidation` | `{ required? }` |
| `DateValidation` | `{ required?, minDate?, maxDate? }` |
| `SelectValidation` | `{ required? }` |
| `MultiselectValidation` | `{ required? }` — an absent value and an empty array both fail `required` |
| `ArrayValidation` | `{ minItems?, maxItems? }` |
| `FileValidation` | `{ required? }` |
| `BlockchainValidation` | `{ required? }` — no format rule; a CAIP address is an opaque string |
| `SustainabilityValidation` | `{ required? }` — satisfied by a non-empty `address`; `ccri` and `cmc` are always optional |
| `TypeSpecificValidation` | Union of all type-specific validation shapes: `StringValidation \| NumberValidation \| BooleanValidation \| DateValidation \| SelectValidation \| MultiselectValidation \| ArrayValidation \| ArrayObjValidation \| FileValidation \| BlockchainValidation \| SustainabilityValidation` |
| `FieldValidationRule` | `'REQUIRED' \| 'TYPE' \| 'MIN_LENGTH' \| 'MAX_LENGTH' \| 'PATTERN' \| 'MIN' \| 'MAX' \| 'MIN_DATE' \| 'MAX_DATE' \| 'INVALID_DATE' \| 'INVALID_OPTION' \| 'MIN_ITEMS' \| 'MAX_ITEMS'` |

### Other

| Type | Description |
|------|-------------|
| `FieldEntry` | Flattened registry entry: `{ id, type, condition, validation, parentId, options, item, items, label, title }`. `array_obj` sub-fields are **not** registry entries — like `array` items, they never appear in the registry, `contentOrder`, the dependency graph or the visibility map |
| `SelectOption` | `{ value: string \| number, label: string }` |
| `ArrayItemDef` | `ValueArrayItemDef \| StaticArrayItemDef` — no `id` and no `condition`; `type` excludes `'array'` and `'array_obj'`. The static member carries `text` and an optional `label` |
| `ArrayObjItemDef` | `ValueArrayObjItemDef \| StaticArrayObjItemDef` — like `ArrayItemDef` but **with** a required `id`, drawn from the same globally unique id space as fields and sections |
| `ArrayObjRow` | `Record<string, unknown>` — one row of an `array_obj` value, keyed by stringified sub-field id |
| `ArrayObjKind` | `'list' \| 'table'` — an `array_obj` field's layout hint. Presentation metadata: the engine never reads it, and `'list'` applies when the key is absent |
| `FileValue` | `{ name, mimeType, size, url }` |
| `SustainabilityValue` | `{ address, ccri?, cmc? }` — the value of a `sustainability` field |
| `DocumentError` | Error class with `.errors: DocumentValidationError[]` — thrown on definition validation failure or by `loadDocument()` on id/version mismatch |
| `EvaluationContext` | `{ values, visibilityMap?, now }` |
| `EvaluationOptions` | `{ now?: Date, strict?: boolean }` — `now` is a trusted reference time for relative dates. Accepted by `validate()`, `sanitize()`, `isVisible()` and `getVisibilityMap()`; overrides `doc.form.submittedAt`. `strict` is read by `validate()` only: it reports values `sanitize()` would remove as document errors |
| `FieldDescriptor` | `(Omit<FieldContentItem, 'id'> \| Omit<StaticFieldContentItem, 'id'>) & { id?: number }` — hand-written, because `Omit` does not distribute over a union |
| `SectionDescriptor` | `Omit<SectionContentItem, 'id' \| 'content'> & { id?: number, content?: ContentItem[] }` |
| `ContentItemInfo` | `{ id, type, label?, title?, parentId }` |
