# Development Guide

## Prerequisites

- Node.js >= 22 (see root `package.json` `engines` field)
- pnpm 10+ (workspace manager; exact version pinned via `packageManager` in root `package.json`)

## Setup

From the monorepo root:

```bash
pnpm install
```

## Scripts

All scripts run from `packages/core/`:

| Command | Description |
|---------|-------------|
| `pnpm build` | Compiles to ESM + CJS + DTS via tsdown, copies JSON schemas to `dist/` |
| `pnpm dev` | Watches source files and rebuilds on change |
| `pnpm test` | Runs all tests via Jest |
| `pnpm test:watch` | Runs tests in watch mode |
| `pnpm test:cov` | Runs tests with coverage report |
| `pnpm lint` | Runs Biome linter/formatter checks |
| `pnpm check-types` | TypeScript type checking without emit |

Or from the monorepo root via Turborepo:

```bash
pnpm turbo run build --filter=@bluprynt/forms-core
pnpm turbo run test --filter=@bluprynt/forms-core
```

## Testing

Tests are co-located with source files (`*.test.ts` alongside `*.ts`). The test runner is Jest with `ts-jest` preset.

```bash
# Run all tests
pnpm test

# Run a specific test file
pnpm test -- condition-evaluator

# Run tests matching a pattern
pnpm test -- -t "evaluates eq operator"
```

### Test Coverage

Each module has its own test file:

| Module | Test file | Coverage focus |
|--------|-----------|----------------|
| `form-engine.ts` | `form-engine.test.ts` | Construction, visibility, validation, error handling |
| `condition-evaluator.ts` | `condition-evaluator.test.ts` | All operators, compound conditions, hidden-field rule |
| `visibility-resolver.ts` | `visibility-resolver.test.ts` | Single-item and bulk visibility, parent cascading |
| `field-validator.ts` | `field-validator.test.ts` | All field types, all validation rules, array items |
| `validators/string-validator.ts` | `validators/string-validator.test.ts` | String: required, minLength, maxLength, pattern |
| `validators/number-validator.ts` | `validators/number-validator.test.ts` | Number: required, min, max |
| `validators/boolean-validator.ts` | `validators/boolean-validator.test.ts` | Boolean: required |
| `validators/date-validator.ts` | `validators/date-validator.test.ts` | Date: required, minDate, maxDate, relative dates |
| `validators/select-validator.ts` | `validators/select-validator.test.ts` | Select: required, option membership |
| `validators/file-validator.ts` | `validators/file-validator.test.ts` | File: required |
| `validators/blockchain-validator.ts` | `validators/blockchain-validator.test.ts` | Blockchain: required, string type check |
| `validators/sustainability-validator.ts` | `validators/sustainability-validator.test.ts` | Sustainability: required (`address`), object shape check |
| `validators/array-validator.ts` | `validators/array-validator.test.ts` | Array: minItems, maxItems, per-item validation |
| `dependency-graph.ts` | `dependency-graph.test.ts` | Graph building, cycle detection, affected IDs |
| `form-definition-validator.ts` | `form-definition-validator.test.ts` | JSON Schema validation, error mapping, all semantic checks |
| `date-utils.ts` | `date-utils.test.ts` | Relative date parsing and resolution |
| `form-definition-editor.ts` | `form-definition-editor.test.ts` | CRUD operations, move, fluent chaining |
| `form-values-editor.ts` | `form-values-editor.test.ts` | Field value get/set/clear, array operations, validation, visibility |

## Adding a New Field Type

Adding a new field type (e.g., `"email"`) requires changes across several modules. Here is the step-by-step checklist:

### 1. Update Types

**a.** Add the new type to the `FieldType` union in `types/field-types.ts`:

```ts
export type FieldType =
    | 'string'
    | 'number'
    | 'boolean'
    | 'date'
    | 'select'
    | 'multiselect'
    | 'array'
    | 'array_obj'
    | 'file'
    | 'static'
    | 'blockchain'
    | 'sustainability'
    | 'email'
```

