---
'@bluprynt/forms-builder': minor
'@bluprynt/forms-viewer': minor
'@bluprynt/forms-core': minor
---

Add `static` and `multiselect` field types.

`static` is a display-only text block: it carries a required `text` property (and an optional `label`),
renders inside the form, honours its own `condition`, but holds no value. It never appears in `values`,
carries no `validation`, produces no validation errors, and cannot be referenced by another item's
condition (`CONDITION_REFS_STATIC`).

`multiselect` is `select` with any number of choices. Its value is an array of the chosen options' values,
validated with `required` (an absent value and an empty array both fail) plus an option-membership check.
In conditions its operators are set-oriented: `set` means at least one option chosen, `eq`/`ne` compare the
selection as a set, and `in`/`notin` test whether any chosen option appears in the given list. `array`
fields keep their existing scalar condition semantics.

Core gains `FormDefinitionEditor.setText()`, widens `setOptions()` to accept `multiselect`, and exports
`StaticFieldContentItem`, `AnyFieldContentItem` and `MultiselectValidation`. The viewer gains the optional
component-map keys `static` and `multiselect` with `StaticViewProps` / `StaticEditProps` /
`MultiselectViewProps` / `MultiselectEditProps`, and no longer throws when a field's component is missing.
The published JSON schema gained `staticField`, `multiselectField` and `multiselectValidation` `$defs`.

Data compatibility is unaffected: existing definitions and documents validate unchanged, with no `version`
bump. Three **type-level** breaks reach code that walks the definition tree itself — `ContentItem` now
includes `StaticFieldContentItem`, `FieldContentItem['type']` excludes `'static'`, and the builder's
`FieldRenderProps.item` widened to `AnyFieldContentItem` so `item.label` is `string | undefined`. Viewer and
editor component-map props are unchanged. See `CHANGES.md` §3.6.
