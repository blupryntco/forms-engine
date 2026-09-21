import type { FieldType } from './field-types'
import type { SelectOption } from './select-option'

/**
 * Schema for individual items inside an `array` field.
 *
 * Nested arrays are not allowed, so `type` excludes `'array'`. `static`
 * (no value) and `multiselect` (an array value of its own) are excluded too.
 * Items do not have their own id or condition -- they inherit the parent
 * array field's identity and visibility.
 *
 * @property type - The scalar field type for each item in the array.
 * @property label - Display label for the item.
 * @property description - Optional description shown to the user.
 * @property placeholder - Optional placeholder text for the item's input control.
 * @property answer_guidelines - Optional guidance describing how the item should be answered.
 * @property reference_id - Optional external reference (e.g. a regulation or questionnaire item id).
 * @property validation - Validation rules applied to each individual item.
 * @property options - Required when {@link type} is `'select'`; the list of
 *   allowed values.
 */
export type ArrayItemDef = {
    type: Exclude<FieldType, 'array' | 'static' | 'multiselect'>
    label: string
    description?: string
    placeholder?: string
    answer_guidelines?: string
    reference_id?: string
    validation?: Record<string, unknown>
    options?: SelectOption[]
}