**b.** Create a validation shape file `types/validation/email.ts`:

```ts
export type EmailValidation = {
  required?: boolean
  allowedDomains?: string[]
}
```

**c.** Add it to the `TypeSpecificValidation` union in `types/validation/type-specific.ts`:

```ts
export type TypeSpecificValidation =
  | StringValidation
  | NumberValidation
  // ...
  | EmailValidation
```

**d.** Decide whether the type is a legal item inside a list. `ValueArrayItemDef['type']` and
`ValueArrayObjItemDef['type']` are both `Exclude<...>` of `FieldType`, so a new type becomes a legal item
in **both** `array` and `array_obj` by default — add it to the exclusion list in
`types/array-item-def.ts` and `types/array-obj-item-def.ts` if it should not be. (`'array'` and
`'array_obj'` are excluded from both: lists do not nest.)

**e.** If the new type does not fit the `FieldContentItem` shape (e.g. it has no `label`, like `static`),
add a sibling type in `types/form-definition.ts` and widen `AnyFieldContentItem` rather than loosening
`FieldContentItem` — that keeps `field.label` a required `string` for every existing viewer component.

### 2. Update JSON Schema (`form-definition.schema.json`)

The schema is a flat set of per-type `$defs` combined with `oneOf` (there are no `if-then` blocks).

**a.** Add an `emailValidation` `$def` alongside `selectValidation` and friends.

**b.** Add an `emailField` `$def` — clone the closest existing field (`selectField` is the usual template),
set `"type": { "const": "email" }`, list every allowed property and keep `"additionalProperties": false`.

**c.** Register it in the `fieldItem` `oneOf`, and in the `arrayItem` `oneOf` only if it is a legal array item.

The schema file is a **published artifact** (`@bluprynt/forms-core/schemas/form-definition.schema.json`),
so any change here is public API.

### 2b. Update the duplicated property maps (`form-definition-validator.ts`)

Easy to miss: `itemRequiredProperties` and `itemAllowedProperties` near the top of the file repeat the
schema's per-type property sets in TypeScript. They do not affect *validity* — they shape error messages.
A type missing from them still validates, but a malformed instance produces one noisy `const`-mismatch
error per `oneOf` branch instead of a single clear message. Add an entry to both.

### 3. Add a Type-Specific Validator (`validators/`)

Validation uses a strategy pattern. Each field type has its own class implementing `TypeValidator` (defined in `validators/type-validator.ts`). See `validators/string-validator.ts` for a reference implementation.

**a.** Create `validators/email-validator.ts` implementing `TypeValidator`:

```ts
import type { EmailValidation } from '../types/validation/email'
import type { FieldValidationError } from '../types/validation-results'
import type { TypeValidator, ValidatorContext } from './type-validator'

export class EmailValidator implements TypeValidator {
    validate(ctx: ValidatorContext): FieldValidationError[] {
        const { fieldId, value } = ctx
        const validation = ctx.validation as EmailValidation | undefined
        const errors: FieldValidationError[] = []
        // required check, type-specific validation ...
        return errors
    }
}
```

**b.** Register the new validator in the `FieldValidator` constructor (`field-validator.ts`):

```ts
this.validators = {
    // ...existing entries...
    email: new EmailValidator(),
}
```

No switch/case needed -- `FieldValidator.validateField()` dispatches automatically via the `validators` registry.

### 3b. Update the engine registry (`form-engine.ts`)

`FormEngine.walkContent()` builds each `FieldEntry` with per-type ternaries. If the new type needs
`options` or `item` at validation time, widen the matching line — otherwise the validator receives
`undefined` and silently skips those checks. If it holds no value, exclude it from the `validation` line too.

### 4. Update Condition Evaluator (if needed)

