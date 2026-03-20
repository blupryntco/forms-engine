import type { BooleanValidation } from '../types/validation/boolean'
import type { FieldValidationError } from '../types/validation-results'
import type { TypeValidator, ValidatorContext } from './type-validator'

export class BooleanValidator implements TypeValidator {
    validate(ctx: ValidatorContext): FieldValidationError[] {
        const { fieldId, value } = ctx
        const validation = ctx.validation as BooleanValidation | undefined
        const errors: FieldValidationError[] = []

        if (validation?.required && value !== true && value !== false) {
            errors.push({ fieldId, rule: 'REQUIRED', message: 'Value is required' })
        }

        return errors
    }
}
