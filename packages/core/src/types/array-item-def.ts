import type { FieldType } from './field-types'
import type { SelectOption } from './select-option'

/**
 * Schema for individual items inside an `array` field.
 *
 * Nested arrays are not allowed, so `type` excludes `'array'`.
 * Items do not have their own id or condition -- they inherit the parent
 * array field's identity and visibility.
 *
 * @property type - The scalar field type for each item in the array.
 * @property label - Display label for the item.
 * @property description - Optional description shown to the user.
 * @property validation - Validation rules applied to each individual item.
 * @property options - Required when {@link type} is `'select'`; the list of
 *   allowed values.
 */
export type ArrayItemDef = {
    type: Exclude<FieldType, 'array'>
    label: string
    description?: string
    validation?: Record<string, unknown>
    options?: SelectOption[]
}
