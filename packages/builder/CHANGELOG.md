# @bluprynt/forms-builder

## 4.2.1

No changes in this release.

## 4.2.0

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

### Patch Changes

- Updated dependencies [[`f342da1`](https://github.com/blupryntco/forms-engine/commit/f342da15a9bc0b169dcda1d1e98a5cf556884eb8), [`f342da1`](https://github.com/blupryntco/forms-engine/commit/f342da15a9bc0b169dcda1d1e98a5cf556884eb8), [`f342da1`](https://github.com/blupryntco/forms-engine/commit/f342da15a9bc0b169dcda1d1e98a5cf556884eb8), [`f342da1`](https://github.com/blupryntco/forms-engine/commit/f342da15a9bc0b169dcda1d1e98a5cf556884eb8)]:
  - @bluprynt/forms-core@4.1.0

## 4.0.1

### Patch Changes

- Fixing form schema validation errors

- Updated dependencies []:
  - @bluprynt/forms-core@4.0.1

## 3.0.0

### Patch Changes

- Updated dependencies []:
  - @bluprynt/forms-core@3.0.0

## 2.0.0

### Patch Changes

- Updated dependencies []:
  - @bluprynt/forms-core@2.0.0

## 1.0.0

### Major Changes

- [#4](https://github.com/blupryntco/forms-engine/pull/4) [`dd79570`](https://github.com/blupryntco/forms-engine/commit/dd79570436eab66740a2955641fb496bb4748ec9) Thanks [@sergeyzwezdin](https://github.com/sergeyzwezdin)! - Initial forms implementation

### Patch Changes

- Updated dependencies [[`dd79570`](https://github.com/blupryntco/forms-engine/commit/dd79570436eab66740a2955641fb496bb4748ec9)]:
  - @bluprynt/forms-core@1.0.0
