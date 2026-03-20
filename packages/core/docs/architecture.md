# Architecture

## Project Structure

```
packages/core/
├── src/
│   ├── index.ts                       # Public API exports
│   ├── types/                         # All type definitions
│   │   ├── array-item-def.ts
│   │   ├── conditions.ts
│   │   ├── errors.ts
│   │   ├── field-entry.ts
│   │   ├── field-types.ts
│   │   ├── file-value.ts
│   │   ├── form-definition.ts
│   │   ├── form-snapshot.ts
│   │   ├── form-values.ts
│   │   ├── select-option.ts
│   │   ├── validation-results.ts
│   │   └── validation/               # Per-type validation rule types
│   │       ├── array.ts
│   │       ├── boolean.ts
│   │       ├── date.ts
│   │       ├── file.ts
│   │       ├── number.ts
│   │       ├── select.ts
│   │       ├── string.ts
│   │       └── type-specific.ts
│   ├── validators/                    # Per-type field validators
│   │   ├── type-validator.ts          # TypeValidator interface
│   │   ├── string-validator.ts
│   │   ├── number-validator.ts
│   │   ├── boolean-validator.ts
│   │   ├── date-validator.ts
│   │   ├── select-validator.ts
│   │   ├── array-validator.ts
│   │   └── file-validator.ts
│   ├── form-engine.ts                 # FormEngine — main entry point
│   ├── form-definition-editor.ts      # FormDefinitionEditor — schema builder
│   ├── form-values-editor.ts          # FormValuesEditor — values editor
│   ├── condition-evaluator.ts         # ConditionEvaluator — condition logic
│   ├── visibility-resolver.ts         # VisibilityResolver — visibility computation
│   ├── field-validator.ts             # FieldValidator — value validation
│   ├── dependency-graph.ts            # DependencyGraph — DAG + topological sort
│   ├── form-definition-validator.ts   # JSON Schema + semantic validation
│   ├── date-utils.ts                  # Relative date parsing and resolution
│   ├── form-definition.schema.json    # JSON Schema for FormDefinition
│   └── *.test.ts                      # Co-located unit tests
├── package.json
├── tsconfig.json
├── tsdown.config.mts                  # Build config (ESM + CJS + DTS)
├── jest.config.ts
└── biome.json
```

## Module Dependency Graph

```
FormEngine (form-engine.ts)
├── FormDefinitionValidator (form-definition-validator.ts)
│   ├── form-definition.schema.json
│   ├── date-utils.ts
│   └── DependencyGraph (calls extractFieldRefs())
├── DependencyGraph (dependency-graph.ts)
├── ConditionEvaluator (condition-evaluator.ts)
│   └── date-utils.ts
├── VisibilityResolver (visibility-resolver.ts)
│   ├── ConditionEvaluator
│   └── topologicalOrder (from DependencyGraph)
└── FieldValidator (field-validator.ts)
    └── validators/
        ├── StringValidator
        ├── NumberValidator
        ├── BooleanValidator
        ├── DateValidator
        ├── SelectValidator
        ├── ArrayValidator
        └── FileValidator

FormDefinitionEditor (form-definition-editor.ts)
└── types/ (standalone, no engine dependencies)

FormValuesEditor (form-values-editor.ts)
└── FormEngine (form-engine.ts)
```

Key observation: `FormEngine` is the composition root. It orchestrates all other modules but none of the submodules depend on it. `FormDefinitionEditor` is fully independent — it operates on raw `FormDefinition` JSON without needing the engine. `FormValuesEditor` depends on `FormEngine` — it wraps an engine instance and a mutable `FormDocument` to provide a fluent API for reading/writing form values.

## Engine Construction Lifecycle

When `new FormEngine(definition)` is called, the following steps execute in order:

```
Input: FormDefinition (JSON)
  │
  ▼
[0] JSON Schema Validation (AJV)
  │  Validates structural correctness against form-definition.schema.json
  │  → Throws DocumentError if invalid
  │
  ▼
[1] Build Field Registry
  │  Depth-first walk of definition.content tree
  │  → Produces: Map<id, FieldEntry> + contentOrder: number[]
  │
  ▼
[2] Semantic Validation
  │  Checks: duplicate IDs, nesting depth, unknown field refs,
  │  condition refs to sections, constraint contradictions, invalid regex
  │  → Collects: DocumentValidationError[]
  │
  ▼
[3] Cycle Detection + Error Gate
  │  DFS-based cycle detection on condition dependency graph
  │  → Appends CIRCULAR_DEPENDENCY issue if found
  │  If any errors from steps 2-3: throw DocumentError(errors)
  │
  ▼
[4] Build Dependency Graph
  │  Forward adjacency map + Kahn's algorithm (topological sort
  │  is internal to DependencyGraph constructor)
  │
  ▼
[5] Assemble Components
     → ConditionEvaluator, VisibilityResolver, FieldValidator
```

