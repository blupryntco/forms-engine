# Forms Engine — Runtime Engine PRD

## 1. Problem Statement

We have a JSON-based form definition schema (see `.claude/SCHEMA.md`) and a structural validator that checks whether a form definition is well-formed (AJV-based, in `packages/core`). What we lack is a **runtime engine** that takes a validated form definition and a set of form values, and efficiently:

1. Determines which fields/sections are **visible** based on conditional rules.
2. **Validates** form values — but only for fields that are currently visible.
3. Supports **incremental reactivity** — when a single value changes, identifies which fields/sections need visibility re-evaluation, without re-evaluating the entire form.

The engine must work identically on **client (browser)** and **server (Node.js)** with zero platform-specific dependencies.

---

## 2. Goals

| Goal | Description |
|------|-------------|
| **Fast runtime** | Condition evaluation and validation must be near-instantaneous for forms with hundreds of fields. No schema traversal on the hot path. |
| **Hybrid prepare/evaluate model** | One-time `prepare()` builds optimized internal structures; runtime calls are lookups + targeted evaluation. |
| **Correct conditional semantics** | Matches spec: hidden fields skip validation, hidden-field references evaluate as "not set", parent visibility propagates to children. |
| **Incremental reactivity** | When a value changes, only re-evaluate affected conditions — not the entire form. |
| **Isomorphic** | Pure TypeScript/JavaScript. No DOM, no Node-specific APIs. Works in any JS runtime. |
| **Developer-friendly API** | Minimal surface area. Clear types. Errors include field IDs and human-readable messages. |

---

## 3. Non-Goals

- **UI rendering** — the engine produces data (visibility maps, validation results); rendering is the concern of `packages/react` or other UI packages.
- **Form state management** — the engine does not hold or mutate form values. It receives values as input and returns computed results.
- **Schema authoring** — the engine consumes validated form definitions. Schema creation/editing is out of scope.
- **Persistence** — the engine is stateless across invocations. No database, no storage.

---

## 4. Architecture: Hybrid Prepare/Evaluate

### 4.1 Overview

```
┌─────────────────┐         ┌──────────────────────────────────────┐
│  Form Definition │──────►  │  prepare(formDef)                    │
│  (JSON)          │         │                                      │
└─────────────────┘         │  Builds:                             │
                             │  ├─ Field Registry (Map<id, def>)   │
                             │  ├─ Parent Chain (Map<id, parentId>)│
                             │  ├─ Dependency Graph                │
                             │  ├─ Topological Order               │
                             │  └─ Condition Index                 │
                             │                                      │
                             │  Returns: FormEngine                 │
                             └──────────────┬───────────────────────┘
                                            │
                      ┌─────────────────────┼──────────────────────┐
                      │                     │                      │
                      ▼                     ▼                      ▼
              isVisible(id, values)  getVisibilityMap(values)  validate(values)
              getAffectedIds(fieldId)
```

### 4.2 Why Hybrid (Not Pure Codegen, Not Pure Interpreter)

| Approach | Pros | Cons |
|----------|------|------|
| **Pure codegen** | Fastest execution (compiled JS functions) | Requires `new Function()` or `eval()`, blocked by CSP in many browsers; harder to debug; serialization complexity |
| **Pure interpreter** | Simplest implementation | Re-traverses schema on every call; no incremental reactivity; O(n) per value change |
| **Hybrid (chosen)** | Pre-built data structures give O(1) lookups; dependency graph enables incremental updates; no `eval()` needed; debuggable | Slightly more complex prepare step than pure interpreter |

The hybrid approach gives us near-codegen performance (all lookups are Map/Set operations) without the security and DX downsides of runtime code generation.

---

## 5. Data Structures Built by `prepare()`

### 5.1 Field Registry

**Type:** `Map<number, FieldEntry>`

```typescript
type FieldEntry = {
    id: number
    type: 'string' | 'number' | 'boolean' | 'date' | 'select' | 'array' | 'section'
    condition: Condition | undefined
    validation: TypeSpecificValidation | undefined
    parentId: number | undefined       // ID of containing section, or undefined for top-level
    options: SelectOption[] | undefined // for select fields
    item: ArrayItemDef | undefined     // for array fields
}
```

Every field and every section gets an entry. Flat map — no nesting to traverse at runtime.

**Construction:** Walk the `content` tree recursively, assigning `parentId` based on the enclosing section. This is a single pass, O(n) where n is total number of content items.

