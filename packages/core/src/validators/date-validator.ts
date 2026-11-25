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
            // A bound that falls outside the range of `Date` cannot be checked, so the value fails it.
            if (minResolved === undefined || timestamp < Date.parse(minResolved)) {
                const minDate = minResolved ?? validation.minDate
                errors.push({
                    fieldId,
                    rule: 'MIN_DATE',
                    message: `Must be on or after ${minDate}`,
                    params: { minDate },
                })
            }
        }

        if (validation?.maxDate !== undefined) {
            const maxResolved = isRelativeDate(validation.maxDate)
                ? resolveRelativeDate(validation.maxDate, now)
                : validation.maxDate
            // A bound that falls outside the range of `Date` cannot be checked, so the value fails it.
            if (maxResolved === undefined || timestamp > Date.parse(maxResolved)) {
                const maxDate = maxResolved ?? validation.maxDate
                errors.push({
                    fieldId,
                    rule: 'MAX_DATE',
                    message: `Must be on or before ${maxDate}`,
                    params: { maxDate },
                })
            }
        }

        return errors
    }
}
