---
"@bluprynt/forms-core": patch
---

Stop `FormDefinitionEditor` update methods from overwriting `id`, `type` or an item's prototype.

`updateField`, `updateSection` and `updateArrayItemField` no longer use `Object.assign`. Each copies only the own keys
its item type declares and silently ignores the rest, including `id`, `type`, a section's `content`, `__proto__`,
`constructor` and keys of another item type. Before, a JSON payload could replace an item's `type` or `content`, or
set an own `__proto__` key that swapped the item's prototype. Merge semantics are unchanged: an omitted key is kept,
and an allowed key passed as `undefined` is cleared on serialization.

`updateArrayItemField` can no longer change a sub-field's `type`; its `patch` parameter type now omits `id` and `type`.
The new `FormDefinitionEditor.validate()` checks the current definition against the JSON Schema and returns
`SCHEMA_INVALID` issues. Semantic checks still run when `FormEngine` compiles the definition.
