---
'@bluprynt/forms-builder': minor
'@bluprynt/forms-viewer': minor
'@bluprynt/forms-core': minor
---

Add `blockchain` and `sustainability` field types.

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
