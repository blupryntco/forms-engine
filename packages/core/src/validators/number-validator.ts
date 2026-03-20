import type { NumberValidation } from '../types/validation/number'
import type { FieldValidationError } from '../types/validation-results'
import type { TypeValidator, ValidatorContext } from './type-validator'

export class NumberValidator implements TypeValidator {
    validate(ctx: ValidatorContext): FieldValidationError[] {
        const { fieldId, value } = ctx
        const validation = ctx.validation as NumberValidation | undefined
        const errors: FieldValidationError[] = []
        const isEmpty = value === null || value === undefined

        if (validation?.required && isEmpty) {
            errors.push({ fieldId, rule: 'REQUIRED', message: 'Value is required' })
            return errors
        }

        if (isEmpty) return errors

        if (typeof value !== 'number') {
            errors.push({ fieldId, rule: 'TYPE', message: 'Must be a number', params: { expectedType: 'number' } })
            return errors
        }

        if (validation?.min !== undefined && value < validation.min) {
            errors.push({
                fieldId,
                rule: 'MIN',
                message: `Must be at least ${validation.min}`,
                params: { min: validation.min, actual: value },
            })
        }

        if (validation?.max !== undefined && value > validation.max) {
            errors.push({
                fieldId,
                rule: 'MAX',
                message: `Must be at most ${validation.max}`,
                params: { max: validation.max, actual: value },
            })
        }

        return errors
    }
}
