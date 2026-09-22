import type { FieldType } from './field-types'
import type { SelectOption } from './select-option'

/**
 * Schema for a value-producing sub-field inside an `array_obj` field.
 *
 * Unlike an `array` item, a sub-field carries its own `id`: it is drawn from
 * the same globally unique id space as top-level fields and is the key under
 * which the sub-field's value is stored inside each row object.
 *
 * Neither list type may nest, so `type` excludes `'array'` and `'array_obj'`.
 * Sub-fields have no `condition` -- they inherit the parent field's visibility.
 *
 * @property id - Unique numeric identifier, also the row-object key.
 * @property type - The field type for this sub-field.
 * @property label - Display label for the sub-field.
 * @property description - Optional description shown to the user.
 * @property placeholder - Optional placeholder text for the sub-field's input control.
 * @property answer_guidelines - Optional guidance describing how the sub-field should be answered.
 * @property reference_id - Optional external reference (e.g. a regulation or questionnaire item id).
 * @property validation - Validation rules applied to this sub-field in every row.
 * @property options - Required when {@link type} is `'select'` or `'multiselect'`;
 *   the list of allowed values.
 */
export type ValueArrayObjItemDef = {
    id: number
    type: Exclude<FieldType, 'array' | 'array_obj' | 'static'>
    label: string
    description?: string
    placeholder?: string
    answer_guidelines?: string
    reference_id?: string
    validation?: Record<string, unknown>
    options?: SelectOption[]
}

/**
 * Schema for a display-only sub-field inside an `array_obj` field.
 *
 * Holds no value and is never validated, but still occupies a position in
 * every row -- useful as a per-row caption or separator.
 *
 * @property id - Unique numeric identifier. No value is ever stored under it.
 * @property type - Always `'static'`.
 * @property text - The text to display.
 * @property label - Optional heading shown above {@link text}.
 */
export type StaticArrayObjItemDef = {
    id: number
    type: 'static'
    text: string
    label?: string
    description?: string
    placeholder?: string
    answer_guidelines?: string
    reference_id?: string
}

/**
 * Schema for a single sub-field inside an `array_obj` field.
 *
 * Narrow with `item.type === 'static'` to reach {@link StaticArrayObjItemDef}'s
 * `text`, or with `item.type !== 'static'` to reach the value-field properties
 * (`label`, `validation`, `options`).
 */
export type ArrayObjItemDef = ValueArrayObjItemDef | StaticArrayObjItemDef

/**
 * How an `array_obj` field asks to be laid out.
 *
 * Purely presentation metadata: the engine never reads it, and it affects
 * neither values, validation nor visibility. `'list'` when absent, so
 * definitions written before it existed keep their original rendering.
 *
 * - `list` -- each row is a stacked block of labelled controls.
 * - `table` -- rows share one header, one column per sub-field.
 */
export type ArrayObjKind = 'list' | 'table'

/**
 * A single row of an `array_obj` field's value: a map from stringified
 * sub-field id to that sub-field's value.
 */
export type ArrayObjRow = Record<string, unknown>
