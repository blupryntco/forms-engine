import { FormEngine } from './form-engine'
import type { FormDefinition } from './types/form-definition'
import type { FormDocument } from './types/form-values'
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
     * @param fieldId - Numeric id of the array field.
     * @param value - The value to append. Defaults to `undefined`.
     * @returns `this` for chaining.
     * @throws If `fieldId` is not an array field.
     */
    addArrayItem(fieldId: number, value?: unknown): this {
        const arr = this.getOrInitArray(fieldId)
        arr.push(value)
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
     * @returns The validation result.
     */
    validate(): FormValidationResult {
        return this.engine.validate(this.doc)
    }

    /**
     * Computes visibility for every field and section.
     *
     * Delegates to {@link FormEngine.getVisibilityMap}.
     *
     * @returns Map from item id to visibility boolean.
     */
    getVisibilityMap(): Map<number, boolean> {
        return this.engine.getVisibilityMap(this.doc)
    }

    /**
     * Determines whether a field or section is visible given current values.
     *
     * Delegates to {@link FormEngine.isVisible}.
     *
     * @param id - Numeric id of the field or section.
     * @returns `true` if the item should be displayed.
     */
    isVisible(id: number): boolean {
        return this.engine.isVisible(id, this.doc)
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
    }

    /**
     * Asserts that `fieldId` is an array field and returns the current array value.
     * Throws if the field is not an array type or the current value is not an array.
     */
    private assertArray(fieldId: number): unknown[] {
        const entry = this.engine.getFieldDef(fieldId)
        if (!entry) throw new Error(`Field with id ${fieldId} not found`)

        if (entry.type !== 'array') throw new Error(`Field ${fieldId} is not an array field`)

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

        if (entry.type !== 'array') throw new Error(`Field ${fieldId} is not an array field`)

        const key = String(fieldId)
        let val = this.doc.values[key]
        if (!Array.isArray(val)) {
            val = []
            this.doc.values[key] = val
        }

        return val as unknown[]
    }
}
