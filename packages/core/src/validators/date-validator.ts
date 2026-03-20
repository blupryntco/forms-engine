import { isRelativeDate, resolveRelativeDate } from '../date-utils'
import type { DateValidation } from '../types/validation/date'
import type { FieldValidationError } from '../types/validation-results'
import type { TypeValidator, ValidatorContext } from './type-validator'

export class DateValidator implements TypeValidator {
    validate(ctx: ValidatorContext): FieldValidationError[] {
        const { fieldId, value, now } = ctx
        const validation = ctx.validation as DateValidation | undefined
        const errors: FieldValidationError[] = []
        const isEmpty = value === null || value === undefined || value === ''

        if (validation?.required && isEmpty) {
            errors.push({ fieldId, rule: 'REQUIRED', message: 'Value is required' })
            return errors
        }

        if (isEmpty) return errors

        if (typeof value !== 'string') {
            errors.push({ fieldId, rule: 'TYPE', message: 'Must be a valid date', params: { expectedType: 'date' } })
            return errors
        }

        const timestamp = Date.parse(value)
        if (Number.isNaN(timestamp)) {
            errors.push({ fieldId, rule: 'INVALID_DATE', message: 'Must be a valid date' })
            return errors
        }

        if (validation?.minDate !== undefined) {
            const minResolved = isRelativeDate(validation.minDate)
                ? resolveRelativeDate(validation.minDate, now)
                : validation.minDate
            if (timestamp < Date.parse(minResolved)) {
                errors.push({
                    fieldId,
                    rule: 'MIN_DATE',
                    message: `Must be on or after ${minResolved}`,
                    params: { minDate: minResolved },
                })
            }
        }

        if (validation?.maxDate !== undefined) {
            const maxResolved = isRelativeDate(validation.maxDate)
                ? resolveRelativeDate(validation.maxDate, now)
                : validation.maxDate
            if (timestamp > Date.parse(maxResolved)) {
                errors.push({
                    fieldId,
                    rule: 'MAX_DATE',
                    message: `Must be on or before ${maxResolved}`,
                    params: { maxDate: maxResolved },
                })
            }
        }

        return errors
    }
}
