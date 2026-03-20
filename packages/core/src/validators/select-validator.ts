import type { SelectOption } from '../types/select-option'
import type { SelectValidation } from '../types/validation/select'
import type { FieldValidationError } from '../types/validation-results'
import type { TypeValidator, ValidatorContext } from './type-validator'

export class SelectValidator implements TypeValidator {
    validate(ctx: ValidatorContext): FieldValidationError[] {
        const { fieldId, value } = ctx
        const validation = ctx.validation as SelectValidation | undefined
        const options = ctx.options as SelectOption[] | undefined
        const errors: FieldValidationError[] = []
        const isEmpty = value === null || value === undefined

        if (validation?.required && isEmpty) {
            errors.push({ fieldId, rule: 'REQUIRED', message: 'Value is required' })
            return errors
        }

        if (isEmpty) return errors

        if (options && !options.some((opt) => opt.value === value)) {
            errors.push({ fieldId, rule: 'INVALID_OPTION', message: 'Value is not a valid option' })
        }

        return errors
    }
}
