---
"@bluprynt/forms-core": patch
---

Stop relative dates with a huge amount from crashing the engine. A definition with `minDate: "+999999999999999999d"`,
or the same string as a condition value, compiled, and then `validate`, `getVisibilityMap` and `sanitize` threw
`RangeError: Invalid time value`.

Definition checks:

- the amount of a relative date has 1 to 5 digits; the runtime pattern is `^[+-]\d{1,5}[dwmy]$`, and `"+99999y"` is
  still allowed;
- `minDate` / `maxDate` with a longer amount, such as `"+100000d"`, fail with `SCHEMA_INVALID`. The published
  `@bluprynt/forms-core/schemas/form-definition.schema.json` carries the same limit;
- new `INVALID_RELATIVE_DATE` issue (stage 2) for a simple condition `value` that is a string of the shape
  `[+-]<digits>[dwmy]` with more than 5 digits. It is checked inside `and` / `or` groups; array values of `in` / `notin`
  are not checked. `itemId` is the item that owns the condition, `params: { value }`.

Evaluation: when a relative date resolves outside the range of JS `Date`, which can happen when `now` or `submittedAt`
is near the limit (e.g. `+275760-09-13T00:00:00.000Z`), nothing throws:

- `minDate` / `maxDate` fail the value with `MIN_DATE` / `MAX_DATE`; the message and params carry the original
  expression, e.g. `Must be on or before +1d`, `params: { maxDate: '+1d' }`;
- conditions with `eq`, `ne`, `lt`, `gt`, `lte` or `gte` on that value evaluate to `false`, including `eq` against an
  empty field.

An invalid `options.now` still throws `RangeError` from `isVisible` and `getVisibilityMap` and yields `NOW_INVALID`
from `validate`.

Definitions with a relative date amount longer than 5 digits in `minDate`, `maxDate` or a condition value used to
compile and now fail.
