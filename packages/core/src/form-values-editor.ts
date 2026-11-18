import { FormEngine } from './form-engine'
import { applySuggestion, getSuggestion, getSuggestions, removeSuggestion, setSuggestion } from './suggestions'
import type { ArrayObjRow } from './types/array-obj-item-def'
import type { EvaluationOptions } from './types/evaluation-options'
import type { FormDefinition } from './types/form-definition'
import type { FormDocument } from './types/form-values'
import type { FieldSuggestion, FormSuggestions } from './types/suggestion'
import type { FormValidationResult } from './types/validation-results'

/**
 * Mutable editor for building and modifying form values against a {@link FormDefinition}.
 *
 * Wraps a {@link FormEngine} and a mutable {@link FormDocument}. All mutating
 * methods return `this` for fluent chaining.
 *
 * @example
 * ```ts
 * const editor = new FormValuesEditor(definition)
 * editor
 *   .setFieldValue(1, 'Alice')
 *   .setFieldValue(2, 30)
 *   .setSubmittedAt('2025-01-01T00:00:00Z')
 *
 * const result = editor.validate()
 * const doc = editor.toJSON()
 * ```
 */
export class FormValuesEditor {
    private readonly engine: FormEngine
    private doc: FormDocument

    /**
     * Creates a new editor for the given form definition.
     *
     * @param definition - The form definition to edit values against.
     * @param doc - An existing document to pre-populate. Deep-cloned internally.
     *   When omitted a blank document is created via {@link FormEngine.createFormDocument}.
     */
    constructor(definition: FormDefinition, doc?: FormDocument) {
        this.engine = new FormEngine(definition)
        this.doc = doc ? JSON.parse(JSON.stringify(doc)) : this.engine.createFormDocument()
    }

    /**
     * Returns the current value of a field.
     *
     * @param fieldId - Numeric id of the field.
     * @returns The field value, or `undefined` if not set.
     */
    getFieldValue(fieldId: number): unknown {
        return this.doc.values[String(fieldId)]
    }

    /**
     * Sets the value of a field.
     *
     * @param fieldId - Numeric id of the field.
     * @param value - The value to set.
     * @returns `this` for chaining.
     * @throws If `fieldId` is unknown or references a section.
     */
    setFieldValue(fieldId: number, value: unknown): this {
        this.assertField(fieldId)
        this.doc.values[String(fieldId)] = value
        return this
    }

    /**
     * Removes the value of a field.
     *
     * @param fieldId - Numeric id of the field.
     * @returns `this` for chaining.
     */
    clearFieldValue(fieldId: number): this {
        delete this.doc.values[String(fieldId)]
        return this
    }

    /**
     * Appends an item to an array field.
     *
     * If the field currently has no value, it is initialized to an empty array
     * before appending.
     *
     * @param fieldId - Numeric id of the `array` or `array_obj` field.
     * @param value - The value to append. Defaults to `undefined` for an
     *   `array` field and to an empty row (`{}`) for an `array_obj` field.
     * @returns `this` for chaining.
     * @throws If `fieldId` is not an array field.
     */
    addArrayItem(fieldId: number, value?: unknown): this {
        const arr = this.getOrInitArray(fieldId)
        const entry = this.engine.getFieldDef(fieldId)
        arr.push(value === undefined && entry?.type === 'array_obj' ? {} : value)
        return this
    }

    /**
     * Removes an item from an array field by index.
     *
     * @param fieldId - Numeric id of the array field.
     * @param index - Zero-based index of the item to remove.
     * @returns `this` for chaining.
     * @throws If `fieldId` is not an array field or the index is out of bounds.
     */
    removeArrayItem(fieldId: number, index: number): this {
        const arr = this.assertArray(fieldId)
        if (index < 0 || index >= arr.length) {
            throw new Error(`Index ${index} is out of bounds for array field ${fieldId} (length ${arr.length})`)
        }
        arr.splice(index, 1)
        return this
    }

    /**
     * Moves an item within an array field from one index to another.
     *
     * @param fieldId - Numeric id of the array field.
     * @param fromIndex - Current zero-based index of the item.
     * @param toIndex - Target zero-based index.
     * @returns `this` for chaining.
     * @throws If `fieldId` is not an array field or either index is out of bounds.
     */
    moveArrayItem(fieldId: number, fromIndex: number, toIndex: number): this {
        const arr = this.assertArray(fieldId)
        if (fromIndex < 0 || fromIndex >= arr.length) {
            throw new Error(`fromIndex ${fromIndex} is out of bounds for array field ${fieldId} (length ${arr.length})`)
        }
        if (toIndex < 0 || toIndex >= arr.length) {
            throw new Error(`toIndex ${toIndex} is out of bounds for array field ${fieldId} (length ${arr.length})`)
        }
        const [item] = arr.splice(fromIndex, 1)
        arr.splice(toIndex, 0, item)
        return this
    }

