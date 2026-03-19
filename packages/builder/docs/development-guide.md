# Development Guide

## Prerequisites

- Node.js >= 22 (see root `package.json` `engines` field)
- pnpm 10+ (workspace manager; exact version pinned via `packageManager` in root `package.json`)

## Setup

From the monorepo root:

```bash
pnpm install
```

The builder package depends on `@bluprynt/forms-core` as a peer dependency. The workspace link is resolved automatically by pnpm.

## Scripts

All scripts run from `packages/builder/`:

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
pnpm turbo run build --filter=@bluprynt/forms-builder
pnpm turbo run test --filter=@bluprynt/forms-builder
```

## Testing

Tests are co-located with source files (`.test.tsx`/`.test.ts` alongside `.tsx`/`.ts`). The test runner is Jest with `ts-jest` preset and `jsdom` environment. React component tests use `@testing-library/react`.

```bash
# Run all tests
pnpm test

# Run a specific test file
pnpm test -- use-form-builder

# Run tests matching a pattern
pnpm test -- -t "adds a field"
```

## Build Output

```bash
pnpm build
```

Produces:

- `dist/index.mjs` — ESM
- `dist/index.cjs` — CJS
- `dist/index.d.ts` — Type declarations

The `tsdown` config (`tsdown.config.mts`) entry point is `src/index.ts`. Both ESM and CJS formats are generated with TypeScript declaration files. Peer dependencies (`react`, `@bluprynt/forms-core`) and runtime dependencies (`@dnd-kit/*`) are never bundled — they are externalized via `neverBundle` in the tsdown config.