### 5.2 Parent Chain

Implicit in `FieldEntry.parentId`. To check if a field is visible, we check its own condition AND walk up through `parentId` links checking each ancestor section's condition. Since nesting is capped at 3, this is at most 3 lookups.

### 5.3 Dependency Graph

**Type:** `Map<number, Set<number>>`

Maps each field ID to the set of field/section IDs whose **visibility conditions** reference that field. When `field_1` changes, `dependencyGraph.get(1)` returns all IDs that need visibility re-evaluation.

**Construction:** For each content item that has a `condition`, extract all `field` references from the condition tree (recursively for `and`/`or`). For each referenced field ID `f`, add the current item's ID to `dependencyGraph.get(f)`.

### 5.4 Topological Order

**Type:** `number[]`

An ordered list of all content item IDs such that if item A's condition references a field inside item B (or B's section), then B appears before A in the order.

**Purpose:** Enables single-pass bulk visibility evaluation (`getVisibilityMap`). Process items in topological order, and by the time we evaluate item A's condition, we already know whether the fields it references are visible (and therefore whether their values should be treated as "set" or "not set").

**Construction:** Build a directed graph where edges go from "referenced field" to "dependent item". Run Kahn's algorithm (BFS-based topological sort). If a cycle is detected, `prepare()` throws an error with the cycle path.

### 5.5 Condition Index

Each `FieldEntry` already stores its `condition`. No separate index needed — the condition is accessed via `fieldRegistry.get(id).condition`.

---

## 6. Condition Evaluation

### 6.1 Core Function

```typescript
evalCondition(condition: Condition, values: FormValues, visibilityMap?: Map<number, boolean>): boolean
```

**Parameters:**
- `condition` — the condition to evaluate (simple or compound).
- `values` — the current form values (`Record<string, unknown>`).
- `visibilityMap` (optional) — if provided, used to check whether referenced fields are themselves visible. If a referenced field is hidden, its value is treated as "not set" per spec §5.4 rule 6.

### 6.2 Simple Condition Evaluation

Given `{ field, op, value }`:

1. Get the referenced field's value from `values[String(field)]`.
2. **Hidden-field rule:** If `visibilityMap` is provided and `visibilityMap.get(field) === false`, treat the field value as `undefined` (not set).
3. Apply the operator:

| Operator | Logic |
|----------|-------|
| `set` | `fieldValue !== null && fieldValue !== undefined && fieldValue !== ""` |
| `notset` | `fieldValue === null \|\| fieldValue === undefined \|\| fieldValue === ""` |
| `eq` | `fieldValue === conditionValue` (strict equality, no coercion) |
| `ne` | `fieldValue !== conditionValue` |
| `lt` | `compare(fieldValue, conditionValue) < 0` |
| `gt` | `compare(fieldValue, conditionValue) > 0` |
| `lte` | `compare(fieldValue, conditionValue) <= 0` |
| `gte` | `compare(fieldValue, conditionValue) >= 0` |
| `in` | `conditionValue.includes(fieldValue)` (conditionValue is an array) |
| `notin` | `!conditionValue.includes(fieldValue)` |

**`compare` function:**
- For numbers: standard numeric comparison.
- For dates: parse both sides as ISO 8601 timestamps (via `Date.parse()`), then numeric comparison. Condition values in relative date format (`-5d`, `+1y`) are resolved to absolute ISO 8601 at the moment of evaluation.
- For strings: lexicographic comparison (standard JS `<` / `>` behavior).
- For other types / type mismatch: return `false` (condition not met).

### 6.3 Compound Condition Evaluation

| Type | Logic |
|------|-------|
| `{ and: [...] }` | Short-circuit AND: iterate conditions, return `false` on first `false`. Return `true` if all are `true`. |
| `{ or: [...] }` | Short-circuit OR: iterate conditions, return `true` on first `true`. Return `false` if all are `false`. |

Compound conditions recurse into `evalCondition` for each child.

### 6.4 Relative Date Resolution

Relative dates in condition values (e.g., `{ field: 4, op: "gte", value: "-5d" }`) are resolved at evaluation time using:

```
resolveRelativeDate(relative: string, now: Date): string  // returns ISO 8601
```

**Resolution rules:**
- `+Nd` / `-Nd` — add/subtract N days from `now`.
- `+Nw` / `-Nw` — add/subtract N * 7 days from `now`.
- `+Nm` / `-Nm` — add/subtract N months from `now`.
- `+Ny` / `-Ny` — add/subtract N years from `now`.

