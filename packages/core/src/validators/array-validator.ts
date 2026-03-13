import type { ArrayItemDef } from '../types/array-item-def'
import type { FieldEntry } from '../types/field-entry'
import type { ArrayValidation } from '../types/validation/array'
import type { FieldValidationError } from '../types/validation-results'
import type { TypeValidator, ValidatorContext } from './type-validator'

export type ArrayValidatorContext = ValidatorContext & {
    item?: ArrayItemDef
    validateField: (fieldId: number, value: unknown, entry: FieldEntry, now: Date) => FieldValidationError[]
}

export class ArrayValidator implements TypeValidator {
    validate(ctx: ValidatorContext): FieldValidationError[] {
        const { fieldId, value, now } = ctx
        const { item, validateField } = ctx as ArrayValidatorContext
        const validation = ctx.validation as ArrayValidation | undefined
        const errors: FieldValidationError[] = []
        const isEmpty = value === null || value === undefined

        if (isEmpty) return errors

        if (!Array.isArray(value)) {
            errors.push({ fieldId, rule: 'TYPE', message: 'Must be an array', params: { expectedType: 'array' } })
            return errors
        }

        if (validation?.minItems !== undefined && value.length < validation.minItems) {
            errors.push({
                fieldId,
                rule: 'MIN_ITEMS',
                message: `Must have at least ${validation.minItems} items`,
                params: { minItems: validation.minItems, actual: value.length },
            })
        }

        if (validation?.maxItems !== undefined && value.length > validation.maxItems) {
            errors.push({
                fieldId,
                rule: 'MAX_ITEMS',
                message: `Must have at most ${validation.maxItems} items`,
                params: { maxItems: validation.maxItems, actual: value.length },
            })
        }

        if (item) {
            for (let i = 0; i < value.length; i++) {
                const fakeEntry: FieldEntry = {
                    id: fieldId,
                    type: item.type,
                    condition: undefined,
                    validation: item.validation as FieldEntry['validation'],
                    parentId: undefined,
                    options: item.options,
                    item: undefined,
                    label: item.label,
                    title: undefined,
                }

                const itemErrors = validateField(fieldId, value[i], fakeEntry, now)
                errors.push(...itemErrors.map((err) => ({ ...err, itemIndex: i })))
            }
        }

        return errors
    }
}
