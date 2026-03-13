/**
 * Validation rules for `number` fields.
 *
 * @property required - Whether a value must be provided.
 * @property min - Minimum allowed value (inclusive).
 * @property max - Maximum allowed value (inclusive).
 */
export type NumberValidation = {
    required?: boolean
    min?: number
    max?: number
}