## Condition System

Conditions control the visibility of fields and sections. The evaluation is handled by `ConditionEvaluator` (`condition-evaluator.ts`).

### Condition Syntax

A condition is either **simple** or **compound**. They are mutually exclusive — a single object is one or the other.

**Simple condition** — evaluates a single field's value:

```json
{ "field": 5, "op": "eq", "value": "contract" }
```

- `field` — numeric ID of the field to evaluate.
- `op` — one of: `set`, `notset`, `eq`, `ne`, `lt`, `gt`, `lte`, `gte`, `in`, `notin`.
- `value` — comparison operand. Required for all operators except `set`/`notset`. Must be an array for `in`/`notin`.

**Compound condition** — combines child conditions with logical `and`/`or`, supporting arbitrary nesting:

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

### Parsing

Condition parsing is discriminator-based — the evaluator checks for the presence of `and`, `or`, or `field` keys:

```
evalCondition(condition, ctx):
  if 'and' in condition → condition.and.every(child => evalCondition(child, ctx))
  if 'or'  in condition → condition.or.some(child => evalCondition(child, ctx))
  otherwise             → evalSimple(condition, ctx)
```

No explicit AST is built. The JSON structure **is** the tree — `and`/`or` arrays form interior nodes, simple conditions form leaves. Recursion follows the JSON nesting directly.

### Evaluation Logic (`evalSimple`)

For a simple condition `{ field, op, value }` against an `EvaluationContext { values, visibilityMap?, now? }`:

```
1. Hidden-field check:
   if visibilityMap exists AND field is hidden → return (op === 'notset')

2. Read field value:
   fieldValue = values[String(field)]

3. Dispatch by operator:
   set     → fieldValue !== null && fieldValue !== undefined && fieldValue !== ''
   notset  → fieldValue === null || fieldValue === undefined || fieldValue === ''
   eq      → fieldValue === resolve(value)
   ne      → fieldValue !== resolve(value)
   lt/gt/lte/gte → compareTo(fieldValue, value) <op> 0
   in      → Array.isArray(value) && value.includes(fieldValue)
   notin   → Array.isArray(value) && !value.includes(fieldValue)
```

### Value Comparison (`compareTo`)

The `compareTo` method determines the comparison strategy based on types:

```
compareTo(a, b, now):
  resolvedB = resolveIfDate(b, now)       // resolve "+7d" etc.

  if both are numbers → return a - resolvedB
  if both are strings:
    if both parse as dates (Date.parse) → return timestamp_a - timestamp_b
    else → lexicographic comparison
  otherwise → NaN (comparison operators return false)
```

Key implications:
- **Numbers** are compared numerically.
- **Strings** are first attempted as ISO 8601 dates. If both parse, they are compared as timestamps. Otherwise, lexicographic comparison is used.
- **No implicit type coercion** — comparing a number to a string returns `NaN`, making all ordering operators (`lt`, `gt`, `lte`, `gte`) evaluate to `false`.
- **`eq`/`ne`** use strict equality (`===`/`!==`) with no `compareTo` — they work across types but only match identical type+value pairs.

### Relative Date Resolution in Conditions

Condition values that match the pattern `^[+-]\d+[dwmy]$` (e.g., `"+7d"`, `"-1m"`) are resolved to absolute ISO 8601 strings before comparison. Resolution uses `ctx.now`, which is derived from `form.submittedAt`. This applies to:
- The `value` operand of `eq`/`ne` operators (via `resolveIfDate`)
- The `value` operand of ordering operators `lt`/`gt`/`lte`/`gte` (via `compareTo` → `resolveIfDate`)

Field values themselves are **not** resolved — only the condition's `value` operand is.

### Compound Condition Short-Circuiting

- `and` uses `Array.every()` — stops at the first `false` child.
- `or` uses `Array.some()` — stops at the first `true` child.

### Where Conditions Are Used

Conditions appear on two types of content items:

| Content item | Effect when condition is `false` |
|---|---|
| Field | Field is hidden, excluded from validation |
| Section | Section and **all descendants** are hidden and excluded from validation |

The `ConditionEvaluator` itself is stateless — it receives an `EvaluationContext` on every call. The statefulness (visibility map, topological ordering) lives in `VisibilityResolver`, which calls `ConditionEvaluator` internally.

