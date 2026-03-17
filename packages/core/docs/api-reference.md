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

#### `isVisible(id: number, doc: FormDocument): boolean`

Checks whether a single item is visible. Evaluates the item's own condition and walks up the parent chain. **Does not apply the hidden-field rule** — use `getVisibilityMap()` for authoritative cascading visibility.

```ts
if (engine.isVisible(5, doc)) {
  // render field 5
}
```

#### `getVisibilityMap(doc: FormDocument): Map<number, boolean>`

Computes visibility for all items in topological order. Applies the [hidden-field rule](./architecture.md#hidden-field-rule) and cascading parent visibility. This is the authoritative visibility source.

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

#### `validate(doc: FormDocument): FormValidationResult`

Validates a form document in two phases:

1. **Compatibility check** — verifies `doc.form.id` matches the engine's form ID, `doc.form.version` matches the engine's form version, and `doc.form.submittedAt` is present and valid. Mismatches/issues are reported in `result.documentErrors`.
2. **Field validation** — validates all **visible** fields against their validation rules. Hidden fields are skipped.

Both phases always run. If document errors are present, `result.valid` is `false` regardless of field validation results.

```ts
const result = engine.validate(doc)
if (!result.valid) {
  // Check document-level errors (id/version mismatch, submittedAt issues)
  result.documentErrors?.forEach(e => console.log(e.code, e.message))
  // Check field-level errors
  result.fieldErrors.forEach((errors, fieldId) => errors.forEach(e => console.log(fieldId, e.rule, e.message)))
}
```

**Relative date resolution:** When resolving relative dates (e.g., `"+7d"`), `validate()` uses `doc.form.submittedAt` as the reference timestamp. This is the sole source of truth for relative date resolution — it cannot be overridden.

> **Note:** `isVisible()` and `getVisibilityMap()` do not perform compatibility checks.

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

Partially updates a field. Cannot change `id` or `type`.

```ts
editor.updateField(3, { label: 'Full Name', validation: { required: true } })
```

#### `updateSection(id: number, updates: Partial<Omit<SectionContentItem, 'id' | 'type' | 'content'>>): this`

Partially updates a section. Cannot change `id`, `type`, or `content`.

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
editor.setOptions(7, [{ value: 'a', label: 'A' }, { value: 'b', label: 'B' }])
editor.setArrayItem(8, { type: 'string', label: 'Item' })
editor.setLabel(3, 'New Label')
editor.setFieldDescription(3, 'Help text')
```

Pass `undefined` to `setValidation` or `setCondition` to clear the value.

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

##### `addArrayItem(fieldId: number, value?: unknown): this`

Appends an item to an array field. Initializes the field to `[]` if no value is currently set.

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

#### Document Metadata

##### `setSubmittedAt(submittedAt: string): this`

Sets the `submittedAt` ISO 8601 timestamp on the document.

```ts
editor.setSubmittedAt('2025-01-01T00:00:00Z')
```

#### Validation & Visibility

##### `validate(): FormValidationResult`

Validates the current document against the form definition. Delegates to `FormEngine.validate()`.

```ts
const result = editor.validate()
if (!result.valid) {
  result.fieldErrors.forEach((errors, fieldId) => errors.forEach(e => console.log(fieldId, e.message)))
}
```

##### `getVisibilityMap(): Map<number, boolean>`

Computes visibility for every field and section. Delegates to `FormEngine.getVisibilityMap()`.

```ts
const vis = editor.getVisibilityMap()
```

##### `isVisible(id: number): boolean`

Determines whether a field or section is visible given current values. Delegates to `FormEngine.isVisible()`.

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
  now: Date                         // reference date for relative dates (resolved from form.submittedAt)
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

#### `validateSchema(input: unknown): DocumentValidationError[]`

Validates raw input against the JSON Schema (`form-definition.schema.json`) using AJV. Returns errors with code `SCHEMA_INVALID`.

#### `validate(definition: FormDefinition, registry: Map<number, FieldEntry>): DocumentValidationError[]`

Performs semantic checks. Returns an array of errors. See [Schema Issue Codes](./schema-issue-codes.md) for all error codes.

---

## Types

### Form Structure

| Type | Description |
|------|-------------|
| `FormDefinition` | Top-level schema: `{ id, version, title, description?, content[] }` |
| `ContentItem` | Union: `FieldContentItem \| SectionContentItem` |
| `FieldContentItem` | Field node: `{ id, type, label, description?, condition?, validation?, options?, item? }` |
| `SectionContentItem` | Section node: `{ id, type: 'section', title, description?, condition?, content[] }` |
| `FieldType` | `'string' \| 'number' \| 'boolean' \| 'date' \| 'select' \| 'array' \| 'file'` |
| `ContentItemType` | `FieldType \| 'section'` |
| `FormValues` | `Record<string, unknown>` — flat map keyed by stringified field ID |
| `FormDocument` | `{ form: { id, version, submittedAt }, values: FormValues }` |
| `FormSnapshot` | `{ definition: FormDefinition, document: FormDocument }` |

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
| `DocumentValidationErrorCode` | `'SCHEMA_INVALID' \| 'DUPLICATE_ID' \| 'NESTING_DEPTH' \| 'UNKNOWN_FIELD_REF' \| 'CONDITION_REFS_SECTION' \| 'INVALID_MIN_MAX' \| 'INVALID_REGEX' \| 'CIRCULAR_DEPENDENCY' \| 'FORM_ID_MISMATCH' \| 'FORM_VERSION_MISMATCH' \| 'FORM_SUBMITTED_AT_MISSING' \| 'FORM_SUBMITTED_AT_INVALID'` |
| `DocumentValidationError` | `{ code: DocumentValidationErrorCode, message: string, params?: Record<string, unknown>, itemId?: number }` |
| `StringValidation` | `{ required?, minLength?, maxLength?, pattern?, patternMessage? }` |
| `NumberValidation` | `{ required?, min?, max? }` |
| `BooleanValidation` | `{ required? }` |
| `DateValidation` | `{ required?, minDate?, maxDate? }` |
| `SelectValidation` | `{ required? }` |
| `ArrayValidation` | `{ minItems?, maxItems? }` |
| `FileValidation` | `{ required? }` |
| `TypeSpecificValidation` | Union of all type-specific validation shapes: `StringValidation \| NumberValidation \| BooleanValidation \| DateValidation \| SelectValidation \| ArrayValidation \| FileValidation` |
| `FieldValidationRule` | `'REQUIRED' \| 'TYPE' \| 'MIN_LENGTH' \| 'MAX_LENGTH' \| 'PATTERN' \| 'MIN' \| 'MAX' \| 'MIN_DATE' \| 'MAX_DATE' \| 'INVALID_DATE' \| 'INVALID_OPTION' \| 'MIN_ITEMS' \| 'MAX_ITEMS'` |

### Other

| Type | Description |
|------|-------------|
| `FieldEntry` | Flattened registry entry: `{ id, type, condition, validation, parentId, options, item, label, title }` |
| `SelectOption` | `{ value: string \| number, label: string }` |
| `ArrayItemDef` | `{ type, label, description?, validation?, options? }` — no `id`, no nested arrays |
| `FileValue` | `{ name, mimeType, size, url }` |
| `DocumentError` | Error class with `.errors: DocumentValidationError[]` — thrown on definition validation failure or by `loadDocument()` on id/version mismatch |
| `EvaluationContext` | `{ values, visibilityMap?, now }` |
| `FieldDescriptor` | `Omit<FieldContentItem, 'id'> & { id?: number }` |
| `SectionDescriptor` | `Omit<SectionContentItem, 'id' \| 'content'> & { id?: number, content?: ContentItem[] }` |
| `ContentItemInfo` | `{ id, type, label?, title?, parentId }` |
