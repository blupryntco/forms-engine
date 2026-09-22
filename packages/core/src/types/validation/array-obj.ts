/**
 * Validation rules for `array_obj` fields.
 *
 * Covers the row list itself. Per-sub-field rules live inside each entry of
 * the field's `items` list.
 *
 * @property minItems - Minimum number of rows the field must contain (inclusive).
 * @property maxItems - Maximum number of rows the field may contain (inclusive).
 */
export type ArrayObjValidation = {
    minItems?: number
    maxItems?: number
}
