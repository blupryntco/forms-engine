import { isRelativeDate, resolveRelativeDate } from './date-utils'
import type {
    ArrayItemDef,
    ArrayValidation,
    BooleanValidation,
    DateValidation,
    FieldEntry,
    FieldValidationError,
    FileValidation,
    FormValidationResult,
    FormValues,
    NumberValidation,
    SelectOption,
    SelectValidation,
    StringValidation,
} from './types'

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

    /**
     * @param registry - The engine's field registry.
     */
    constructor(registry: Map<number, FieldEntry>) {
        this.registry = registry
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

    // ── Dispatch ──

    private validateField(fieldId: number, value: unknown, entry: FieldEntry, now: Date): FieldValidationError[] {
        switch (entry.type) {
            case 'string':
                return this.validateString(fieldId, value, entry.validation as StringValidation | undefined)
            case 'number':
                return this.validateNumber(fieldId, value, entry.validation as NumberValidation | undefined)
            case 'boolean':
                return this.validateBoolean(fieldId, value, entry.validation as BooleanValidation | undefined)
            case 'date':
                return this.validateDate(fieldId, value, entry.validation as DateValidation | undefined, now)
            case 'select':
                return this.validateSelect(
                    fieldId,
                    value,
                    entry.validation as SelectValidation | undefined,
                    entry.options,
                )
            case 'array':
                return this.validateArray(
                    fieldId,
                    value,
                    entry.validation as ArrayValidation | undefined,
                    entry.item,
                    now,
                )
            case 'file':
                return this.validateFile(fieldId, value, entry.validation as FileValidation | undefined)
            default:
                return []
        }
    }

    // ── String ──

    private validateString(
        fieldId: number,
        value: unknown,
        validation: StringValidation | undefined,
    ): FieldValidationError[] {
        const errors: FieldValidationError[] = []
        const isEmpty = value === null || value === undefined || value === ''

        if (validation?.required && isEmpty) {
            errors.push({ fieldId, rule: 'required', message: 'Value is required' })
            return errors
        }

        if (isEmpty) return errors

        if (typeof value !== 'string') {
            errors.push({ fieldId, rule: 'type', message: 'Must be a string', params: { expectedType: 'string' } })
            return errors
        }

        if (validation?.minLength !== undefined && value.length < validation.minLength) {
            errors.push({
                fieldId,
                rule: 'minLength',
                message: `Must be at least ${validation.minLength} characters`,
                params: { minLength: validation.minLength, actual: value.length },
            })
        }

        if (validation?.maxLength !== undefined && value.length > validation.maxLength) {
            errors.push({
                fieldId,
                rule: 'maxLength',
                message: `Must be at most ${validation.maxLength} characters`,
                params: { maxLength: validation.maxLength, actual: value.length },
            })
        }

        if (validation?.pattern !== undefined) {
            const re = new RegExp(validation.pattern)
            if (!re.test(value)) {
                errors.push({
                    fieldId,
                    rule: 'pattern',
                    message: validation.patternMessage ?? 'Value does not match the required pattern',
                })
            }
        }

        return errors
    }

    // ── Number ──

    private validateNumber(
        fieldId: number,
        value: unknown,
        validation: NumberValidation | undefined,
    ): FieldValidationError[] {
        const errors: FieldValidationError[] = []
        const isEmpty = value === null || value === undefined

        if (validation?.required && isEmpty) {
            errors.push({ fieldId, rule: 'required', message: 'Value is required' })
            return errors
        }

        if (isEmpty) return errors

        if (typeof value !== 'number') {
            errors.push({ fieldId, rule: 'type', message: 'Must be a number', params: { expectedType: 'number' } })
            return errors
        }

        if (validation?.min !== undefined && value < validation.min) {
            errors.push({
                fieldId,
                rule: 'min',
                message: `Must be at least ${validation.min}`,
                params: { min: validation.min, actual: value },
            })
        }

        if (validation?.max !== undefined && value > validation.max) {
            errors.push({
                fieldId,
                rule: 'max',
                message: `Must be at most ${validation.max}`,
                params: { max: validation.max, actual: value },
            })
        }

        return errors
    }

    // ── Boolean ──

    private validateBoolean(
        fieldId: number,
        value: unknown,
        validation: BooleanValidation | undefined,
    ): FieldValidationError[] {
        const errors: FieldValidationError[] = []

        if (validation?.required && value !== true && value !== false) {
            errors.push({ fieldId, rule: 'required', message: 'Value is required' })
        }

        return errors
    }

    // ── Date ──

    private validateDate(
        fieldId: number,
        value: unknown,
        validation: DateValidation | undefined,
        now: Date,
    ): FieldValidationError[] {
        const errors: FieldValidationError[] = []
        const isEmpty = value === null || value === undefined || value === ''

        if (validation?.required && isEmpty) {
            errors.push({ fieldId, rule: 'required', message: 'Value is required' })
            return errors
        }

        if (isEmpty) return errors

        if (typeof value !== 'string') {
            errors.push({ fieldId, rule: 'type', message: 'Must be a valid date', params: { expectedType: 'date' } })
            return errors
        }

        const timestamp = Date.parse(value)
        if (Number.isNaN(timestamp)) {
            errors.push({ fieldId, rule: 'invalidDate', message: 'Must be a valid date' })
            return errors
        }

        if (validation?.minDate !== undefined) {
            const minResolved = isRelativeDate(validation.minDate)
                ? resolveRelativeDate(validation.minDate, now)
                : validation.minDate
            if (timestamp < Date.parse(minResolved)) {
                errors.push({
                    fieldId,
                    rule: 'minDate',
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
                    rule: 'maxDate',
                    message: `Must be on or before ${maxResolved}`,
                    params: { maxDate: maxResolved },
                })
            }
        }

        return errors
    }

    // ── Select ──

    private validateSelect(
        fieldId: number,
        value: unknown,
        validation: SelectValidation | undefined,
        options: SelectOption[] | undefined,
    ): FieldValidationError[] {
        const errors: FieldValidationError[] = []
        const isEmpty = value === null || value === undefined

        if (validation?.required && isEmpty) {
            errors.push({ fieldId, rule: 'required', message: 'Value is required' })
            return errors
        }

        if (isEmpty) return errors

        if (options && !options.some((opt) => opt.value === value)) {
            errors.push({ fieldId, rule: 'invalidOption', message: 'Value is not a valid option' })
        }

        return errors
    }

    // ── File ──

    private validateFile(
        fieldId: number,
        value: unknown,
        validation: FileValidation | undefined,
    ): FieldValidationError[] {
        const errors: FieldValidationError[] = []
        const isEmpty = value === null || value === undefined

        if (validation?.required && isEmpty) {
            errors.push({ fieldId, rule: 'required', message: 'Value is required' })
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
                rule: 'type',
                message: 'Must be a valid file object',
                params: { expectedType: 'file' },
            })
        }

        return errors
    }

    // ── Array ──

    private validateArray(
        fieldId: number,
        value: unknown,
        validation: ArrayValidation | undefined,
        itemDef: ArrayItemDef | undefined,
        now: Date,
    ): FieldValidationError[] {
        const errors: FieldValidationError[] = []
        const isEmpty = value === null || value === undefined

        if (isEmpty) return errors

        if (!Array.isArray(value)) {
            errors.push({ fieldId, rule: 'type', message: 'Must be an array', params: { expectedType: 'array' } })
            return errors
        }

        if (validation?.minItems !== undefined && value.length < validation.minItems) {
            errors.push({
                fieldId,
                rule: 'minItems',
                message: `Must have at least ${validation.minItems} items`,
                params: { minItems: validation.minItems, actual: value.length },
            })
        }

        if (validation?.maxItems !== undefined && value.length > validation.maxItems) {
            errors.push({
                fieldId,
                rule: 'maxItems',
                message: `Must have at most ${validation.maxItems} items`,
                params: { maxItems: validation.maxItems, actual: value.length },
            })
        }

        if (itemDef) {
            for (let i = 0; i < value.length; i++) {
                const itemErrors = this.validateArrayItem(fieldId, i, value[i], itemDef, now)
                errors.push(...itemErrors)
            }
        }

        return errors
    }

    private validateArrayItem(
        fieldId: number,
        index: number,
        value: unknown,
        itemDef: ArrayItemDef,
        now: Date,
    ): FieldValidationError[] {
        const fakeEntry: FieldEntry = {
            id: fieldId,
            type: itemDef.type,
            condition: undefined,
            validation: itemDef.validation as FieldEntry['validation'],
            parentId: undefined,
            options: itemDef.options,
            item: undefined,
            label: itemDef.label,
            title: undefined,
        }

        const itemErrors = this.validateField(fieldId, value, fakeEntry, now)
        return itemErrors.map((err) => ({ ...err, itemIndex: index }))
    }
}