    /**
     * Sets the value of an item at a specific index in an array field.
     *
     * @param fieldId - Numeric id of the array field.
     * @param index - Zero-based index of the item to set.
     * @param value - The new value for the item.
     * @returns `this` for chaining.
     * @throws If `fieldId` is not an array field or the index is out of bounds.
     */
    setArrayItem(fieldId: number, index: number, value: unknown): this {
        const arr = this.assertArray(fieldId)
        if (index < 0 || index >= arr.length) {
            throw new Error(`Index ${index} is out of bounds for array field ${fieldId} (length ${arr.length})`)
        }
        arr[index] = value
        return this
    }

    /**
     * Returns the value of one sub-field within one row of an `array_obj` field.
     *
     * @param fieldId - Numeric id of the `array_obj` field.
     * @param index - Zero-based row index.
     * @param subFieldId - Numeric id of the sub-field.
     * @returns The sub-field value, or `undefined` if not set.
     * @throws If the field is not an `array_obj`, the row index is out of
     *   bounds, or the sub-field does not belong to the field.
     */
    getArrayObjValue(fieldId: number, index: number, subFieldId: number): unknown {
        return this.assertArrayObjRow(fieldId, index, subFieldId)[String(subFieldId)]
    }

    /**
     * Sets the value of one sub-field within one row of an `array_obj` field.
     *
     * @param fieldId - Numeric id of the `array_obj` field.
     * @param index - Zero-based row index.
     * @param subFieldId - Numeric id of the sub-field.
     * @param value - The value to set.
     * @returns `this` for chaining.
     * @throws If the field is not an `array_obj`, the row index is out of
     *   bounds, or the sub-field does not belong to the field or is static.
     */
    setArrayObjValue(fieldId: number, index: number, subFieldId: number, value: unknown): this {
        this.assertArrayObjRow(fieldId, index, subFieldId)[String(subFieldId)] = value
        return this
    }

    /**
     * Removes one sub-field's value from one row of an `array_obj` field.
     *
     * @returns `this` for chaining.
     * @throws Under the same conditions as {@link setArrayObjValue}.
     */
    clearArrayObjValue(fieldId: number, index: number, subFieldId: number): this {
        delete this.assertArrayObjRow(fieldId, index, subFieldId)[String(subFieldId)]
        return this
    }

    /**
     * Returns the suggestion recorded for a field.
     *
     * @param fieldId - Numeric id of the field.
     * @returns The suggestion, or `undefined` if the field has none.
     */
    getSuggestion(fieldId: number): FieldSuggestion | undefined {
        return getSuggestion(this.doc, fieldId)
    }

    /**
     * Returns every suggestion on the document, keyed by stringified field id.
     *
     * @returns A copy of the suggestions map. Empty when there are none.
     */
    getSuggestions(): FormSuggestions {
        return getSuggestions(this.doc)
    }

    /**
     * Records a suggestion for a field, replacing any existing one. The field's
     * value is left untouched.
     *
     * @param fieldId - Numeric id of the field.
     * @param suggestion - The suggestion to store.
     * @returns `this` for chaining.
     * @throws If `fieldId` is unknown, references a section, or `confidence`
     *   falls outside `0..1`.
     */
    setSuggestion(fieldId: number, suggestion: FieldSuggestion): this {
        this.assertField(fieldId)
        this.doc = setSuggestion(this.doc, fieldId, suggestion)
        return this
    }

    /**
     * Removes the suggestion recorded for a field, leaving its value untouched.
     *
     * @param fieldId - Numeric id of the field.
     * @returns `this` for chaining.
     */
    clearSuggestion(fieldId: number): this {
        this.doc = removeSuggestion(this.doc, fieldId)
        return this
    }

    /**
     * Accepts a field's suggestion: copies the suggested value into the field's
     * value and **keeps** the suggestion, so its source stays visible.
     *
     * No-op when the field has no suggestion.
     *
     * @param fieldId - Numeric id of the field.
     * @returns `this` for chaining.
     * @throws If `fieldId` is unknown or references a section.
     */
    acceptSuggestion(fieldId: number): this {
        this.assertField(fieldId)
        this.doc = applySuggestion(this.doc, fieldId)
        return this
    }

    /**
     * Rejects a field's suggestion: removes it entirely, leaving the field's
     * value untouched.
     *
     * No-op when the field has no suggestion.
     *
     * @param fieldId - Numeric id of the field.
     * @returns `this` for chaining.
     */
    rejectSuggestion(fieldId: number): this {
        this.doc = removeSuggestion(this.doc, fieldId)
        return this
    }

