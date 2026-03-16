# shadcn/ui

shadcn/ui is the component library for this project. Components are installed via CLI into `shared/ui/`, then adapted to match project coding standards. shadcn uses Radix UI primitives under the hood and styles them with Tailwind CSS utility classes.

## Configuration

Config file: `apps/compliance-web/components.json`

Key settings:
- **Style**: `new-york`
- **CSS variables**: `false` — all styling via Tailwind utility classes, no CSS variable toggling
- **Icon library**: `lucide`
- **Aliases**: components install to `@/shared/ui`, utils to `@/shared/lib/cn`

## Available Components & Documentation

Fetch https://ui.shadcn.com/llms.txt via `WebFetch` to get the up-to-date list of available components, their API reference, and usage examples. Always check before adding a new component to verify it exists and review its props/patterns. Install only what you need.

## Adding a Component

### Step 1: Install via CLI

Run from the `apps/compliance-web/` directory:

```bash
cd apps/compliance-web && bunx --bun shadcn@latest add <component-name>
```

Examples:
```bash
cd apps/compliance-web && bunx --bun shadcn@latest add dialog
cd apps/compliance-web && bunx --bun shadcn@latest add dropdown-menu
cd apps/compliance-web && bunx --bun shadcn@latest add table
```

The CLI places the component file into `src/shared/ui/`. It may generate a flat file like `src/shared/ui/dialog.tsx`.

### Step 2: Restructure to folder convention

Every component must live in its own folder:

```
src/shared/ui/<component-name>/
├── <component-name>.tsx    # component implementation
├── index.ts                # barrel: re-exports component(s) only
└── <component-name>.stories.tsx  # (when stories exist)
```

After CLI install, move the generated file:

```bash
# Example: dialog was installed as src/shared/ui/dialog.tsx
mkdir -p src/shared/ui/dialog
mv src/shared/ui/dialog.tsx src/shared/ui/dialog/dialog.tsx
```

Then create the barrel file `src/shared/ui/dialog/index.ts`:
```tsx
export { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from './dialog'
```

### Step 3: Adapt to coding standards

The shadcn CLI generates components with `function` declarations and default export patterns. Adapt each generated component to match project conventions:

| Generated (shadcn default) | Required (project standard) |
|---|---|
| `function Button({ ... })` | `const Button: FC<ButtonProps> = ({ ... }) =>` |
| `React.ComponentProps<"button">` | `ComponentProps<'button'>` — import from `react` |
| `import * as React from "react"` | Named imports: `import { type FC, type ComponentProps } from 'react'` |
| `export { Button, buttonVariants }` | Export only component(s) — no variant constants, no props types |
| `import { Slot } from "radix-ui"` | Keep as-is — `radix-ui` is the correct import for shadcn components |
| Double quotes in strings | Single quotes (Biome formatting) |

**Adaptation example:**

Before (shadcn generated):
```tsx
import * as React from "react"
import { Slot } from "radix-ui"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/shared/lib/cn"

function Button({
  className,
  variant,
  size,
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean
  }) {
  const Comp = asChild ? Slot.Root : "button"
  return (
    <Comp data-slot="button" className={cn(buttonVariants({ variant, size, className }))} {...props} />
  )
}

export { Button, buttonVariants }
```

