import type { FieldEntry } from './types/field-entry'
import type { FormValues } from './types/form-values'
import type { FieldValidationError, FormValidationResult } from './types/validation-results'
import type { ArrayValidatorContext } from './validators/array-validator'
import { ArrayValidator } from './validators/array-validator'
import { BooleanValidator } from './validators/boolean-validator'
import { DateValidator } from './validators/date-validator'
import { FileValidator } from './validators/file-validator'
import { NumberValidator } from './validators/number-validator'
import { SelectValidator } from './validators/select-validator'
import { StringValidator } from './validators/string-validator'
import type { TypeValidator } from './validators/type-validator'

/**
 * Validates form values against the schema's validation rules.
 *
 * **Which fields are validated:**
 * - Only fields (not sections) are validated.
 * - Hidden fields (those with `visibilityMap.get(id) === false`) are skipped
 *   entirely -- they produce no errors regardless of their value.
 *
 * **How each field type is validated:**
 * - `string` -- `required`, `minLength`, `maxLength`, `pattern`.
 * - `number` -- `required`, `min`, `max`.
 * - `boolean` -- `required` (must be explicitly `true` or `false`).
 * - `date` -- `required`, `minDate`, `maxDate`. Relative date boundaries
 *   are resolved against `now`.
 * - `select` -- `required`, plus the value must be one of the defined options.
 * - `array` -- `minItems`, `maxItems`, plus each item is validated
 *   individually according to the array's {@link ArrayItemDef}. Item-level
 *   errors carry an `itemIndex`.
 *
 * For all types, if `required` fails, no further rules are checked for that
 * field (early return). If the value is empty/absent and `required` is not
 * set, no errors are produced.
 */
export class FieldValidator {
    private readonly registry: Map<number, FieldEntry>
    private readonly validators: Record<string, TypeValidator>

    /**
     * @param registry - The engine's field registry.
     */
    constructor(registry: Map<number, FieldEntry>) {
        this.registry = registry
        this.validators = {
            string: new StringValidator(),
            number: new NumberValidator(),
            boolean: new BooleanValidator(),
            date: new DateValidator(),
            select: new SelectValidator(),
            array: new ArrayValidator(),
            file: new FileValidator(),
        }
    }

    /**
     * Validates form values against the schema's validation rules.
     *
     * @param values - The form values to validate, keyed by stringified field id.
     * @param visibilityMap - Pre-computed visibility map for all items.
     * @param now - Reference date for resolving relative date expressions.
     *   Defaults to `new Date()`.
     * @returns A {@link FormValidationResult} with `valid: true` when no errors
     *   exist, or `valid: false` with a populated `errors` array.
     */
    validate(values: FormValues, visibilityMap: Map<number, boolean>, now: Date = new Date()): FormValidationResult {
        const errors: FieldValidationError[] = []

        for (const [id, entry] of this.registry) {
            if (entry.type === 'section') continue
            if (visibilityMap.get(id) === false) continue

            const value = values[String(id)]
            const fieldErrors = this.validateField(id, value, entry, now)
            errors.push(...fieldErrors)
        }

        return { valid: errors.length === 0, errors }
    }

    private validateField(fieldId: number, value: unknown, entry: FieldEntry, now: Date): FieldValidationError[] {
        const validator = this.validators[entry.type]
        if (!validator) return []

        if (entry.type === 'array') {
            const ctx: ArrayValidatorContext = {
                fieldId,
                value,
                validation: entry.validation,
                now,
                item: entry.item,
                validateField: this.validateField.bind(this),
            }
            return validator.validate(ctx)
        }

        return validator.validate({
            fieldId,
            value,
            validation: entry.validation,
            now,
            options: entry.options,
        })
    }
}
