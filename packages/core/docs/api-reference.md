# API Reference

## Classes

### FormEngine

The main entry point. Compiles a `FormDefinition` into a runtime engine.

```ts
import { FormEngine } from '@bluprynt/forms-core'
```

#### `constructor(definition: FormDefinition)`

Compiles the form definition. Performs JSON schema validation, semantic validation, and cycle detection.

**Throws:** `FormDefinitionError` if the definition is invalid.

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

**Throws:** `FormDocumentLoadError` if the snapshot's definition `id` or `version` does not match the engine's.

```ts
// Round-trip: dump and load
const doc = engine.createFormDocument({ "1": "Alice" })
const snapshot = engine.dumpDocument(doc)

// Later, with the same engine (or one built from the same definition):
try {
  const restored = engine.loadDocument(snapshot)
  console.log(restored.values) // { "1": "Alice" }
} catch (err) {
  if (err instanceof FormDocumentLoadError) {
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
  result.errors.forEach(e => console.log(e.fieldId, e.rule, e.message))
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

#### `updateField(id: number, updates: Partial<FieldDescriptor>): this`

Partially updates a field. Cannot change `id` or `type`.

```ts
editor.updateField(3, { label: 'Full Name', validation: { required: true } })
```

#### `updateSection(id: number, updates: Partial<SectionDescriptor>): this`

Partially updates a section. Cannot change `id`, `type`, or `content`.

#### `removeItem(id: number): this`

Removes a field or section and all its descendants.

#### `moveItem(id: number, targetParentId: number | null, index?: number): this`

Moves an item to a different parent (or top-level with `null`). Prevents moving a section into itself or its own descendants.

```ts
editor.moveItem(5, 1)       // move field 5 into section 1
editor.moveItem(5, null, 0)  // move field 5 to top-level, first position
```

#### Field-Specific Setters

```ts
editor.setValidation(3, { required: true, minLength: 2 })
editor.setCondition(5, { field: 3, op: 'set' })
editor.setOptions(7, [{ value: 'a', label: 'A' }, { value: 'b', label: 'B' }])
editor.setArrayItem(8, { type: 'string', label: 'Item' })
editor.setLabel(3, 'New Label')
editor.setDescription_item(3, 'Help text')
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
  { values: { '3': 'yes' } }
)
```

`EvaluationContext` shape:

```ts
type EvaluationContext = {
  values: Record<string, unknown>   // form values keyed by stringified field ID
  visibilityMap?: Map<number, boolean>  // enables hidden-field rule
  now?: Date                        // reference date for relative dates (resolved from form.submittedAt)
}
```

---

### VisibilityResolver

Computes field/section visibility. Used internally by `FormEngine`, but exported for advanced use.

#### `isVisible(id: number, values: FormValues, now?: Date): boolean`

Single-item check. No hidden-field rule.

#### `getVisibilityMap(values: FormValues, now?: Date): Map<number, boolean>`

Bulk evaluation in topological order. Applies hidden-field rule and cascading parent visibility.

---

### FieldValidator

Validates form values against schema rules. Used internally by `FormEngine`, but exported for advanced use.

#### `validate(values: FormValues, visibilityMap: Map<number, boolean>, now?: Date): FormValidationResult`

Validates all visible fields. Returns `{ valid: boolean, errors: FieldValidationError[] }`.

---

### DependencyGraph

Builds and queries the condition dependency DAG.

#### `static extractFieldRefs(condition: Condition): Set<number>`

Extracts all field IDs referenced in a condition tree.

#### `static detectCycle(registry: Map<number, FieldEntry>): string | null`

Detects circular dependencies. Returns a cycle path string (e.g., `"1 → 2 → 1"`) or `null`.

#### `getAffectedIds(fieldId: number): Set<number>`

Returns transitive dependents via BFS. Results are memoized.

#### `topoOrder: readonly number[]`

All item IDs in topological order.

---

### SemanticValidator

Performs semantic checks on a form definition.

#### `validate(definition: FormDefinition, registry: Map<number, FieldEntry>): FormDefinitionIssue[]`

Returns an array of issues. See [Schema Issue Codes](./schema-issue-codes.md) for all issue codes.

---

### Functions

#### `validateFormDefinitionSchema(input: unknown): FormDefinitionIssue[]`

Validates raw input against the JSON Schema (`form-definition.schema.json`) using AJV. Returns issues with code `SCHEMA_INVALID`.

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
| `FormValidationResult` | `{ valid: boolean, errors: FieldValidationError[], documentErrors?: DocumentValidationError[] }` |
| `FieldValidationError` | `{ fieldId, rule, message, params?, itemIndex? }` |
| `DocumentValidationErrorCode` | `'FORM_ID_MISMATCH' \| 'FORM_VERSION_MISMATCH' \| 'FORM_SUBMITTED_AT_MISSING' \| 'FORM_SUBMITTED_AT_INVALID'` |
| `DocumentValidationError` | `{ code: DocumentValidationErrorCode, message: string, params?: Record<string, unknown> }` |
| `StringValidation` | `{ required?, minLength?, maxLength?, pattern?, patternMessage? }` |
| `NumberValidation` | `{ required?, min?, max? }` |
| `BooleanValidation` | `{ required? }` |
| `DateValidation` | `{ required?, minDate?, maxDate? }` |
| `SelectValidation` | `{ required? }` |
| `ArrayValidation` | `{ minItems?, maxItems? }` |
| `FileValidation` | `{ required? }` |

### Other

| Type | Description |
|------|-------------|
| `FieldEntry` | Flattened registry entry: `{ id, type, condition, validation, parentId, options, item, label, title }` |
| `SelectOption` | `{ value: string \| number, label: string }` |
| `ArrayItemDef` | `{ type, label, description?, validation?, options? }` — no `id`, no nested arrays |
| `FileValue` | `{ name, mimeType, size, url }` |
| `FormDefinitionIssue` | `{ code: FormDefinitionIssueCode, message, itemId? }` |
| `FormDefinitionError` | Error class with `.issues: FormDefinitionIssue[]` |
| `FormDocumentLoadError` | Error class with `.errors: DocumentValidationError[]` — thrown by `loadDocument()` on id/version mismatch |
| `EvaluationContext` | `{ values, visibilityMap?, now? }` |
| `FieldDescriptor` | `Omit<FieldContentItem, 'id'> & { id?: number }` |
| `SectionDescriptor` | `Omit<SectionContentItem, 'id' \| 'content'> & { id?: number, content?: ContentItem[] }` |
| `ContentItemInfo` | `{ id, type, label?, title?, parentId }` |
