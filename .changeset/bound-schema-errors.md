---
"@bluprynt/forms-core": patch
---

Bound the cost of validating an invalid form definition. A small invalid definition could take seconds to minutes
of CPU while its schema errors were collected.

`FormDefinitionValidator.validateSchema()` now stops at the first failing path and reports the first violation it
meets (one or a few `SCHEMA_INVALID` issues) instead of every violation. Messages, deduplication and the suppression
of generic `oneOf` issues are unchanged.

`validateSchema()` now runs `validateLimits()` first and returns its `NESTING_DEPTH` / `DEFINITION_TOO_LARGE` issues
without running the schema check. `FormDefinitionEditor.validate()` therefore enforces the limits too.
`new FormEngine(definition)` behaves as before.

New limits:

- select / multiselect `options` entries count toward the 5000-node limit, on a field, an `array` field's `item`
  and `array_obj` sub-fields;
- every `options` array, every `array_obj` `items` array and the `value` array of an `in` / `notin` condition hold
  at most 1000 entries (`SCHEMA_INVALID`, keyword `maxItems`). The published
  `@bluprynt/forms-core/schemas/form-definition.schema.json` carries the same limits.

Definitions that exceed these limits used to compile and now fail.
