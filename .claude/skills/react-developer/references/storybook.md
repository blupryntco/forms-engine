# Storybook

Storybook is used exclusively for design system components in `shared/ui/`. Stories are co-located with components — each component folder contains its own `*.stories.tsx` file.

## Story File Structure

```tsx
// shared/ui/button/button.stories.tsx
import type { Meta, StoryObj } from '@storybook/react'
import { Button } from './button'

export default {
    title: 'Design System/Button',
    component: Button,
    args: { children: 'Click me' },
    argTypes: {
        variant: { control: 'select', options: ['primary', 'secondary', 'ghost', 'destructive'] },
        size: { control: 'select', options: ['sm', 'md', 'lg'] },
    },
} satisfies Meta<typeof Button>

type Story = StoryObj<typeof Button>

export const Primary: Story = { args: { variant: 'primary' } }
export const Destructive: Story = { args: { variant: 'destructive' } }
export const Ghost: Story = { args: { variant: 'ghost' } }
export const Small: Story = { args: { size: 'sm' } }
export const Large: Story = { args: { size: 'lg' } }
export const Disabled: Story = { args: { disabled: true } }
```

## Title Convention

All stories use the `Design System/<ComponentName>` title pattern:

```tsx
title: 'Design System/Button'
title: 'Design System/Dialog'
title: 'Design System/TextInput'
```

## Conventions

- **File naming**: `<component-name>.stories.tsx` — co-located in the component's folder
- **`satisfies Meta`**: Always type the default export with `satisfies Meta<typeof Component>`
- **`StoryObj`**: Type alias `type Story = StoryObj<typeof Component>` for story definitions
- **One story per meaningful variant/state**: Cover each CVA variant, disabled, loading, empty, and error states
- **`argTypes` for CVA variants**: Map variant options to Storybook controls (`control: 'select'`)
- **Default `args`**: Set sensible defaults so stories render without configuration
- **Named exports only**: Each story is a named export (`Primary`, `Disabled`, etc.) — no default export for stories themselves

## Dark Mode Verification

All stories must render correctly in both light and dark themes. Use Storybook's dark mode addon (`storybook-dark-mode`) to toggle themes during development.

```tsx
// For components that need explicit theme-specific stories
export const DarkMode: Story = {
    parameters: { backgrounds: { default: 'dark' } },
    decorators: [(Story) => <div className="dark"><Story /></div>],
}
```
