import type { SustainabilityValidation } from '../types/validation/sustainability'
import type { FieldValidationError } from '../types/validation-results'
import type { TypeValidator, ValidatorContext } from './type-validator'

const OPTIONAL_TEXT_PROPERTIES = ['ccri', 'cmc'] as const

export class SustainabilityValidator implements TypeValidator {
    validate(ctx: ValidatorContext): FieldValidationError[] {
        const { fieldId, value } = ctx
        const validation = ctx.validation as SustainabilityValidation | undefined
        const errors: FieldValidationError[] = []

        if (value === null || value === undefined) {
            if (validation?.required) {
                errors.push({ fieldId, rule: 'REQUIRED', message: 'Value is required' })
            }
            return errors
        }

        if (typeof value !== 'object' || Array.isArray(value)) {
            errors.push({
                fieldId,
                rule: 'TYPE',
                message: 'Must be a valid sustainability object',
                params: { expectedType: 'sustainability' },
            })
            return errors
        }

        const record = value as Record<string, unknown>
        // An absent `address` reads as an empty address rather than a type error,
        // the same tolerance that makes `ccri` and `cmc` optional.
        const address = record.address ?? ''

        if (typeof address !== 'string' || OPTIONAL_TEXT_PROPERTIES.some((key) => !isOptionalText(record[key]))) {
            errors.push({
                fieldId,
                rule: 'TYPE',
                message: 'Must be a valid sustainability object',
                params: { expectedType: 'sustainability' },
            })
            return errors
        }

        if (validation?.required && address === '') {
            errors.push({ fieldId, rule: 'REQUIRED', message: 'Value is required' })
        }

        return errors
    }
}

function isOptionalText(value: unknown): boolean {
    return value === undefined || value === null || typeof value === 'string'
}
