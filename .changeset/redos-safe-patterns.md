---
"@bluprynt/forms-core": patch
---

Stop string `pattern` rules from causing catastrophic regex backtracking (ReDoS) on crafted definitions or values.

Definition checks:

- new `UNSAFE_REGEX` issue (stage 2) for a pattern that nests a repeating quantifier inside a repeated group, such as
  `^(a+)+$`, `(\w+\s?)*` or `(a{1,5})+`. `?`, `{0,1}` and `{n}` with n <= 1 do not count as repeating. Overlapping
  alternations such as `(a|a)*` are not detected;
- `stringValidation.pattern` holds at most 1000 characters (`SCHEMA_INVALID`, keyword `maxLength`). The published
  `@bluprynt/forms-core/schemas/form-definition.schema.json` carries the same limit;
- `INVALID_REGEX` and `UNSAFE_REGEX` now also check patterns in an `array` field's `item` (`itemId` is the `array`
  field id) and in `array_obj` sub-fields (`itemId` is the sub-field id). These patterns were not checked before, and an
  invalid one threw a `SyntaxError` during `validate`.

Value validation in `StringValidator`, which also covers `array` items and `array_obj` cells:

- when `MAX_LENGTH` fails, it is the only error; the pattern is not run and no `PATTERN` error is reported.
  `MIN_LENGTH` and `PATTERN` are still reported together;
- when `pattern` is set without `maxLength`, a value longer than 10000 characters fails `PATTERN` without running the
  regex, even if it would match.

When `FieldValidator` is called directly, bypassing `FormEngine`, `StringValidator` does not execute a pattern that
is longer than 1000 characters, invalid or unsafe; the value gets a `PATTERN` error. Compiled patterns are cached in a
bounded cache.

Definitions with nested-quantifier patterns or patterns longer than 1000 characters used to compile and now fail.
