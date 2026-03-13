import type { FieldValidationError } from '../types/validation-results'

/**
 * Context passed to each type-specific validator.
 *
 * @property fieldId - Numeric id of the field being validated.
 * @property value - The raw value from form values.
 * @property validation - The validation rules for this field (type-specific shape).
 * @property now - Reference date for resolving relative date expressions.
 * @property options - Select options (only relevant for `select` validators).
 */
export type ValidatorContext = {
    fieldId: number
    value: unknown
    validation: unknown
    now: Date
    options?: unknown
}

/**
 * Contract for a type-specific field validator.
 */
export interface TypeValidator {
    validate(ctx: ValidatorContext): FieldValidationError[]
}