If the new type has special comparison semantics (like dates or the set semantics of `multiselect`),
update `evalSimple()` in `condition-evaluator.ts`. The evaluator is value-shaped by default; to branch on
the field's *type*, read `ctx.fieldTypes` (supplied by `VisibilityResolver`) rather than inspecting the
value's runtime shape — that keeps existing types' behaviour untouched.

If the new type holds no value at all, also reject conditions that reference it, in
`checkConditionRefsValueless()` in `form-definition-validator.ts`, and add a code to
`DocumentValidationErrorCode`.

### 5. Update Semantic Validator (if needed)

If the new type has constraint pairs that can contradict (like `min/max`), add a check in `checkConstraintContradictions()` in `form-definition-validator.ts`.

### 6. Write Tests

- Add validator unit tests in `validators/email-validator.test.ts`
- Add integration tests in `field-validator.test.ts`
- Add schema validation tests in `form-definition-validator.test.ts`
- Add integration tests in `form-engine.test.ts`
- If condition behavior differs, add tests in `condition-evaluator.test.ts`

Several **hard-coded type lists** in the test suites are plain string arrays, so TypeScript will not flag
them when `FieldType` grows. Update them by hand:

- `field-validator.test.ts` — the `fieldTypes` array driving the validator-registration sweep.
- `form-definition-validator.test.ts` — `FIELD_TYPES` (the metadata sweep) and the array-item type list.
- `packages/builder/src/core/types.test.ts` — four `it.each` arrays (the `isSection`, `isField`,
  `isAddPlaceholder` and mutual-exclusivity sweeps).

### 7. Update the editors (`form-definition-editor.ts`, `form-values-editor.ts`)

- Add any type-specific setter (like `setOptions` for select, `setText` for static).
- Widen the guards on existing setters that should now accept the new type, and tighten the ones that
  should reject it (`setValidation` throws for `static`).
- `FormValuesEditor.assertField()` rejects items that hold no value — add the new type there if it has none.
- `FieldDescriptor` is a hand-written union, not `Omit<AnyFieldContentItem, 'id'>`, because `Omit` does not
  distribute over a union. Add a member for a new shape.

### 8. Update the viewer, builder and playground

- `packages/viewer/src/types/{viewer,editor}.ts` — add the prop types and a component-map key. Make the key
  **optional** so existing consumers keep compiling; `form-items.tsx` skips a field whose component is absent.
- `packages/viewer/src/form/form-items.tsx` — inject any extra props (e.g. `options`) for the new type.
- `packages/builder` is generic over `ContentItem` and normally needs nothing.
- `packages/playground` — the component maps, the `Record<FieldType, …>` maps in `builder-item.tsx` (these
  *do* fail compilation), the palette in `builder-add-field.tsx`, the type dropdown in `field-form.tsx`,
  the `ValidationEditor` switch, `ARRAY_ITEM_TYPES` in `array-item-editor.tsx` when the type is a legal
  array item, and the condition-source value input in `conditional-editor.tsx`.
- Put the demo field in `shared/data/token-listing-application.ts` only — the other eight samples are kept
  untouched on purpose, as a backward-compatibility corpus.

## Code Style

- **Linter/Formatter:** Biome. The package-level `biome.json` contains only `"extends": "//"`, which tells Biome to inherit the full configuration from the workspace root `biome.json`.
- **No runtime dependencies** — `ajv` is a peer dependency provided by the consuming project; keep the package lightweight
- **Co-located tests** — each `*.ts` file has a corresponding `*.test.ts`
- **Type safety** — avoid `any`; use `unknown` and narrow explicitly

## Build

```bash
pnpm build
```

Produces:
- `dist/index.mjs` — ESM
- `dist/index.cjs` — CJS
- `dist/index.d.ts` — Type declarations
- `dist/form-definition.schema.json` — Exported JSON Schema

The `tsdown` config (`tsdown.config.mts`) entry point is `src/index.ts`. Both ESM and CJS formats are generated with TypeScript declaration files.