    /**
     * Sets the `submittedAt` timestamp on the document.
     *
     * @param submittedAt - ISO 8601 timestamp string.
     * @returns `this` for chaining.
     */
    setSubmittedAt(submittedAt: string): this {
        this.doc.form.submittedAt = submittedAt
        return this
    }

    /**
     * Validates the current document against the form definition.
     *
     * Delegates to {@link FormEngine.validate}.
     *
     * @param options - Evaluation options; pass `now` for server-side checks.
     * @returns The validation result.
     */
    validate(options?: EvaluationOptions): FormValidationResult {
        return this.engine.validate(this.doc, options)
    }

    /**
     * Computes visibility for every field and section.
     *
     * Delegates to {@link FormEngine.getVisibilityMap}.
     *
     * @param options - Evaluation options; pass `now` for server-side checks.
     * @returns Map from item id to visibility boolean.
     */
    getVisibilityMap(options?: EvaluationOptions): Map<number, boolean> {
        return this.engine.getVisibilityMap(this.doc, options)
    }

    /**
     * Determines whether a field or section is visible given current values.
     *
     * Delegates to {@link FormEngine.isVisible}.
     *
     * @param id - Numeric id of the field or section.
     * @param options - Evaluation options; pass `now` for server-side checks.
     * @returns `true` if the item should be displayed.
     */
    isVisible(id: number, options?: EvaluationOptions): boolean {
        return this.engine.isVisible(id, this.doc, options)
    }

    /**
     * Returns a deep clone of the current form document.
     *
     * @returns A new serializable {@link FormDocument} instance.
     */
    toJSON(): FormDocument {
        return JSON.parse(JSON.stringify(this.doc))
    }

    /**
     * Asserts that `fieldId` exists in the registry and is not a section.
     */
    private assertField(fieldId: number): void {
        const entry = this.engine.getFieldDef(fieldId)

        if (!entry) throw new Error(`Field with id ${fieldId} not found`)
        if (entry.type === 'section') throw new Error(`Item ${fieldId} is a section, not a field`)
        if (entry.type === 'static') throw new Error(`Item ${fieldId} is a static field and holds no value`)
    }

    /**
     * Asserts that `fieldId` is an array field and returns the current array value.
     * Throws if the field is not an array type or the current value is not an array.
     */
    private assertArray(fieldId: number): unknown[] {
        const entry = this.engine.getFieldDef(fieldId)
        if (!entry) throw new Error(`Field with id ${fieldId} not found`)

        if (entry.type !== 'array' && entry.type !== 'array_obj')
            throw new Error(`Field ${fieldId} is not an array field`)

        const val = this.doc.values[String(fieldId)]
        if (!Array.isArray(val)) throw new Error(`Field ${fieldId} does not currently hold an array value`)

        return val
    }

    /**
     * Returns the array value for `fieldId`, initializing to `[]` if not yet set.
     */
    private getOrInitArray(fieldId: number): unknown[] {
        const entry = this.engine.getFieldDef(fieldId)
        if (!entry) throw new Error(`Field with id ${fieldId} not found`)

        if (entry.type !== 'array' && entry.type !== 'array_obj')
            throw new Error(`Field ${fieldId} is not an array field`)

        const key = String(fieldId)
        let val = this.doc.values[key]
        if (!Array.isArray(val)) {
            val = []
            this.doc.values[key] = val
        }

        return val as unknown[]
    }

    /**
     * Asserts that `fieldId` is an `array_obj` field holding a row at `index`
     * with a writable sub-field `subFieldId`, and returns that row.
     * The row is created in place when it is absent or not an object.
     */
    private assertArrayObjRow(fieldId: number, index: number, subFieldId: number): ArrayObjRow {
        const entry = this.engine.getFieldDef(fieldId)
        if (!entry) throw new Error(`Field with id ${fieldId} not found`)
        if (entry.type !== 'array_obj') throw new Error(`Field ${fieldId} is not an array_obj field`)

        const subField = (entry.items ?? []).find((f) => f.id === subFieldId)
        if (!subField) throw new Error(`Sub-field ${subFieldId} does not belong to field ${fieldId}`)
        if (subField.type === 'static') throw new Error(`Sub-field ${subFieldId} is a static field and holds no value`)

        const arr = this.assertArray(fieldId)
        if (index < 0 || index >= arr.length) {
            throw new Error(`Index ${index} is out of bounds for array field ${fieldId} (length ${arr.length})`)
        }

        const row = arr[index]
        if (typeof row === 'object' && row !== null && !Array.isArray(row)) return row as ArrayObjRow

        const created: ArrayObjRow = {}
        arr[index] = created
        return created
    }
}
