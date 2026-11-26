import { compileSafePattern } from '../regex-safety'
import type { StringValidation } from '../types/validation/string'
import type { FieldValidationError } from '../types/validation-results'
import type { TypeValidator, ValidatorContext } from './type-validator'

/** Longest value a `pattern` runs against when the field sets no `maxLength`; longer values fail `PATTERN`. */
const maxPatternInputLength = 10000

export class StringValidator implements TypeValidator {
    validate(ctx: ValidatorContext): FieldValidationError[] {
        const { fieldId, value } = ctx
        const validation = ctx.validation as StringValidation | undefined
        const errors: FieldValidationError[] = []
        const isEmpty = value === null || value === undefined || value === ''

        if (validation?.required && isEmpty) {
            errors.push({ fieldId, rule: 'REQUIRED', message: 'Value is required' })
            return errors
        }

        if (isEmpty) return errors

        if (typeof value !== 'string') {
            errors.push({ fieldId, rule: 'TYPE', message: 'Must be a string', params: { expectedType: 'string' } })
            return errors
        }

        if (validation?.minLength !== undefined && value.length < validation.minLength) {
            errors.push({
                fieldId,
                rule: 'MIN_LENGTH',
                message: `Must be at least ${validation.minLength} characters`,
                params: { minLength: validation.minLength, actual: value.length },
            })
        }

        // Stop before the pattern: running it on an over-long value is where backtracking gets expensive.
        if (validation?.maxLength !== undefined && value.length > validation.maxLength) {
            errors.push({
                fieldId,
                rule: 'MAX_LENGTH',
                message: `Must be at most ${validation.maxLength} characters`,
                params: { maxLength: validation.maxLength, actual: value.length },
            })
            return errors
        }

        if (
            validation?.pattern !== undefined &&
            !this.matchesPattern(value, validation.pattern, validation.maxLength)
        ) {
            errors.push({
                fieldId,
                rule: 'PATTERN',
                message: validation.patternMessage ?? 'Value does not match the required pattern',
            })
        }

        return errors
    }

    /** Fails closed: an over-long value or a pattern that is invalid or unsafe never matches. */
    private matchesPattern(value: string, pattern: string, maxLength: number | undefined): boolean {
        if (maxLength === undefined && value.length > maxPatternInputLength) return false
        return compileSafePattern(pattern)?.test(value) === true
    }
}
