# Color Tokens

All color tokens are defined in `apps/compliance-web/app/globals.css` using OKLCH color space inside `@theme inline`. Dark mode overrides live in the `.dark` class in the same file. Components use **semantic tokens** via Tailwind classes — never reference generic palette variables directly.

## General UI Tokens

These map 1:1 to Figma design tokens:

| Tailwind class       | CSS variable              | Usage                            |
|----------------------|---------------------------|----------------------------------|
| `text-dark`          | `--color-text-dark`       | Primary text color               |
| `text-light`         | `--color-text-light`      | Secondary/muted text             |
| `highlight`          | `--color-highlight`       | Highlighted/selected surfaces    |
| `background`         | `--color-background`      | Page background                  |
| `border`             | `--color-border`          | Default border color             |
| `brand-blue`         | `--color-brand-blue`      | Primary brand accent             |
| `white`              | `--color-white`           | Card surfaces                    |
| `white-on-white`     | `--color-white-on-white`  | Nested white-on-white elements   |

### Tailwind usage

```tsx
<div className="bg-background text-text-dark border-border" />
<p className="text-text-light" />
<div className="bg-white border border-border" />
<button className="bg-brand-blue text-white" />
<div className="bg-highlight" />
```

## Status Tokens

Each application/credential status has three tokens for different UI contexts:

| Status           | Text (label color)          | Surface (badge/row bg)               | Chart (donut/bar)                 |
|------------------|-----------------------------|--------------------------------------|-----------------------------------|
| Pending Review   | `pending-review`            | `pending-review-surface`             | `pending-review-chart`            |
| In Review        | `in-review`                 | `in-review-surface`                  | `in-review-chart`                 |
| Request for Info | `request-for-info`          | `request-for-info-surface`           | `request-for-info-chart`          |
| Active           | `active`                    | `active-surface`                     | `active-chart`                    |
| Denied           | `denied`                    | `denied-surface`                     | `denied-chart`                    |
| Escalated        | `escalated`                 | `escalated-surface`                  | `escalated-chart`                 |
| Archived         | `archived`                  | `archived-surface`                   | `archived-chart`                  |

### Status badge pattern

```tsx
<span className="bg-pending-review-surface text-pending-review px-2 py-0.5 rounded-md text-sm">
    Pending Review
</span>

<span className="bg-active-surface text-active px-2 py-0.5 rounded-md text-sm">
    Active
</span>

<span className="bg-denied-surface text-denied px-2 py-0.5 rounded-md text-sm">
    Denied
</span>
```

### Chart colors

```tsx
const STATUS_CHART_COLORS = {
    pendingReview: 'var(--color-pending-review-chart)',
    inReview: 'var(--color-in-review-chart)',
    requestForInfo: 'var(--color-request-for-info-chart)',
    active: 'var(--color-active-chart)',
    denied: 'var(--color-denied-chart)',
    escalated: 'var(--color-escalated-chart)',
    archived: 'var(--color-archived-chart)',
} as const
```

## Dark Mode

Dark theme overrides are automatic — semantic tokens resolve to inverted palette values in `.dark` class. No extra work needed in components.
