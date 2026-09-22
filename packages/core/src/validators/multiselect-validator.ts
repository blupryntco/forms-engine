import type { SelectOption } from '../types/select-option'
import type { MultiselectValidation } from '../types/validation/multiselect'
import type { FieldValidationError } from '../types/validation-results'
import type { TypeValidator, ValidatorContext } from './type-validator'

/**
 * Validates `multiselect` fields, whose value is an array of the chosen
 * options' `value`s.
 *
 * An absent value and an empty array both count as "nothing selected", so both
 * fail `required`. Option membership is reported as a single field-level
 * `INVALID_OPTION` error rather than one error per offending element: the
 * viewer filters out errors carrying an `itemIndex` on the non-array render
 * path, so indexed errors would never be displayed.
 */
export class MultiselectValidator implements TypeValidator {
    validate(ctx: ValidatorContext): FieldValidationError[] {
        const { fieldId, value } = ctx
        const validation = ctx.validation as MultiselectValidation | undefined
        const options = ctx.options as SelectOption[] | undefined
        const errors: FieldValidationError[] = []
        const isEmpty = value === null || value === undefined || (Array.isArray(value) && value.length === 0)

        if (validation?.required && isEmpty) {
            errors.push({ fieldId, rule: 'REQUIRED', message: 'Value is required' })
            return errors
        }

        if (isEmpty) return errors

        if (!Array.isArray(value)) {
            errors.push({
                fieldId,
                rule: 'TYPE',
                message: 'Must be an array',
                params: { expectedType: 'multiselect' },
            })
            return errors
        }

        if (options && value.some((selected) => !options.some((opt) => opt.value === selected))) {
            errors.push({ fieldId, rule: 'INVALID_OPTION', message: 'Value is not a valid option' })
        }

        return errors
    }
}
