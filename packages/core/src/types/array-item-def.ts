import type { FieldType } from './field-types'
import type { SelectOption } from './select-option'

/**
 * Schema for a value-producing item inside an `array` field.
 *
 * Neither list type may nest, so `type` excludes `'array'` and `'array_obj'`.
 * Items do not have their own id or condition -- they inherit the parent
 * array field's identity and visibility.
 *
 * @property type - The field type for each item in the array.
 * @property label - Display label for the item.
 * @property description - Optional description shown to the user.
 * @property placeholder - Optional placeholder text for the item's input control.
 * @property answer_guidelines - Optional guidance describing how the item should be answered.
 * @property reference_id - Optional external reference (e.g. a regulation or questionnaire item id).
 * @property validation - Validation rules applied to each individual item.
 * @property options - Required when {@link type} is `'select'` or `'multiselect'`;
 *   the list of allowed values.
 */
export type ValueArrayItemDef = {
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
 * Schema for a display-only item inside an `array` field.
 *
 * A static item holds no value and is never validated, so an array using one
 * renders as many blocks as the stored array is long and contributes nothing
 * to the document's values. Accepted for symmetry with `array_obj`, where a
 * static sub-field is genuinely useful as a per-row caption.
 *
 * @property type - Always `'static'`.
 * @property text - The text to display.
 * @property label - Optional heading shown above {@link text}.
 */
export type StaticArrayItemDef = {
    type: 'static'
    text: string
    label?: string
    description?: string
    placeholder?: string
    answer_guidelines?: string
    reference_id?: string
}

/**
 * Schema for individual items inside an `array` field.
 *
 * Narrow with `item.type === 'static'` to reach {@link StaticArrayItemDef}'s
 * `text`, or with `item.type !== 'static'` to reach the value-item properties
 * (`label`, `validation`, `options`).
 */
export type ArrayItemDef = ValueArrayItemDef | StaticArrayItemDef
