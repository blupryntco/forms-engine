---
"@bluprynt/forms-core": minor
"@bluprynt/forms-viewer": minor
---

Hide sections that have no visible value field beneath them.

**Behaviour change.** `getVisibilityMap` and `isVisible` now return `false` for a section with no visible
value field (any type except `section` and `static`) at any depth — an empty section, a `static`-only section,
or one whose fields and child sections are all hidden — and for every item inside it, `static` blocks
included. `getAffectedIds(fieldId)` now also returns the ancestor sections of the affected items, since a
section's visibility follows its content. Consumers that read the visibility map for progress or completion
UI will see fewer visible sections. Validation is unaffected.

The viewer and editor no longer render such sections. In `FormSections` an empty top-level section gets no
tab, and the "General" group appears only when a top-level value field is visible — `static` blocks alone no
longer create it. `DEFAULT` section resolution follows the same rule.
