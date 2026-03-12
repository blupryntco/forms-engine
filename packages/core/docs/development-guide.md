# Development Guide

## Prerequisites

- Node.js (see root `.nvmrc` or `package.json` engines if specified)
- pnpm (workspace manager)

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
| `visibility.ts` | `visibility.test.ts` | Single-item and bulk visibility, parent cascading |
| `validate.ts` | `validate.test.ts` | All field types, all validation rules, array items |
| `dependency-graph.ts` | `dependency-graph.test.ts` | Graph building, cycle detection, affected IDs |
| `schema-validator.ts` | `schema-validator.test.ts` | JSON Schema validation, error mapping |
| `semantic-validator.ts` | `semantic-validator.test.ts` | All semantic checks |
| `date-utils.ts` | `date-utils.test.ts` | Relative date parsing and resolution |
| `form-definition-editor.ts` | `form-definition-editor.test.ts` | CRUD operations, move, fluent chaining |
| `form-values-editor.ts` | `form-values-editor.test.ts` | Field value get/set/clear, array operations, validation, visibility |

## Adding a New Field Type

Adding a new field type (e.g., `"email"`) requires changes across several modules. Here is the step-by-step checklist:

### 1. Update Types (`types.ts`)

Add the new type to the `FieldType` union:

```ts
export type FieldType = 'string' | 'number' | 'boolean' | 'date' | 'select' | 'array' | 'file' | 'email'
```

Define the validation shape:

```ts
export type EmailValidation = {
  required?: boolean
  allowedDomains?: string[]
}
```

Add it to the `TypeSpecificValidation` union:

```ts
export type TypeSpecificValidation =
  | StringValidation
  | NumberValidation
  // ...
  | EmailValidation
```

### 2. Update JSON Schema (`form-definition.schema.json`)

Add a new branch in the `content` items `oneOf`/`if-then` blocks for the new field type. Define which validation properties are allowed.

### 3. Add Validator (`validate.ts`)

Add a `validateEmail()` method to `FieldValidator`:

```ts
private validateEmail(
  id: number,
  value: unknown,
  validation: EmailValidation | undefined
): FieldValidationError[] {
  const errors: FieldValidationError[] = []
  // required check
  // type-specific validation
  return errors
}
```

Add a case in the `validate()` method's type dispatch:

```ts
case 'email':
  errors.push(...this.validateEmail(entry.id, value, entry.validation as EmailValidation))
  break
```

### 4. Update Condition Evaluator (if needed)

If the new type has special comparison semantics (like dates), update `evalSimple()` in `condition-evaluator.ts`.

### 5. Update Semantic Validator (if needed)

If the new type has constraint pairs that can contradict (like `min/max`), add a check in `checkConstraintContradictions()` in `semantic-validator.ts`.

### 6. Write Tests

- Add validation tests in `validate.test.ts`
- Add schema validation tests in `schema-validator.test.ts`
- Add integration tests in `form-engine.test.ts`
- If condition behavior differs, add tests in `condition-evaluator.test.ts`

### 7. Update FormDefinitionEditor (if needed)

If the new type requires specific setter methods (like `setOptions` for select), add them to `form-definition-editor.ts`.

## Code Style

- **Linter/Formatter:** Biome (extends root config)
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

## Package Exports

Consumers can import from two entry points:

```ts
// Main API
import { FormEngine, FormDefinitionEditor, FormValuesEditor } from '@bluprynt/forms-core'

// JSON Schema (for external validation tools)
import schema from '@bluprynt/forms-core/schemas/form-definition.schema.json'
```
