---
'@bluprynt/forms-viewer': minor
'@bluprynt/forms-core': minor
---

Add the `array_obj` field type — a list of rows, where every row holds one value per sub-field.

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