Detection: a string matching `^[+-]\d+[dwmy]$` is treated as relative. Everything else is treated as an absolute value.

The `now` parameter defaults to `new Date()` but is injectable for deterministic testing.

---

## 7. Visibility

### 7.1 `isVisible(id: number, values: FormValues): boolean`

Determines whether a single field or section is visible.

**Algorithm:**
1. Look up `FieldEntry` from registry.
2. If entry has no condition → provisionally visible.
3. If entry has a condition → evaluate it via `evalCondition(condition, values)`. If `false` → return `false`.
4. **Parent chain check:** If `entry.parentId` is defined, recursively call `isVisible(parentId, values)`. If parent is not visible → return `false`.
5. Return `true`.

**Note on hidden-field references in single-field mode:** When calling `isVisible` for a single field (not in bulk mode), we do NOT have a pre-computed visibility map. The hidden-field rule (§5.4 rule 6 in the spec) requires knowing whether referenced fields are visible. In single-field mode, we resolve this by recursively calling `isVisible` for referenced fields. The topological order guarantees no infinite recursion (cycles are rejected at prepare time).

### 7.2 `getVisibilityMap(values: FormValues): Map<number, boolean>`

Computes visibility for ALL fields and sections in a single pass.

**Algorithm:**
1. Create result map: `Map<number, boolean>`.
2. Iterate content items in **topological order**.
3. For each item:
   a. If it has no condition → visible (subject to parent check).
   b. If it has a condition → `evalCondition(condition, values, resultMap)` — pass the in-progress result map so hidden-field references resolve correctly.
   c. **Parent check:** If parent is in result map as `false` → this item is `false` regardless of its own condition.
   d. Store result.
4. Return the map.

**Performance:** Single pass. O(n) where n = total content items. Each condition evaluation is O(k) where k = number of condition nodes (typically small).

### 7.3 `getAffectedIds(fieldId: number): Set<number>`

Returns the set of content item IDs whose visibility may change when `fieldId`'s value changes. Sourced directly from the dependency graph.

**Transitive expansion:** If changing field A affects the visibility of field B, and field B is referenced in field C's condition, then C is also affected. The method performs a BFS/DFS over the dependency graph to collect all transitively affected IDs.

```
getAffectedIds(1) → Set { 3, 5, 7 }
// Meaning: when field 1's value changes, fields/sections 3, 5, and 7
// need their visibility re-evaluated.
```

---

## 8. Validation

### 8.1 `validate(values: FormValues): FormValidationResult`

Validates all visible fields against their validation rules.

**Algorithm:**
1. Compute `visibilityMap = getVisibilityMap(values)`.
2. Iterate all entries in the field registry.
3. Skip entries where `type === 'section'` (sections have no values).
4. Skip entries where `visibilityMap.get(id) === false` (hidden fields are not validated).
5. For each visible field, run type-specific validation (see §8.2–§8.7).
6. Return result.

### 8.2 Return Type

```typescript
type FieldValidationError = {
    fieldId: number
    rule: string           // e.g., "required", "minLength", "pattern", "min", "maxItems"
    message: string        // human-readable, e.g., "Value is required"
    params?: Record<string, unknown>  // e.g., { minLength: 2, actual: 1 }
}

type FormValidationResult = {
    valid: boolean
    errors: FieldValidationError[]
}
```

### 8.3 String Validation

| Rule | Check | Error message template |
|------|-------|----------------------|
| `required` | value is not `null`, `undefined`, or `""` | `"Value is required"` |
| `minLength` | `value.length >= minLength` | `"Must be at least {minLength} characters"` |
| `maxLength` | `value.length <= maxLength` | `"Must be at most {maxLength} characters"` |
| `pattern` | `new RegExp(pattern).test(value)` | `patternMessage` if provided, else `"Value does not match the required pattern"` |

**Evaluation order:** `required` first. If field is not required and value is empty (`null`, `undefined`, `""`), skip remaining rules (an optional empty field is valid).

### 8.4 Number Validation

| Rule | Check | Error message template |
|------|-------|----------------------|
| `required` | value is not `null` and not `undefined` | `"Value is required"` |
| `min` | `value >= min` | `"Must be at least {min}"` |
| `max` | `value <= max` | `"Must be at most {max}"` |

