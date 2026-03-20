import type { FileValidation } from '../types/validation/file'
import type { FieldValidationError } from '../types/validation-results'
import type { TypeValidator, ValidatorContext } from './type-validator'

export class FileValidator implements TypeValidator {
    validate(ctx: ValidatorContext): FieldValidationError[] {
        const { fieldId, value } = ctx
        const validation = ctx.validation as FileValidation | undefined
        const errors: FieldValidationError[] = []
        const isEmpty = value === null || value === undefined

        if (validation?.required && isEmpty) {
            errors.push({ fieldId, rule: 'REQUIRED', message: 'Value is required' })
            return errors
        }

        if (isEmpty) return errors

        if (
            typeof value !== 'object' ||
            typeof (value as Record<string, unknown>).name !== 'string' ||
            typeof (value as Record<string, unknown>).mimeType !== 'string' ||
            typeof (value as Record<string, unknown>).size !== 'number' ||
            typeof (value as Record<string, unknown>).url !== 'string'
        ) {
            errors.push({
                fieldId,
                rule: 'TYPE',
                message: 'Must be a valid file object',
                params: { expectedType: 'file' },
            })
        }

        return errors
    }
}
