import type { BlockchainValidation } from '../types/validation/blockchain'
import type { FieldValidationError } from '../types/validation-results'
import type { TypeValidator, ValidatorContext } from './type-validator'

export class BlockchainValidator implements TypeValidator {
    validate(ctx: ValidatorContext): FieldValidationError[] {
        const { fieldId, value } = ctx
        const validation = ctx.validation as BlockchainValidation | undefined
        const errors: FieldValidationError[] = []
        const isEmpty = value === null || value === undefined || value === ''

        if (validation?.required && isEmpty) {
            errors.push({ fieldId, rule: 'REQUIRED', message: 'Value is required' })
            return errors
        }

        if (isEmpty) return errors

        // The address format is deliberately not checked -- a `blockchain` value
        // is an opaque CAIP string as far as the engine is concerned.
        if (typeof value !== 'string') {
            errors.push({
                fieldId,
                rule: 'TYPE',
                message: 'Must be a blockchain address string',
                params: { expectedType: 'blockchain' },
            })
        }

        return errors
    }
}
