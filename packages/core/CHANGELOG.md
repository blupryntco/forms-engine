# @bluprynt/forms-core

## 4.2.2

### Patch Changes

- [#25](https://github.com/blupryntco/forms-engine/pull/25) [`dd2bc14`](https://github.com/blupryntco/forms-engine/commit/dd2bc140579c6253ec6ce2913c8901cc2e6174c4) Thanks [@sergeyzwezdin](https://github.com/sergeyzwezdin)! - Stop relative dates with a huge amount from crashing the engine. A definition with `minDate: "+999999999999999999d"`,
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

- [#22](https://github.com/blupryntco/forms-engine/pull/22) [`ddba7aa`](https://github.com/blupryntco/forms-engine/commit/ddba7aa6ae4fccf30529cd938e5736f79f5c961d) Thanks [@sergeyzwezdin](https://github.com/sergeyzwezdin)! - Bound the cost of validating an invalid form definition. A small invalid definition could take seconds to minutes
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

- [#23](https://github.com/blupryntco/forms-engine/pull/23) [`8cdc266`](https://github.com/blupryntco/forms-engine/commit/8cdc266d9a71b849d0f6316d0881299747ec942c) Thanks [@sergeyzwezdin](https://github.com/sergeyzwezdin)! - Stop string `pattern` rules from causing catastrophic regex backtracking (ReDoS) on crafted definitions or values.
  
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

## 4.2.1

### Patch Changes

- [#20](https://github.com/blupryntco/forms-engine/pull/20) [`2afa646`](https://github.com/blupryntco/forms-engine/commit/2afa646e6e77b18b5898185724d126806b270ca3) Thanks [@sergeyzwezdin](https://github.com/sergeyzwezdin)! - Reject oversized or deeply nested form definitions with a `DocumentError` instead of a stack overflow.
  
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

- [#20](https://github.com/blupryntco/forms-engine/pull/20) [`2afa646`](https://github.com/blupryntco/forms-engine/commit/2afa646e6e77b18b5898185724d126806b270ca3) Thanks [@sergeyzwezdin](https://github.com/sergeyzwezdin)! - Stop `FormDefinitionEditor` update methods from overwriting `id`, `type` or an item's prototype.
  
  `updateField`, `updateSection` and `updateArrayItemField` no longer use `Object.assign`. Each copies only the own keys
  its item type declares and silently ignores the rest, including `id`, `type`, a section's `content`, `__proto__`,
  `constructor` and keys of another item type. Before, a JSON payload could replace an item's `type` or `content`, or
  set an own `__proto__` key that swapped the item's prototype. Merge semantics are unchanged: an omitted key is kept,
  and an allowed key passed as `undefined` is cleared on serialization.
  
  `updateArrayItemField` can no longer change a sub-field's `type`; its `patch` parameter type now omits `id` and `type`.
  The new `FormDefinitionEditor.validate()` checks the current definition against the JSON Schema and returns
  `SCHEMA_INVALID` issues. Semantic checks still run when `FormEngine` compiles the definition.

- [#20](https://github.com/blupryntco/forms-engine/pull/20) [`2afa646`](https://github.com/blupryntco/forms-engine/commit/2afa646e6e77b18b5898185724d126806b270ca3) Thanks [@sergeyzwezdin](https://github.com/sergeyzwezdin)! - Add a way to strip values the form definition does not accept.
  
  `validate` used to ignore values outside the visible fields, so a client could attach arbitrary data to a document
  and consumers stored it. `FormEngine.sanitize(doc, options?)` returns a copy of the document without unknown
  `values` keys, values on `section` and `static` ids, values of hidden fields, and undeclared keys in `array_obj` rows.
  `suggestions` is cleaned by the same rules. `FormValuesEditor.sanitize(options?)` does the same to the editor's
  document. Servers should persist `engine.sanitize(doc, { now: new Date() })`. Hidden values are dropped for good, so
  sanitize on save or submit, not on every edit.
  
  `EvaluationOptions` gets a `strict` flag, read by `validate` only. With `strict: true`, each value `sanitize` would
  remove from `values` becomes one of the new document errors `UNKNOWN_VALUE_KEY`, `NON_VALUE_ITEM_VALUE`,
  `HIDDEN_FIELD_VALUE` or `UNKNOWN_ROW_KEY`, and `valid` is `false`. Without `strict`, behaviour is unchanged.

- [#20](https://github.com/blupryntco/forms-engine/pull/20) [`2afa646`](https://github.com/blupryntco/forms-engine/commit/2afa646e6e77b18b5898185724d126806b270ca3) Thanks [@sergeyzwezdin](https://github.com/sergeyzwezdin)! - Let the caller set a trusted reference time for relative dates.
  
  `FormEngine.validate`, `isVisible` and `getVisibilityMap` (and the matching `FormValuesEditor` methods) take an
  optional `EvaluationOptions` argument. When `options.now` is set, relative dates such as `"+7d"` in `minDate`,
  `maxDate` and condition values resolve against it instead of `doc.form.submittedAt`. The client controls
  `submittedAt`, so server-side validation should pass `{ now: new Date() }`. Without options, behaviour is unchanged.
  
  `submittedAt` is still required and checked when `now` is passed. An invalid `now` makes `validate` return the new
  `NOW_INVALID` document error; `isVisible` and `getVisibilityMap` throw a `RangeError`.

## 4.2.0

### Minor Changes

- [#18](https://github.com/blupryntco/forms-engine/pull/18) [`4b608af`](https://github.com/blupryntco/forms-engine/commit/4b608afaaf3b25ee018be900cc5fceea21a88288) Thanks [@sergeyzwezdin](https://github.com/sergeyzwezdin)! - Hide sections that have no visible value field beneath them.
  
  **Behaviour change.** `getVisibilityMap` and `isVisible` now return `false` for a section with no visible
  value field (any type except `section` and `static`) at any depth — an empty section, a `static`-only section,
  or one whose fields and child sections are all hidden — and for every item inside it, `static` blocks
  included. `getAffectedIds(fieldId)` now also returns the ancestor sections of the affected items, since a
  section's visibility follows its content. Consumers that read the visibility map for progress or completion
  UI will see fewer visible sections. Validation is unaffected.
  
  The viewer and editor no longer render such sections. In `FormSections` an empty top-level section gets no
  tab, and the "General" group appears only when a top-level value field is visible — `static` blocks alone no
  longer create it. `DEFAULT` section resolution follows the same rule.

### Patch Changes

- [#16](https://github.com/blupryntco/forms-engine/pull/16) [`99ad24b`](https://github.com/blupryntco/forms-engine/commit/99ad24b7a8e07dcf46bb16be19d0d41fddeb7ee3) Thanks [@sergeyzwezdin](https://github.com/sergeyzwezdin)! - Dependencies update

## 4.1.0

### Minor Changes

- [#14](https://github.com/blupryntco/forms-engine/pull/14) [`f342da1`](https://github.com/blupryntco/forms-engine/commit/f342da15a9bc0b169dcda1d1e98a5cf556884eb8) Thanks [@sergeyzwezdin](https://github.com/sergeyzwezdin)! - Add `blockchain` and `sustainability` field types.

  `blockchain` holds a CAIP address identifying an on-chain asset. Its value is a plain string and its only
  validation rule is `required`: the address format is **deliberately** never checked, so there is no
  `pattern` rule and no CAIP-specific error code. It behaves exactly like `string` in storage and in
  conditions — it exists as its own type so a UI can render a chain/address control rather than a bare text
  box. No dependency on `@blupryntco/caip-tools` was added; `@bluprynt/forms-core` still has no runtime
  dependencies.

  `sustainability` holds `{ address, ccri, cmc }` — a CAIP address plus optional CCRI and CoinMarketCap
  references. Its only validation rule is `required`, satisfied by `address` alone: a filled `ccri` with a
  blank `address` still fails with `REQUIRED`, while `{ address: '…', ccri: '', cmc: '' }` passes. A missing
  `address` key reads as an empty address rather than a type error. A non-object value, or a property that is
  not a string, produces `TYPE`. There is no per-property error channel, so the field yields at most one
  field-level error. In conditions it follows the existing `file` precedent: only `set` and `notset` are
  meaningful, any object present counts as `set` — including an all-blank one — and `eq`/`ne`/`in`/`notin`
  compare by reference and never match.

  Both types are legal `array` item types, like `file`. Core exports `SustainabilityValue`,
  `BlockchainValidation` and `SustainabilityValidation`; the published JSON schema gained `blockchainField`,
  `sustainabilityField`, `blockchainValidation`, `sustainabilityValidation`, `arrayItemBlockchain` and
  `arrayItemSustainability` `$defs`. The viewer gains the optional component-map keys `blockchain` and
  `sustainability` with `BlockchainViewProps` / `BlockchainEditProps` / `SustainabilityViewProps` /
  `SustainabilityEditProps`. `@bluprynt/forms-builder` needs no new API — both are ordinary fields.

  Nothing breaks. Existing definitions and documents validate unchanged, with no `version` bump; the schema
  additions are new `oneOf` variants only. There are **no type-level breaks this time**: neither type narrows
  or widens an existing union, and both are ordinary `FieldContentItem`s with a required `label`. The two new
  component-map keys are optional, so existing maps keep compiling. See `CHANGES.md` §1.4, §2.4 and §3.5.

- [#14](https://github.com/blupryntco/forms-engine/pull/14) [`f342da1`](https://github.com/blupryntco/forms-engine/commit/f342da15a9bc0b169dcda1d1e98a5cf556884eb8) Thanks [@sergeyzwezdin](https://github.com/sergeyzwezdin)! - Add `static` and `multiselect` field types.

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

- [#14](https://github.com/blupryntco/forms-engine/pull/14) [`f342da1`](https://github.com/blupryntco/forms-engine/commit/f342da15a9bc0b169dcda1d1e98a5cf556884eb8) Thanks [@sergeyzwezdin](https://github.com/sergeyzwezdin)! - Add authoring metadata and AI suggestions.

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

- [#14](https://github.com/blupryntco/forms-engine/pull/14) [`f342da1`](https://github.com/blupryntco/forms-engine/commit/f342da15a9bc0b169dcda1d1e98a5cf556884eb8) Thanks [@sergeyzwezdin](https://github.com/sergeyzwezdin)! - Add the `array_obj` field type — a list of rows, where every row holds one value per sub-field.

  Where an `array` field carries a single `item` definition and stores a list of scalars, an `array_obj`
  carries `items` (an ordered list of sub-field definitions, at least one) and stores a list of row objects.
  Each sub-field declares its own `id`, drawn from the same globally unique id space as top-level fields;
  that id is the key its value takes inside every row:

  ```jsonc
  { "id": 12, "type": "array_obj", "label": "Directors",
    "items": [
      { "id": 121, "type": "string", "label": "Name", "validation": { "required": true } },
      { "id": 122, "type": "date",   "label": "Appointed" }
    ],
    "validation": { "minItems": 1, "maxItems": 20 } }

  values["12"] = [{ "121": "Jane Roe", "122": "2024-01-05T00:00:00.000Z" }, { "121": "John Doe" }]
  ```

  `array` is untouched: its `item` property, its values and its condition semantics are exactly as before,
  and nothing needs re-generating or a `version` bump.

  **Validation.** `minItems` / `maxItems` count rows; every sub-field is validated in every row. A sub-field
  error keeps the container's `fieldId` — matching the key it is stored under in `fieldErrors` — and carries
  `itemIndex` (the row) plus the new `itemFieldId` (the sub-field), with the sub-field's label prefixed onto
  the message. An absent row reads as an empty one, so its `required` sub-fields still report; a row that is
  present but is not an object yields one row-level `TYPE` carrying `itemIndex` only.

  **Conditions.** An `array_obj` field keeps scalar semantics, exactly like `array`: only `set` / `notset`
  say anything useful, and `set` is `true` for an empty list. A sub-field id may **not** be referenced by a
  condition — its value is per-row — and the engine now rejects such a definition with the new
  `CONDITION_REFS_ARRAY_OBJ_ITEM` code. Sub-fields carry no `condition` of their own.

  **Layout hint.** An `array_obj` field also accepts an optional `kind` of `'list'` or `'table'`, `'list'`
  when absent. It is presentation metadata in the spirit of `placeholder` and `answer_guidelines`: the engine
  never reads it, and it affects neither values, validation nor visibility. The viewer delivers it to the
  component **already resolved**, as the `kind` prop, so no component repeats the default; honouring it is up
  to the component.

  **Core API.** `FormDefinitionEditor` gains `getArrayItems`, `setArrayItems`, `setArrayKind`,
  `addArrayItemField`, `updateArrayItemField`, `removeArrayItemField` and `moveArrayItemField`; `nextId()` and the duplicate-id
  check now count sub-field ids, so a new top-level field can never collide with one. `FormValuesEditor`
  accepts `array_obj` in `addArrayItem` / `removeArrayItem` / `moveArrayItem` / `setArrayItem` (an added row
  defaults to `{}`, not `undefined`) and gains `getArrayObjValue` / `setArrayObjValue` /
  `clearArrayObjValue` for writing one cell. New exported types: `ArrayObjItemDef`, `ArrayObjKind`, `ArrayObjRow`,
  `ArrayObjValidation`, `ValueArrayObjItemDef`, `StaticArrayObjItemDef`, plus `ValueArrayItemDef` and
  `StaticArrayItemDef`.

  **Viewer.** `ViewerComponentMap` and `EditorComponentMap` gain an **optional** `array_obj` key, so existing
  maps keep compiling and an unmapped `array_obj` renders nothing. `ArrayObjViewProps` / `ArrayObjEditProps`
  carry `itemsDef`, the resolved `kind` and `children: ReactNode[][]` — indexed `children[rowIndex][subFieldIndex]` and aligned
  with `itemsDef`, so rows can be laid out as a table — and the edit props add the familiar `onAddItem` /
  `onRemoveItem` / `onMoveItem`. The per-cell `onChange` arrives on each sub-field's own component.

  **`array` items widened.** `array.item` now also accepts `multiselect` and `static`, which makes
  `ArrayItemDef` a union: `itemDef.label` is now `string | undefined` for consumers of `ArrayViewProps` /
  `ArrayEditProps`. An array of `static` items is degenerate — it holds no values and its length alone drives
  how many blocks render — and is accepted only for symmetry with `array_obj`, where a static sub-field is a
  useful per-row caption.

  **`FieldType` gained a member**, so a consumer `switch` with a `never` exhaustiveness assertion needs an
  `array_obj` case. The published JSON schema (`@bluprynt/forms-core/schemas/form-definition.schema.json`)
  gained `arrayObjField` (including its `kind` enum), `arrayObjValidation`, `arrayObjItem` and its ten
  per-type `$defs`, plus `arrayItemMultiselect` and `arrayItemStatic`. The change is purely additive: every definition that
  validated before still validates.

## 4.0.1

### Patch Changes

- Fixing form schema validation errors

## 3.0.0

## 2.0.0

## 1.0.0

### Major Changes

- [#4](https://github.com/blupryntco/forms-engine/pull/4) [`dd79570`](https://github.com/blupryntco/forms-engine/commit/dd79570436eab66740a2955641fb496bb4748ec9) Thanks [@sergeyzwezdin](https://github.com/sergeyzwezdin)! - Initial forms implementation
