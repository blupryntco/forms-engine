# Development Guide

## Prerequisites

- Node.js >= 22 (see root `package.json` `engines` field)
- pnpm 10+ (workspace manager; exact version pinned via `packageManager` in root `package.json`)

## Setup

From the monorepo root:

```bash
pnpm install
```

The viewer package depends on `@bluprynt/forms-core`, `react`, and `react-dom` as peer dependencies. The workspace links are resolved automatically by pnpm.

## Scripts

All scripts run from `packages/viewer/`:

| Command | Description |
|---------|-------------|
| `pnpm build` | Compiles to ESM + CJS + DTS via tsdown |
| `pnpm dev` | Watches source files and rebuilds on change |
| `pnpm test` | Runs all tests via Jest |
| `pnpm test:watch` | Runs tests in watch mode |
| `pnpm test:cov` | Runs tests with coverage report |
| `pnpm lint` | Runs Biome linter/formatter checks |
| `pnpm check-types` | TypeScript type checking without emit |

Or from the monorepo root via Turborepo:

```bash
pnpm turbo run build --filter=@bluprynt/forms-viewer
pnpm turbo run test --filter=@bluprynt/forms-viewer
```

## Testing

Tests are co-located with source files (`.test.tsx`/`.test.ts` alongside `.tsx`/`.ts`). The test runner is Jest with `ts-jest` preset and `jsdom` environment. React component tests use `@testing-library/react`.

```bash
# Run all tests
pnpm test

# Run a specific test file
pnpm test -- form-viewer

# Run tests matching a pattern
pnpm test -- -t "renders fields"
```

### Test Coverage

| Module | Test file | Coverage focus |
|--------|-----------|----------------|
| `form-viewer.tsx` | `form-viewer.test.tsx` | Read-only rendering, visibility, validation display |
| `form-editor.tsx` | `form-editor.test.tsx` | Editable rendering, field change handlers, validation |
| `form/utils.ts` | `form/utils.test.ts` | Error extraction, synthetic array field construction |

## Adding a New Field Type

When a new field type (e.g., `"email"`) is added to `@bluprynt/forms-core`, the viewer package needs corresponding changes:

### 1. Add View Props Type

In `types/viewer.ts`, create a props type for the read-only view:

```ts
export type EmailViewProps = BaseViewFieldProps & {
    value: string | undefined
}
```

Add the new key to `ViewerComponentMap`:

```ts
export type ViewerComponentMap = {
    // ...existing entries...
    email: ComponentType<EmailViewProps>
}
```

### 2. Add Edit Props Type

In `types/editor.ts`, create a props type for the editable view:

```ts
export type EmailEditProps = BaseEditFieldProps & {
    value: string | undefined
    onChange: (value: string | undefined) => void
}
```

Add the new key to `EditorComponentMap`:

```ts
export type EditorComponentMap = {
    // ...existing entries...
    email: ComponentType<EmailEditProps>
}
```

### 3. Add Rendering Case in FormItems

`form/form-items.tsx` dispatches field rendering via `components[fieldType]`. For simple scalar fields, no changes are needed — the generic branch handles them automatically. If the new type requires special prop injection (like `select` needs `options`), add a condition in the field rendering block:

```ts
if (item.type === 'email') fieldProps.someProp = item.someProp
```

### 4. Export New Types

Re-export the new props types from `types/index.ts` and `index.ts`.

### 5. Write Tests

- Add viewer rendering tests in `form-viewer.test.tsx`
- Add editor interaction tests in `form-editor.test.tsx`
- Verify the new field type appears correctly in both read-only and editable modes

## Code Style

- **Linter/Formatter:** Biome. The package-level `biome.json` contains only `"extends": "//"`, which tells Biome to inherit the full configuration from the workspace root `biome.json`.
- **Component typing:** Always type React components with `FC<Props>` (e.g., `const MyComponent: FC<MyProps> = (props) => { ... }`).
- **No context in leaf components:** Do not use `useFormContext` in leaf rendering components (field renderers, section renderers). Pass all required data as props through the component chain.
- **Co-located tests:** Each component file has a corresponding `.test.tsx` or `.test.ts` alongside it.
- **Type safety:** Avoid `any`; use `unknown` and narrow explicitly.

## Build Output

```bash
pnpm build
```

Produces:

- `dist/index.mjs` — ESM
- `dist/index.cjs` — CJS
- `dist/index.d.ts` — Type declarations

The `tsdown` config (`tsdown.config.mts`) entry point is `src/index.ts`. Both ESM and CJS formats are generated with TypeScript declaration files. Peer dependencies (`react`, `@bluprynt/forms-core`) are never bundled — they are externalized via `neverBundle` in the tsdown config.
