import type { StringValidation } from '../types/validation/string'
import type { FieldValidationError } from '../types/validation-results'
import type { TypeValidator, ValidatorContext } from './type-validator'

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

        if (validation?.maxLength !== undefined && value.length > validation.maxLength) {
            errors.push({
                fieldId,
                rule: 'MAX_LENGTH',
                message: `Must be at most ${validation.maxLength} characters`,
                params: { maxLength: validation.maxLength, actual: value.length },
            })
        }

        if (validation?.pattern !== undefined) {
            const re = new RegExp(validation.pattern)
            if (!re.test(value)) {
                errors.push({
                    fieldId,
                    rule: 'PATTERN',
                    message: validation.patternMessage ?? 'Value does not match the required pattern',
                })
            }
        }

        return errors
    }
}
