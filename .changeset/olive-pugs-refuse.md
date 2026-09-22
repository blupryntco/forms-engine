---
'@bluprynt/forms-builder': minor
'@bluprynt/forms-viewer': minor
'@bluprynt/forms-core': minor
---

Add authoring metadata and AI suggestions.

Fields, sections and array item definitions accept three new optional properties: `placeholder`,
`answer_guidelines` and `reference_id`. Form documents accept an optional `suggestions` block next to
`values`, holding `{ value, confidence, source }` entries keyed by field id, which the editor can accept
(copied into the value, suggestion kept) or reject (removed, value untouched).

Core gains the pure helpers `getSuggestion` / `getSuggestions` / `setSuggestion` / `removeSuggestion` /
`applySuggestion`, the `FormValuesEditor` suggestion methods, and the `FormDefinitionEditor` setters
`setPlaceholder` / `setAnswerGuidelines` / `setReferenceId`. The viewer passes `suggestion` to field
components and `onAcceptSuggestion` / `onRejectSuggestion` to editable ones.

Fully backward compatible: every addition is optional, existing definitions and documents work unchanged,
and no `version` bump is needed. See `CHANGES.md` for what to update in consuming apps.
