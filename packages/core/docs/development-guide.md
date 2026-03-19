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
export type FieldType = 'string' | 'number' | 'boolean' | 'date' | 'select' | 'array' | 'file' | 'email'
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

### 2. Update JSON Schema (`form-definition.schema.json`)

Add a new branch in the `content` items `oneOf`/`if-then` blocks for the new field type. Define which validation properties are allowed.

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

### 4. Update Condition Evaluator (if needed)

If the new type has special comparison semantics (like dates), update `evalSimple()` in `condition-evaluator.ts`.

### 5. Update Semantic Validator (if needed)

If the new type has constraint pairs that can contradict (like `min/max`), add a check in `checkConstraintContradictions()` in `form-definition-validator.ts`.

### 6. Write Tests

- Add validator unit tests in `validators/email-validator.test.ts`
- Add integration tests in `field-validator.test.ts`
- Add schema validation tests in `form-definition-validator.test.ts`
- Add integration tests in `form-engine.test.ts`
- If condition behavior differs, add tests in `condition-evaluator.test.ts`

### 7. Update FormDefinitionEditor (if needed)

If the new type requires specific setter methods (like `setOptions` for select), add them to `form-definition-editor.ts`.

## Code Style

- **Linter/Formatter:** Biome. The package-level `biome.json` contains only `"extends": "//"`, which tells Biome to inherit the full configuration from the workspace root `biome.json`.
- **No runtime dependencies** beyond `ajv` — keep the package lightweight
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
