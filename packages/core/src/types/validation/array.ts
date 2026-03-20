/**
 * Validation rules for `array` fields.
 *
 * @property minItems - Minimum number of items the array must contain (inclusive).
 * @property maxItems - Maximum number of items the array may contain (inclusive).
 */
export type ArrayValidation = {
    minItems?: number
    maxItems?: number
}