**Type check:** If value is present but not a `number` type → error: `"Must be a number"`.

### 8.5 Boolean Validation

| Rule | Check | Error message template |
|------|-------|----------------------|
| `required` | value is `true` or `false` (not `null`, not `undefined`) | `"Value is required"` |

### 8.6 Date Validation

| Rule | Check | Error message template |
|------|-------|----------------------|
| `required` | value is not `null`, `undefined`, or `""` | `"Value is required"` |
| `minDate` | `Date.parse(value) >= Date.parse(resolvedMinDate)` | `"Must be on or after {minDate}"` |
| `maxDate` | `Date.parse(value) <= Date.parse(resolvedMaxDate)` | `"Must be on or before {maxDate}"` |

**Relative date resolution:** `minDate`/`maxDate` constraints in the form definition may use relative format (`-5d`, `+1y`). These are resolved to absolute ISO 8601 at the moment `validate()` is called, using `new Date()` as the reference point (injectable for testing).

**Type check:** If value is present but not a valid ISO 8601 date string (`isNaN(Date.parse(value))`) → error: `"Must be a valid date"`.

### 8.7 Select Validation

| Rule | Check | Error message template |
|------|-------|----------------------|
| `required` | value is not `null` and not `undefined` | `"Value is required"` |

**Option check:** If value is present, verify it matches one of the field's `options[].value`. If not → error: `"Value is not a valid option"`.

### 8.8 Array Validation

| Rule | Check | Error message template |
|------|-------|----------------------|
| `minItems` | `value.length >= minItems` | `"Must have at least {minItems} items"` |
| `maxItems` | `value.length <= maxItems` | `"Must have at most {maxItems} items"` |

**Type check:** If value is present but not an `Array` → error: `"Must be an array"`.

**Item validation:** Each item in the array is validated against the field's `item` definition using the same type-specific rules (§8.3–§8.7, excluding array — no nested arrays). Item errors include an index in the field ID path: `{ fieldId: 6, itemIndex: 2, rule: "minLength", ... }`.

**Extended error type for array items:**

```typescript
type ArrayItemValidationError = FieldValidationError & {
    itemIndex: number
}
```

---

## 9. Semantic Validation of Form Definition at Prepare Time

Beyond the structural JSON Schema validation (which AJV handles), `prepare()` performs **semantic validation** that JSON Schema cannot express. If any check fails, `prepare()` throws a `FormDefinitionError` with all detected issues.

### 9.1 Checks Performed

