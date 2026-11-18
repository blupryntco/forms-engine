import type { FieldEntry } from './types/field-entry'
import type { FormValues } from './types/form-values'
import type { FormSuggestions } from './types/suggestion'
import type { DocumentValidationError } from './types/validation-results'

/**
 * A value the form definition does not accept: an unknown key, a value on a
 * `section`/`static` id, a hidden field's value, or an undeclared key in an
 * `array_obj` row.
 */
type StrayValue =
    | { code: 'UNKNOWN_VALUE_KEY'; key: string }
    | { code: 'NON_VALUE_ITEM_VALUE' | 'HIDDEN_FIELD_VALUE'; key: string; itemId: number }
    | { code: 'UNKNOWN_ROW_KEY'; key: string; itemId: number; itemIndex: number; rowKey: string }

const isRow = (value: unknown): value is Record<string, unknown> =>
    typeof value === 'object' && value !== null && !Array.isArray(value)

const deepCopy = <T>(value: T): T => (value === undefined ? value : (JSON.parse(JSON.stringify(value)) as T))

/**
 * Finds and removes form values the definition does not accept.
 *
 * Both {@link findStrayValues} and the sanitize methods share one detection
 * pass, so `validate(doc, { strict: true })` reports exactly what `sanitize`
 * removes.
 */
export class ValueSanitizer {
    private readonly entriesByKey: Map<string, FieldEntry>

    /**
     * @param registry - The engine's field registry.
     */
    constructor(registry: Map<number, FieldEntry>) {
        this.entriesByKey = new Map([...registry].map(([id, entry]) => [String(id), entry]))
    }

    /**
     * Reports every stray value as a document-level error.
     *
     * @param values - The form values to inspect.
     * @param visibilityMap - Pre-computed visibility map for all items.
     * @returns One error per stray value; empty when the values are clean.
     */
    findStrayValues(values: FormValues, visibilityMap: Map<number, boolean>): DocumentValidationError[] {
        return this.collect(values, visibilityMap).map(ValueSanitizer.toError)
    }

    /**
     * Returns a deep copy of `values` without stray values. The input is not mutated.
     *
     * @param values - The form values to clean.
     * @param visibilityMap - Pre-computed visibility map for all items.
     */
    sanitizeValues(values: FormValues, visibilityMap: Map<number, boolean>): FormValues {
        const result = deepCopy(values)
        for (const stray of this.collect(values, visibilityMap)) {
            if (stray.code === 'UNKNOWN_ROW_KEY') {
                const rows = result[stray.key] as Record<string, unknown>[]
                delete rows[stray.itemIndex]?.[stray.rowKey]
            } else {
                delete result[stray.key]
            }
        }
        return result
    }

    /**
     * Returns a deep copy of `suggestions` cleaned by the same rules as values,
     * applied to each suggestion's `value`. The input is not mutated.
     *
     * @param suggestions - The suggestions block to clean.
     * @param visibilityMap - Pre-computed visibility map for all items.
     * @returns The cleaned block, or `undefined` when nothing is left.
     */
    sanitizeSuggestions(
        suggestions: FormSuggestions,
        visibilityMap: Map<number, boolean>,
    ): FormSuggestions | undefined {
        const result = deepCopy(suggestions)
        const suggestedValues = Object.fromEntries(Object.entries(suggestions).map(([key, s]) => [key, s?.value]))
        for (const stray of this.collect(suggestedValues, visibilityMap)) {
            if (stray.code === 'UNKNOWN_ROW_KEY') {
                const rows = result[stray.key]?.value as Record<string, unknown>[]
                delete rows[stray.itemIndex]?.[stray.rowKey]
            } else {
                delete result[stray.key]
            }
        }
        return Object.keys(result).length > 0 ? result : undefined
    }

    private collect(values: FormValues, visibilityMap: Map<number, boolean>): StrayValue[] {
        const strays: StrayValue[] = []
        for (const [key, value] of Object.entries(values)) {
            const entry = this.entriesByKey.get(key)
            if (!entry) {
                strays.push({ code: 'UNKNOWN_VALUE_KEY', key })
            } else if (entry.type === 'section' || entry.type === 'static') {
                strays.push({ code: 'NON_VALUE_ITEM_VALUE', key, itemId: entry.id })
            } else if (visibilityMap.get(entry.id) === false) {
                strays.push({ code: 'HIDDEN_FIELD_VALUE', key, itemId: entry.id })
            } else if (entry.type === 'array_obj') {
                strays.push(...ValueSanitizer.collectRowKeys(key, value, entry))
            }
        }
        return strays
    }

    /** Finds undeclared keys in the object rows of a visible `array_obj` value. */
    private static collectRowKeys(key: string, value: unknown, entry: FieldEntry): StrayValue[] {
        if (!Array.isArray(value)) return []
        const allowed = new Set(
            (entry.items ?? []).filter((item) => item.type !== 'static').map((item) => String(item.id)),
        )
        const strays: StrayValue[] = []
        value.forEach((row: unknown, itemIndex) => {
            if (!isRow(row)) return
            for (const rowKey of Object.keys(row)) {
                if (!allowed.has(rowKey)) {
                    strays.push({ code: 'UNKNOWN_ROW_KEY', key, itemId: entry.id, itemIndex, rowKey })
                }
            }
        })
        return strays
    }

    private static toError(stray: StrayValue): DocumentValidationError {
        switch (stray.code) {
            case 'UNKNOWN_VALUE_KEY':
                return {
                    code: stray.code,
                    message: `Value key "${stray.key}" does not match any form item`,
                    params: { key: stray.key },
                }
            case 'NON_VALUE_ITEM_VALUE':
                return {
                    code: stray.code,
                    message: `Item ${stray.itemId} is a section or static block and cannot hold a value`,
                    itemId: stray.itemId,
                }
            case 'HIDDEN_FIELD_VALUE':
                return {
                    code: stray.code,
                    message: `Field ${stray.itemId} is hidden and cannot hold a value`,
                    itemId: stray.itemId,
                }
            case 'UNKNOWN_ROW_KEY':
                return {
                    code: stray.code,
                    message: `Row ${stray.itemIndex} of field ${stray.itemId} has undeclared key "${stray.rowKey}"`,
                    itemId: stray.itemId,
                    params: { itemIndex: stray.itemIndex, key: stray.rowKey },
                }
        }
    }
}
