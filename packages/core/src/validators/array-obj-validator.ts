import type { ArrayObjItemDef } from '../types/array-obj-item-def'
import type { FieldEntry } from '../types/field-entry'
import type { ArrayObjValidation } from '../types/validation/array-obj'
import type { FieldValidationError } from '../types/validation-results'
import type { TypeValidator, ValidatorContext } from './type-validator'

export type ArrayObjValidatorContext = ValidatorContext & {
    items?: ArrayObjItemDef[]
    validateField: (fieldId: number, value: unknown, entry: FieldEntry, now: Date) => FieldValidationError[]
}

const isRow = (value: unknown): value is Record<string, unknown> =>
    typeof value === 'object' && value !== null && !Array.isArray(value)

/**
 * Validates an `array_obj` field: the row list itself, then every sub-field of
 * every row.
 *
 * Sub-field errors keep the container's `fieldId` -- matching the key the
 * `fieldErrors` map stores them under -- and carry `itemIndex` (the row) plus
 * `itemFieldId` (the sub-field). A row-level `TYPE` error carries `itemIndex`
 * only.
 */
export class ArrayObjValidator implements TypeValidator {
    validate(ctx: ValidatorContext): FieldValidationError[] {
        const { fieldId, value, now } = ctx
        const { items, validateField } = ctx as ArrayObjValidatorContext
        const validation = ctx.validation as ArrayObjValidation | undefined
        const errors: FieldValidationError[] = []

        if (value === null || value === undefined) return errors

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

        if (!items) return errors

        for (let i = 0; i < value.length; i++) {
            const raw = value[i]

            // An absent row is read as an empty one, so its required sub-fields
            // still report. Anything else that is not an object is a type error.
            if (raw !== null && raw !== undefined && !isRow(raw)) {
                errors.push({
                    fieldId,
                    rule: 'TYPE',
                    message: 'Must be an object',
                    params: { expectedType: 'object' },
                    itemIndex: i,
                })
                continue
            }

            const row = isRow(raw) ? raw : {}

            for (const subField of items) {
                if (subField.type === 'static') continue

                const fakeEntry: FieldEntry = {
                    id: subField.id,
                    type: subField.type,
                    condition: undefined,
                    validation: subField.validation as FieldEntry['validation'],
                    parentId: fieldId,
                    options: subField.options,
                    item: undefined,
                    items: undefined,
                    label: subField.label,
                    title: undefined,
                }

                const subErrors = validateField(subField.id, row[String(subField.id)], fakeEntry, now)
                errors.push(
                    ...subErrors.map((err) => ({
                        ...err,
                        fieldId,
                        itemIndex: i,
                        itemFieldId: subField.id,
                        message: `${subField.label}: ${err.message}`,
                    })),
                )
            }
        }

        return errors
    }
}