| # | Check | Error message |
|---|-------|---------------|
| 1 | **Duplicate IDs** — all field and section IDs must be globally unique. | `Duplicate id: {id}` |
| 2 | **Condition references unknown field** — every `field` value in a condition must correspond to an existing field/section ID. | `Condition references unknown field: {field} (in item {id})` |
| 3 | **Section nesting exceeds 3 levels** — count depth during tree walk. | `Section nesting exceeds maximum depth of 3: {id}` |
| 4 | **Constraint contradictions (minLength > maxLength)** | `maxLength must be >= minLength for field {id}` |
| 5 | **Constraint contradictions (min > max)** | `max must be >= min for field {id}` |
| 6 | **Constraint contradictions (minDate > maxDate)** — only when both are absolute. | `maxDate must be >= minDate for field {id}` |
| 7 | **Constraint contradictions (minItems > maxItems)** | `maxItems must be >= minItems for field {id}` |
| 8 | **Invalid regex pattern** — attempt `new RegExp(pattern)`. | `Invalid regex pattern for field {id}: {error}` |
| 9 | **Circular condition dependencies** — detected via topological sort. | `Circular condition dependency detected: {cycle_path}` |
| 10 | **Condition references a section** — conditions should reference fields (which have values), not sections (which don't). | `Condition references section {field}, which has no value (in item {id})` |

### 9.2 Error Accumulation

`prepare()` collects ALL semantic errors before throwing, so the user gets a complete list of issues rather than fixing them one at a time.

```typescript
class FormDefinitionError extends Error {
    issues: FormDefinitionIssue[]
}

type FormDefinitionIssue = {
    code: string        // e.g., "DUPLICATE_ID", "CIRCULAR_DEPENDENCY"
    message: string     // human-readable
    itemId?: number     // the item that has the issue
}
```

---

## 10. Public API Surface

### 10.1 Entry Point

```typescript
// packages/core/src/index.ts
export { prepare } from './engine/prepare'
export type { FormEngine, FormValidationResult, FieldValidationError, FormDefinitionError } from './engine/types'
```

### 10.2 `prepare` Function

```typescript
function prepare(formDefinition: FormDefinition): FormEngine
```

- **Input:** A form definition object. [assumption: structurally validated via AJV before calling `prepare()`; `prepare()` does semantic validation only].
- **Output:** A `FormEngine` instance.
- **Throws:** `FormDefinitionError` if semantic validation fails.

### 10.3 `FormEngine` Interface

```typescript
interface FormEngine {
    /**
     * Check if a single field or section is visible given current values.
     */
    isVisible(id: number, values: FormValues): boolean

    /**
     * Compute visibility for all fields and sections in a single optimized pass.
     * Returns a Map where key = content item ID, value = visible (true/false).
     */
    getVisibilityMap(values: FormValues): Map<number, boolean>

    /**
     * Get the set of content item IDs whose visibility may change
     * when the given field's value changes. Includes transitive dependencies.
     */
    getAffectedIds(fieldId: number): Set<number>

    /**
     * Validate all visible fields against their validation rules.
     * Hidden fields are skipped entirely.
     */
    validate(values: FormValues): FormValidationResult

    /**
     * Access to the prepared field registry for UI rendering.
     * Returns the field/section definition by ID.
     */
    getFieldDef(id: number): FieldEntry | undefined

    /**
     * Ordered list of all content item IDs in document order (as they appear
     * in the form definition). Useful for rendering.
     */
    readonly contentOrder: readonly number[]
}
```

### 10.4 Type Definitions

```typescript
/** Form values — flat map, keys are stringified field IDs */
type FormValues = Record<string, unknown>

/** Result of validate() */
type FormValidationResult = {
    valid: boolean
    errors: FieldValidationError[]
}

/** Single field validation error */
type FieldValidationError = {
    fieldId: number
    rule: string
    message: string
    params?: Record<string, unknown>
    itemIndex?: number   // present only for array item errors
}
```

---

## 11. Module Structure

All new code goes into `packages/core/src/engine/`:

```
packages/core/src/
├── engine/
│   ├── types.ts                 — All TypeScript types for the engine
│   ├── prepare.ts               — prepare() function: builds registry, dep graph, topo sort
│   ├── condition-evaluator.ts        — evalCondition(): pure function, all 10 operators + and/or
│   ├── visibility.ts            — isVisible(), getVisibilityMap(), getAffectedIds()
│   ├── validate.ts              — validate(): type-specific validation for all 6 field types
│   ├── dependency-graph.ts      — buildDependencyGraph(), detectCycles(), topoSort()
│   ├── date-utils.ts            — resolveRelativeDate(), isRelativeDate()
│   ├── semantic-validator.ts    — semantic checks run during prepare()
│   └── index.ts                 — re-exports prepare() and types
├── schemas/
│   └── form-definition.schema.json  (existing)
├── form-definition-validator.ts     (existing — structural validation)
├── validator.ts                     (existing — AJV wrapper)
└── index.ts                         (existing — updated to re-export engine)
```

### 11.1 Module Dependency Graph

```
prepare.ts
  ├── semantic-validator.ts
  ├── dependency-graph.ts
  ├── condition-evaluator.ts  (used at prepare time only for type checking)
  ├── visibility.ts
  │   └── condition-evaluator.ts
  │       └── date-utils.ts
  └── validate.ts
      ├── visibility.ts
      └── date-utils.ts
```

No circular dependencies between modules.

---

## 12. Edge Cases and Behavioral Specifications

### 12.1 Hidden Field Referenced in Condition

**Spec rule (SCHEMA.md §5.4 rule 6):** If a condition references a field that is itself hidden (due to its own condition), the referenced field's value is treated as **not set**.

**Behavior:**
- `set` → `false`
- `notset` → `true`
- All comparison operators (`eq`, `ne`, `lt`, `gt`, `lte`, `gte`, `in`, `notin`) → `false` (even `ne`, because we can't meaningfully compare against a non-existent value)

**Exception for `ne`:** `ne` returns `false` when the referenced field is hidden, NOT `true`. Rationale: "not equal to X" is not the same as "value does not exist". A hidden field has no value to compare. [assumption: this is the safer interpretation; prevents unintentional visibility when a dependency is hidden]

### 12.2 Missing Values

A field that exists in the schema but has no corresponding key in `values` is treated identically to `null`:
- `set` → `false`
- `notset` → `true`
- `required` validation → fails

### 12.3 Type Mismatch in Values

If `values["3"]` is `"hello"` but field 3 is `type: "number"`:
- Comparison operators return `false` (no implicit coercion).
- Validation produces a type error: `"Must be a number"`.

### 12.4 Array Field with Empty Array

- `[]` satisfies `set` (it's not null/undefined/"").
- `minItems: 1` fails on `[]`.
- Item validation is not run (no items to validate).

### 12.5 Boolean Required

- `required: true` means the value must be explicitly `true` or `false`.
- A value of `false` **does** satisfy `required`. (The field has a value — it's just `false`.)

### 12.6 Section Visibility Cascading

If section S is hidden:
- All fields and sub-sections within S are hidden.
- All fields within S are excluded from validation.
- If any field within S is referenced by a condition on a field outside S, that reference sees the field as "not set" (per §12.1).

### 12.7 Condition on a Section

Sections can have conditions. A section's condition controls visibility of the entire section and all its descendants.

### 12.8 No Condition = Always Visible

Fields/sections without a `condition` property are always visible (subject to parent visibility).

### 12.9 Topological Order and the Hidden-Field Rule

During `getVisibilityMap`, items are processed in topological order. When evaluating item A's condition, if it references field B, we look up B's visibility in the in-progress result map:
- If B has already been processed and is visible → use B's actual value from `values`.
- If B has already been processed and is hidden → treat B's value as "not set".
- B is guaranteed to have been processed before A (that's what topological order ensures).

---

## 13. Testing Strategy

### 13.1 Unit Tests (per module)

| Module | Test focus |
|--------|-----------|
| `condition-evaluator.ts` | All 10 operators with various types. Compound conditions. Short-circuit behavior. Hidden-field references. Relative date resolution in condition values. Edge cases (null, undefined, empty string, type mismatch). |
| `dependency-graph.ts` | Graph construction from conditions. Cycle detection (simple cycle, transitive cycle). Transitive dependency expansion. |
| `visibility.ts` | Single-field visibility. Parent chain cascading. Hidden-field-references-hidden-field chains. Bulk visibility map. `getAffectedIds` results. |
| `validate.ts` | All 6 field types with all validation rules. Required + optional combinations. Array item validation. Skip-hidden-fields behavior. Type mismatch errors. Relative date resolution in minDate/maxDate. |
| `semantic-validator.ts` | Duplicate IDs. Unknown field references. Nesting depth. Constraint contradictions. Invalid regex. Circular dependencies. Condition references section. |
| `prepare.ts` | Integration: accepts valid definitions. Rejects invalid definitions with accumulated errors. Returned engine has correct API. |
| `date-utils.ts` | All units (d, w, m, y). Positive and negative offsets. Edge cases (month overflow, leap years). |

### 13.2 Integration Tests

Full `prepare()` → `engine.validate()` / `engine.isVisible()` flows using the complete example from SCHEMA.md §9 (employee onboarding form).

Scenarios:
1. All fields filled correctly → `valid: true`, all fields visible per conditions.
2. Employment type = "contract" → contract-specific fields visible, part-time fields hidden.
3. Employment type = "part-time" → weekly hours visible, contract end date hidden.
4. Boolean "certifications" = false → certifications array hidden and not validated.
5. Change employment type from "contract" to "full-time" → `getAffectedIds(6)` includes fields 8 and 9 and section-related items.
6. Required field left empty → `valid: false` with correct error.
7. Hidden required field left empty → `valid: true` (hidden fields skip validation).

---

## 14. Performance Considerations

### 14.1 Prepare Time

- Single tree walk: O(n) for building the registry and parent chain.
- Dependency graph: O(n * c) where c = average number of condition nodes per item.
- Topological sort: O(n + e) where e = edges in dependency graph.
- Total: O(n * c) — acceptable even for forms with thousands of fields.

### 14.2 Runtime

| Operation | Complexity |
|-----------|-----------|
| `isVisible(id)` | O(d * k) where d = nesting depth (max 3), k = condition nodes for the item. In practice, O(1) for simple conditions. |
| `getVisibilityMap()` | O(n * k) — single pass, all items. |
| `getAffectedIds(fieldId)` | O(a) where a = number of transitively affected items. Pre-computed graph traversal. |
| `validate()` | O(n * k + n * v) where v = average validation rules per field. Dominated by O(n). |

### 14.3 Memory

The `FormEngine` holds:
- Field registry: O(n) entries.
- Dependency graph: O(n + e) — typically sparse.
- Topological order: O(n) — array of IDs.
- Content order: O(n) — array of IDs.

No duplication of form definition data — entries reference the original objects where possible.

---

## 15. Now/Date Injection for Testing

All functions that resolve relative dates accept an optional `now?: Date` parameter, defaulting to `new Date()`. This allows deterministic testing:

```typescript
engine.validate(values, { now: new Date('2025-06-15T00:00:00.000Z') })
```

This `now` parameter is threaded through to `resolveRelativeDate` and `evalCondition` internally.

---

## 16. Error Messages Catalog

### 16.1 Semantic Validation Errors (thrown by `prepare()`)

| Code | Message template |
|------|-----------------|
| `DUPLICATE_ID` | `Duplicate id: {id}` |
| `UNKNOWN_FIELD_REF` | `Condition references unknown field: {field} (in item {id})` |
| `NESTING_DEPTH` | `Section nesting exceeds maximum depth of 3: {id}` |
| `INVALID_RANGE_MIN_MAX_LENGTH` | `maxLength must be >= minLength for field {id}` |
| `INVALID_RANGE_MIN_MAX` | `max must be >= min for field {id}` |
| `INVALID_RANGE_DATE` | `maxDate must be >= minDate for field {id}` |
| `INVALID_RANGE_ITEMS` | `maxItems must be >= minItems for field {id}` |
| `INVALID_REGEX` | `Invalid regex pattern for field {id}: {error}` |
| `CIRCULAR_DEPENDENCY` | `Circular condition dependency detected: {cycle_path}` |
| `CONDITION_REFS_SECTION` | `Condition references section {field}, which has no value (in item {id})` |

### 16.2 Form Value Validation Errors (returned by `validate()`)

| Rule | Message template |
|------|-----------------|
| `required` | `Value is required` |
| `type` | `Must be a {expectedType}` |
| `minLength` | `Must be at least {minLength} characters` |
| `maxLength` | `Must be at most {maxLength} characters` |
| `pattern` | `{patternMessage}` or `Value does not match the required pattern` |
| `min` | `Must be at least {min}` |
| `max` | `Must be at most {max}` |
| `minDate` | `Must be on or after {minDate}` |
| `maxDate` | `Must be on or before {maxDate}` |
| `invalidDate` | `Must be a valid date` |
| `invalidOption` | `Value is not a valid option` |
| `minItems` | `Must have at least {minItems} items` |
| `maxItems` | `Must have at most {maxItems} items` |

---

## 17. Implementation Sequence

| Step | Module | Depends on | Description |
|------|--------|-----------|-------------|
| 1 | `types.ts` | — | All type definitions |
| 2 | `date-utils.ts` | — | Relative date resolution |
| 3 | `condition-evaluator.ts` | `types.ts`, `date-utils.ts` | Condition evaluator (all operators) |
| 4 | `dependency-graph.ts` | `types.ts` | Graph construction, cycle detection, topo sort |
| 5 | `semantic-validator.ts` | `types.ts` | All semantic checks |
| 6 | `visibility.ts` | `types.ts`, `condition-evaluator.ts` | isVisible, getVisibilityMap, getAffectedIds |
| 7 | `validate.ts` | `types.ts`, `date-utils.ts`, `visibility.ts` | Type-specific field validation |
| 8 | `prepare.ts` | all above | Orchestrates building, returns FormEngine |
| 9 | `engine/index.ts` | `prepare.ts`, `types.ts` | Re-exports |
| 10 | Update `src/index.ts` | `engine/index.ts` | Add engine exports to package entry point |

Each step includes its corresponding test file.

---

## 18. Design Decisions

| # | Decision | Resolution |
|---|----------|------------|
| 1 | `validate()` does NOT check `values.form.id`/`values.form.version` against the definition. | The caller is responsible for matching values to the correct definition. |
| 2 | `getAffectedIds` caches its BFS results lazily. | The dependency graph is static after `prepare()`, so transitive expansion results are computed once per field ID on first call. |
| 3 | The engine does NOT expose the raw dependency graph. | Not in v1. Can be added later if needed. |
| 4 | `validate()` ignores extra keys in `values` that don't correspond to schema fields. | The engine validates only fields defined in the schema. |