After (project standard):
```tsx
'use client'

import { type ComponentProps, type FC } from 'react'
import { Slot } from 'radix-ui'
import { cva, type VariantProps } from 'class-variance-authority'

import { cn } from '@/shared/lib/cn'

type ButtonProps = ComponentProps<'button'> &
    VariantProps<typeof buttonVariants> & {
        asChild?: boolean
    }

const buttonVariants = cva(
    'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-all disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*=\'size-\'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]',
    {
        variants: {
            variant: {
                default: 'bg-primary text-primary-foreground hover:bg-primary/90',
                destructive: 'bg-destructive text-white hover:bg-destructive/90 focus-visible:ring-destructive/20 dark:focus-visible:ring-destructive/40 dark:bg-destructive/60',
                outline: 'border bg-background shadow-xs hover:bg-accent hover:text-accent-foreground dark:bg-input/30 dark:border-input dark:hover:bg-input/50',
                secondary: 'bg-secondary text-secondary-foreground hover:bg-secondary/80',
                ghost: 'hover:bg-accent hover:text-accent-foreground dark:hover:bg-accent/50',
                link: 'text-primary underline-offset-4 hover:underline',
            },
            size: {
                default: 'h-9 px-4 py-2 has-[>svg]:px-3',
                xs: 'h-6 gap-1 rounded-md px-2 text-xs has-[>svg]:px-1.5',
                sm: 'h-8 rounded-md gap-1.5 px-3 has-[>svg]:px-2.5',
                lg: 'h-10 rounded-md px-6 has-[>svg]:px-4',
                icon: 'size-9',
            },
        },
        defaultVariants: {
            variant: 'default',
            size: 'default',
        },
    },
)

const Button: FC<ButtonProps> = ({ className, variant, size, asChild = false, ...props }) => {
    const Comp = asChild ? Slot.Root : 'button'
    return (
        <Comp
            data-slot="button"
            className={cn(buttonVariants({ variant, size, className }))}
            {...props}
        />
    )
}

export { Button }
```

### Adaptation checklist

After installing any shadcn component, apply these changes:

1. **Move** to folder: `shared/ui/<name>/<name>.tsx`
2. **Create barrel**: `shared/ui/<name>/index.ts` — export component(s) only (no variant constants, no types)
3. **Add `'use client'`** directive if component uses hooks or event handlers
4. **Convert** `function` declarations to arrow functions with `FC<Props>` type
5. **Extract props type** as `type {ComponentName}Props = ...` above the component (internal use only)
6. **Replace** `import * as React from "react"` with named imports
7. **Replace** `React.ComponentProps` with `ComponentProps` (named import)
8. **Do NOT export internal implementation details** — props types and CVA variant constants (`buttonVariants`, etc.) are internal to the component file, not part of the public API. Only export the component(s) themselves.
9. **Format** with Biome (single quotes, tabs, trailing commas)
10. **Keep** `data-slot` attributes — shadcn adds these, they're part of the convention
11. **Keep** `radix-ui` imports — this is the correct primitive library for shadcn

## Compound Components (shadcn pattern)

shadcn generates compound components as individual named exports (not `Object.assign` namespacing). Keep this pattern for shadcn-sourced components:

```tsx
// shared/ui/dialog/dialog.tsx — shadcn compound pattern
const Dialog = DialogPrimitive.Root
const DialogTrigger = DialogPrimitive.Trigger
const DialogClose = DialogPrimitive.Close

const DialogContent: FC<DialogContentProps> = ({ className, children, ...props }) => (
    <DialogPortal>
        <DialogOverlay />
        <DialogPrimitive.Content
            data-slot="dialog-content"
            className={cn('fixed ...', className)}
            {...props}
        >
            {children}
        </DialogPrimitive.Content>
    </DialogPortal>
)

export { Dialog, DialogTrigger, DialogContent, DialogClose, /* ... */ }
```

Usage:
```tsx
import { Dialog, DialogTrigger, DialogContent, DialogTitle } from '@/shared/ui/dialog'

<Dialog>
    <DialogTrigger asChild>
        <Button variant="outline">Open</Button>
    </DialogTrigger>
    <DialogContent>
        <DialogTitle>Title</DialogTitle>
    </DialogContent>
</Dialog>
```

Custom project components follow the same flat named exports pattern.

## Styling Rules

- **Tailwind classes only** — no inline `style` props, no CSS modules, no styled-components
- **Semantic tokens** — use `bg-primary`, `text-foreground`, `border-border` (not raw colors like `bg-zinc-100`)
- **`cn()` for merging** — always use `cn()` from `@/shared/lib/cn`, never raw `clsx`
- **CVA for variants** — use `class-variance-authority` for components with multiple visual variants
- **No CSS variables in component code** — tokens are resolved via Tailwind's `@theme` in `globals.css`
- **`dark:` prefix** — use sparingly for dark-mode-specific overrides that semantic tokens don't cover
