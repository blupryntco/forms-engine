---
"@bluprynt/forms-core": patch
---

Reject oversized or deeply nested form definitions with a `DocumentError` instead of a stack overflow.

`new FormEngine(definition)` now checks limits first, with `FormDefinitionValidator.validateLimits()`, before the
JSON schema check. The walk uses an explicit stack, so a definition nested thousands of levels deep no longer
crashes with a `RangeError`. Limits:

- sections nest at most 3 levels, as before (`NESTING_DEPTH`);
- `and` / `or` groups nest at most 16 levels inside one condition (`NESTING_DEPTH`);
- a definition holds at most 5000 nodes, counting content items, `array_obj` sub-fields and condition nodes
  (new `DEFINITION_TOO_LARGE` code);
- an `and` / `or` group holds at most 100 conditions (`SCHEMA_INVALID`, keyword `maxItems`).

Any other `RangeError` thrown while compiling the definition becomes a `DocumentError` with `DEFINITION_TOO_LARGE`.
Definitions that exceed these limits used to compile and now fail.
