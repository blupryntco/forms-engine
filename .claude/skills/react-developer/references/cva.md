# CVA (Class Variance Authority)

CVA is the primary approach for building variant-based components. It produces a function that maps variant props to Tailwind class strings — keeping styling declarative and type-safe.

## Basic Usage

```tsx
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/shared/lib/cn'

const badgeVariants = cva(
    'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
    {
        variants: {
            variant: {
                default: 'border-transparent bg-primary text-primary-foreground',
                secondary: 'border-transparent bg-secondary text-secondary-foreground',
                destructive: 'border-transparent bg-destructive text-destructive-foreground',
                outline: 'text-foreground',
            },
        },
        defaultVariants: {
            variant: 'default',
        },
    },
)
```

Call the resulting function with variant props + optional `className` for consumer overrides:

```tsx
badgeVariants({ variant: 'destructive' })
// → resolves to the merged class string

badgeVariants({ variant: 'secondary', className: 'ml-2' })
// → appends ml-2 to the result
```

## Variant Types

### String Variants

Most common. Each key maps to a set of Tailwind classes:

```tsx
variants: {
    intent: {
        primary: 'bg-primary text-primary-foreground hover:bg-primary/90',
        secondary: 'bg-secondary text-secondary-foreground hover:bg-secondary/90',
        ghost: 'hover:bg-accent hover:text-accent-foreground',
    },
    size: {
        sm: 'h-8 px-3 text-xs',
        md: 'h-9 px-4 text-sm',
        lg: 'h-10 px-6 text-base',
        icon: 'h-9 w-9 p-0',
    },
}
```

### Boolean Variants

Use `true`/`false` keys. Useful for toggling visual states:

```tsx
variants: {
    disabled: {
        true: 'opacity-50 cursor-not-allowed pointer-events-none',
        false: null,  // null = no additional classes
    },
    fullWidth: {
        true: 'w-full',
        false: null,
    },
}
```

Set `false` to `null` when no classes are needed for the falsy state.

### Array Syntax for Classes

Both strings and arrays work — arrays improve readability for long class lists:

```tsx
variants: {
    intent: {
        primary: [
            'bg-primary',
            'text-primary-foreground',
            'border-transparent',
            'hover:bg-primary/90',
        ],
    },
}
```

## Compound Variants

Apply classes when multiple variant conditions are met simultaneously. Useful for combinations that need special treatment beyond what individual variants provide:

```tsx
compoundVariants: [
    // When intent=primary AND size=lg → add uppercase
    {
        intent: 'primary',
        size: 'lg',
        class: 'uppercase tracking-wide',
    },
    // When intent=ghost AND disabled=true → reduce opacity further
    {
        intent: 'ghost',
        disabled: true,
        class: 'opacity-30',
    },
],
```

### Targeting Multiple Values

A single compound rule can match against multiple variant values using arrays:

```tsx
compoundVariants: [
    {
        intent: ['primary', 'secondary'],
        size: 'sm',
        class: 'font-medium',
    },
],
```

This applies when `size` is `'sm'` AND `intent` is either `'primary'` or `'secondary'`.

## Default Variants

Always set `defaultVariants` so the component renders correctly without any variant props:

```tsx
defaultVariants: {
    intent: 'primary',
    size: 'md',
    disabled: false,
},
```

## TypeScript Integration

### Extracting Variant Props with `VariantProps`

Use `VariantProps<typeof variantsFn>` to derive the type from the CVA definition — keeps props and variant config in sync automatically:

```tsx
import { cva, type VariantProps } from 'class-variance-authority'

const buttonVariants = cva('...', { variants: { intent: { ... }, size: { ... } } })

type ButtonVariantProps = VariantProps<typeof buttonVariants>
// → { intent?: 'primary' | 'secondary' | 'ghost' | null; size?: 'sm' | 'md' | 'lg' | null }
```

All variant props are optional (because `defaultVariants` covers them). If a variant must be required, use the required variants pattern below.

### Required Variants

CVA intentionally makes all variants optional. Use TypeScript utility types to enforce required props:

```tsx
type ButtonVariantProps = VariantProps<typeof buttonVariants>

type ButtonProps = ComponentProps<'button'>
    & Omit<ButtonVariantProps, 'intent'>
    & Required<Pick<ButtonVariantProps, 'intent'>>
    & { asChild?: boolean }
```

This makes `intent` required while keeping other variants optional.

## Full Component Example

Complete pattern for a design system component using CVA + React + Tailwind:

```tsx
// shared/ui/button/button.tsx
'use client'

import { type ComponentProps, type FC } from 'react'
import { Slot } from 'radix-ui'
import { cva, type VariantProps } from 'class-variance-authority'

import { cn } from '@/shared/lib/cn'

const buttonVariants = cva(
    'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50',
    {
        variants: {
            variant: {
                default: 'bg-primary text-primary-foreground shadow hover:bg-primary/90',
                destructive: 'bg-destructive text-destructive-foreground shadow-sm hover:bg-destructive/90',
                outline: 'border border-input bg-background shadow-sm hover:bg-accent hover:text-accent-foreground',
                secondary: 'bg-secondary text-secondary-foreground shadow-sm hover:bg-secondary/80',
                ghost: 'hover:bg-accent hover:text-accent-foreground',
                link: 'text-primary underline-offset-4 hover:underline',
            },
            size: {
                sm: 'h-8 rounded-md px-3 text-xs',
                md: 'h-9 px-4 py-2',
                lg: 'h-10 rounded-md px-8',
                icon: 'h-9 w-9',
            },
        },
        defaultVariants: {
            variant: 'default',
            size: 'md',
        },
    },
)

type ButtonProps = ComponentProps<'button'>
    & VariantProps<typeof buttonVariants>
    & { asChild?: boolean }

const Button: FC<ButtonProps> = ({
    className,
    variant,
    size,
    asChild = false,
    ...props
}) => {
    const Comp = asChild ? Slot.Root : 'button'
    return (
        <Comp
            data-slot="button"
            className={cn(buttonVariants({ variant, size, className }))}
            {...props}
        />
    )
}

export { Button, buttonVariants, type ButtonProps }
```

Key points in this example:
- `buttonVariants` is exported so other components can reuse the same styles (e.g., link styled as button)
- `className` is passed **into** the CVA call — `cn()` wraps the result to resolve Tailwind conflicts with consumer overrides
- `VariantProps` intersected with `ComponentProps<'button'>` gives consumers full native prop support
- `asChild` + `Slot` enables render delegation

## Rules

1. Define `*Variants` const adjacent to its component (same file)
2. Use `VariantProps<typeof variantsFn>` for prop types — never manually duplicate variant types
3. Pass `className` as last arg to the CVA call so consumer classes override component defaults
4. Always wrap CVA output with `cn()` — ensures Tailwind conflict resolution
5. Always set `defaultVariants` for every variant dimension
6. Use `compoundVariants` for combination-specific styles instead of conditional logic in JSX
7. Export the variants function alongside the component when reuse is expected
8. Use semantic token classes (`bg-primary`, `text-foreground`) not raw colors (`bg-blue-500`)
