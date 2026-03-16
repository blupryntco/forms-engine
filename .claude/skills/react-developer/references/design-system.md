# Design System

The design system lives in `shared/ui/`. Components come from **shadcn/ui** (Radix UI primitives styled with Tailwind CSS + CVA). Custom components that don't exist in shadcn follow the same conventions. All components support light and dark themes through design tokens.

For shadcn-specific workflow (CLI install, post-install adaptation, compound pattern), see [shadcn.md](shadcn.md).

## Directory Structure

Each component gets its own folder with a barrel file:

```
shared/ui/
├── button/
│   ├── button.tsx
│   ├── button.stories.tsx
│   └── index.ts
├── dialog/
│   ├── dialog.tsx
│   ├── dialog.stories.tsx
│   └── index.ts
├── input/
│   ├── input.tsx
│   ├── input.stories.tsx
│   └── index.ts
└── tooltip/
    ├── tooltip.tsx
    ├── tooltip.stories.tsx
    └── index.ts
```

**Naming rules:**
- Folder name: kebab-case matching the component concept (`text-input`, `date-picker`)
- Component file: kebab-case matching the folder (`text-input.tsx`)
- Barrel: `index.ts` re-exports the component and its props type
- Story: `<component-name>.stories.tsx` co-located in the same folder
- No top-level `shared/ui/index.ts` barrel — import from individual folders

```tsx
// shared/ui/button/index.ts
export { Button, type ButtonProps } from './button'
```

```tsx
// Importing a design system component
import { Button } from '@/shared/ui/button'   // correct
import { Button } from '@/shared/ui'           // wrong — no barrel
```

## Design Tokens

All tokens defined via Tailwind CSS v4 `@theme` in `app/globals.css`. Components reference tokens through Tailwind utility classes — never raw CSS variables in component code.

```css
/* app/globals.css */
@import 'tailwindcss';

@theme {
    /* Tokens defined at runtime — check app/globals.css for current values.
       Semantic token categories: colors (with foreground pairs), radius, typography, shadows, animations. */
}
```

**Token naming:**
- Semantic names (`--color-primary`, `--color-destructive`) not raw palette values
- Foreground token paired with every background token (`--color-card` / `--color-card-foreground`)
- OKLCH color space for perceptual uniformity

## Dark Theme

Dark mode via `next-themes` with the `dark:` Tailwind prefix. Override semantic tokens for the `.dark` class:

```css
/* app/globals.css — after @theme */
@custom-variant dark (&:is(.dark *));

.dark {
    /* Override semantic tokens for dark theme — values defined at runtime in app/globals.css */
}
```

**Rules:**
- Every component must render correctly in both themes — verify during development
- Use semantic token classes (`bg-card`, `text-foreground`, `border-border`) not raw colors (`bg-zinc-100`)
- Dark overrides live in the same CSS file as the light tokens
- Use `dark:` prefix sparingly — semantic tokens handle most cases automatically

## Component Authoring

### shadcn Components (preferred)

Most UI primitives should come from shadcn/ui. shadcn wraps Radix UI primitives with Tailwind styling and provides accessible, composable components out of the box. See [shadcn.md](shadcn.md) for the full install-and-adapt workflow.

After installation, shadcn components use `radix-ui` imports for primitives and `data-slot` attributes for styling hooks:

```tsx
// shared/ui/tooltip/tooltip.tsx
'use client'

import { type ComponentProps, type FC } from 'react'
import { Tooltip as TooltipPrimitive } from 'radix-ui'

import { cn } from '@/shared/lib/cn'

type TooltipContentProps = ComponentProps<typeof TooltipPrimitive.Content>

const TooltipContent: FC<TooltipContentProps> = ({ className, sideOffset = 4, ...props }) => (
    <TooltipPrimitive.Portal>
        <TooltipPrimitive.Content
            data-slot="tooltip-content"
            sideOffset={sideOffset}
            className={cn('rounded-md bg-primary px-3 py-1.5 text-xs text-primary-foreground shadow-md animate-in fade-in-0 zoom-in-95', className)}
            {...props}
        />
    </TooltipPrimitive.Portal>
)

export { TooltipContent }
```

### State-Based Styling with `data-*`

Radix UI exposes component state via `data-*` attributes. Style these with Tailwind's attribute selectors instead of conditional classes:

```tsx
<DialogPrimitive.Overlay
    className="fixed inset-0 bg-black/80 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0"
/>
```

Common Radix data attributes: `data-state="open|closed"`, `data-disabled`, `data-side`, `data-align`.

### Component Checklist

When creating a design system component:

1. **Check shadcn first**: If the component exists in shadcn, install via CLI and adapt → [shadcn.md](shadcn.md)
2. **Folder**: `shared/ui/<component-name>/`
3. **Component file**: `<component-name>.tsx` — arrow function, named export, `FC<Props>`
4. **Props**: Accept `className` for consumer overrides; extend `ComponentProps<'element'>` when wrapping native elements
5. **Styling**: CVA for variants, `cn()` for class merging, semantic token classes only
6. **`data-slot`**: Add `data-slot="<component-name>"` to root element
7. **`'use client'`**: Add directive if component uses hooks or event handlers
8. **Barrel**: `index.ts` exports component + props type
9. **Storybook**: `<component-name>.stories.tsx` with stories covering all variants, states, and both themes
10. **Dark mode**: Verify rendering in both light and dark themes

### Compound Components

All compound components (shadcn-sourced and custom) use individual named exports with a shared prefix:

```tsx
// shared/ui/card/card.tsx
const Card: FC<CardProps> = ({ className, ...props }) => (
    <div data-slot="card" className={cn('rounded-lg border bg-card text-card-foreground shadow-sm', className)} {...props} />
)

const CardHeader: FC<ComponentProps<'div'>> = ({ className, ...props }) => (
    <div data-slot="card-header" className={cn('flex flex-col gap-1.5 p-6', className)} {...props} />
)

const CardTitle: FC<ComponentProps<'h3'>> = ({ className, ...props }) => (
    <h3 data-slot="card-title" className={cn('text-lg font-semibold leading-none', className)} {...props} />
)

const CardContent: FC<ComponentProps<'div'>> = ({ className, ...props }) => (
    <div data-slot="card-content" className={cn('p-6 pt-0', className)} {...props} />
)

export { Card, CardHeader, CardTitle, CardContent, type CardProps }
```

```tsx
// Usage
<Card>
    <CardHeader>
        <CardTitle>Title</CardTitle>
    </CardHeader>
    <CardContent>Body</CardContent>
</Card>
```

Always use flat named exports with a shared prefix (`Card`, `CardHeader`, `CardTitle`, etc.). This matches the shadcn convention and keeps imports explicit.

## Storybook

See [storybook.md](storybook.md) for story file structure, title hierarchy by FSD layer, dark mode verification, and interaction/composition stories.