---

## Key Design Patterns

### Field Registry (Flat Map)

The definition tree (nested sections containing fields) is walked once at construction time and flattened into a `Map<number, FieldEntry>`. Every field and section gets a `FieldEntry` with its metadata, parent ID, and validation rules. This enables O(1) lookups by ID throughout the engine.

```
Definition tree:              Registry (flat map):
┌─ Section (id: 1)            1 → { type: section, parentId: undefined }
│  ├─ Field (id: 2)           2 → { type: string, parentId: 1 }
│  └─ Field (id: 3)           3 → { type: number, parentId: 1 }
└─ Field (id: 4)              4 → { type: boolean, parentId: undefined }
```

### Topological Ordering (Kahn's Algorithm)

The `DependencyGraph` builds a directed graph where edges represent "field A's value is referenced by item B's condition." Kahn's algorithm produces a topological ordering so that when computing visibility in bulk, every item's dependencies are resolved before the item itself.

Additionally, parent → child edges are added so that sections are always evaluated before their children.

### Hidden-Field Rule

When computing bulk visibility via `getVisibilityMap()`, if a condition references a field that has already been determined hidden, that field's value is treated as "not set":
- `notset` → `true`
- `set` → `false`
- All comparison operators → `false`

This prevents "ghost" values from hidden fields from affecting other fields' visibility.

The single-item `isVisible()` method does **not** apply this rule — it evaluates using raw values. The bulk `getVisibilityMap()` is the authoritative source for cascading visibility.

### Cascading Parent Visibility

If a parent section is hidden, all its descendants are immediately marked hidden without evaluating their own conditions. This is enforced during topological traversal in `VisibilityResolver.getVisibilityMap()`.

### Validation-Visibility Coupling

Validation always operates on the visibility map: hidden fields are skipped entirely. This means a required field inside a hidden section produces no validation error. The full flow is:

```
validate(doc)
  ├─ [1] Compatibility check: verify doc.form.id, doc.form.version,
  │      and doc.form.submittedAt → collect DocumentValidationError[]
  │
  │  If documentErrors exist → return early { valid: false, fieldErrors: empty, documentErrors }
  │
  ├─ [2] Resolve reference time from doc.form.submittedAt
  ├─ [3] Compute visibilityMap (using resolved reference time)
  └─ [4] Validate only visible fields → collect FieldValidationError[]
  → Return { valid, fieldErrors, documentErrors? }
```

Field validation (steps 2-4) only runs when no document errors exist. If document errors are present, the method returns early with `valid: false` and an empty `fieldErrors` map.

### Relative Date Resolution

Date boundaries (`minDate`, `maxDate`) and condition values support relative expressions like `"+7d"`, `"-1m"`, `"+1y"`. These are resolved to absolute ISO 8601 strings **at evaluation time** (not at construction time), using `doc.form.submittedAt` as the reference timestamp. `submittedAt` is the sole source of truth and cannot be overridden.

This means date constraints are anchored to the submission time, ensuring consistent validation results when re-validating a previously submitted form. Missing `submittedAt` produces a `FORM_SUBMITTED_AT_MISSING` document error; malformed values produce a `FORM_SUBMITTED_AT_INVALID` document error.

### Fluent Builder (FormDefinitionEditor)

`FormDefinitionEditor` wraps a deep-cloned `FormDefinition` and exposes chainable mutation methods (`addField`, `removeItem`, `moveItem`, etc.). It auto-generates IDs when omitted, prevents structural violations (e.g., moving a section into its own descendant), and outputs a clean `FormDefinition` via `toJSON()`.

### Fluent Values Editor (FormValuesEditor)

`FormValuesEditor` wraps a `FormEngine` and a mutable `FormDocument`. It provides chainable methods for setting/clearing field values, manipulating array items (add, remove, move, set), setting `submittedAt`, and delegating to the engine for validation and visibility. The document is deep-cloned on construction and on output (`toJSON()`) to prevent external mutation.

## External Dependencies

| Dependency | Purpose |
|------------|---------|
| `ajv` (^8.0.0) | **Peer dependency.** JSON Schema validation of form definitions against `form-definition.schema.json`. Uses `ajv/dist/2020` for JSON Schema 2020-12 draft support. Must be installed by the consuming project. |

No other runtime dependencies. `ajv` is a peer dependency and must be provided by the host project. Build tooling (`tsdown`, `typescript`, `jest`, `ts-jest`, `biome`) are dev-only.
