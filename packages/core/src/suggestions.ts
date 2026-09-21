import type { FormDocument } from './types/form-values'
import type { FieldSuggestion, FormSuggestions } from './types/suggestion'

/**
 * Pure helpers for reading and writing the `suggestions` block of a
 * {@link FormDocument}.
 *
 * Every function is total over legacy documents: `doc.suggestions` may be
 * `undefined` (documents written before suggestions existed) and each helper
 * treats that as "no suggestions". Writers never mutate their input -- they
 * return a new document -- and they drop the `suggestions` key entirely once it
 * would be empty, so a document that never had suggestions round-trips
 * unchanged.
 *
 * These helpers deliberately do **not** check that `fieldId` refers to an
 * existing, non-section field. That check belongs to the general-purpose
 * authoring API ({@link FormValuesEditor}); callers that already resolved a
 * field -- such as the viewer's render loop -- would only pay for it twice.
 */

/**
 * Returns the suggestion recorded for a field.
 *
 * @param doc - The form document to read from.
 * @param fieldId - Numeric id of the field.
 * @returns The suggestion, or `undefined` when the field has none.
 */
export const getSuggestion = (doc: FormDocument, fieldId: number): FieldSuggestion | undefined =>
    doc.suggestions?.[String(fieldId)]

/**
 * Records a suggestion for a field, replacing any existing one.
 *
 * @param doc - The form document to update.
 * @param fieldId - Numeric id of the field.
 * @param suggestion - The suggestion to store. Deep-copied before storing.
 * @returns A new document carrying the suggestion.
 * @throws If `confidence` is not a finite number within `0..1`.
 */
export const setSuggestion = (doc: FormDocument, fieldId: number, suggestion: FieldSuggestion): FormDocument => {
    const { confidence } = suggestion
    if (!Number.isFinite(confidence) || confidence < 0 || confidence > 1) {
        throw new Error(`Suggestion confidence must be a number between 0 and 1, received ${confidence}`)
    }

    return {
        ...doc,
        suggestions: { ...doc.suggestions, [String(fieldId)]: deepCopy(suggestion) },
    }
}

/**
 * Removes the suggestion recorded for a field, leaving the field's value alone.
 *
 * When the removed entry was the last one, the `suggestions` key is dropped
 * from the document rather than left as an empty object.
 *
 * @param doc - The form document to update.
 * @param fieldId - Numeric id of the field.
 * @returns A new document without that suggestion, or `doc` itself when there
 *   was nothing to remove.
 */
export const removeSuggestion = (doc: FormDocument, fieldId: number): FormDocument => {
    const key = String(fieldId)
    if (!doc.suggestions || !(key in doc.suggestions)) return doc

    const { [key]: _removed, ...rest } = doc.suggestions
    if (Object.keys(rest).length === 0) {
        const { suggestions: _dropped, ...withoutSuggestions } = doc
        return withoutSuggestions
    }

    return { ...doc, suggestions: rest }
}

/**
 * Copies a field's suggested value into the document's values, keeping the
 * suggestion in place so the origin of the answer stays visible.
 *
 * The value is deep-copied: array and object suggestions must not become
 * aliases of the stored value, or later in-place edits (e.g. appending an array
 * item) would silently rewrite the suggestion too.
 *
 * @param doc - The form document to update.
 * @param fieldId - Numeric id of the field.
 * @returns A new document with the value applied, or `doc` itself when the
 *   field has no suggestion.
 */
export const applySuggestion = (doc: FormDocument, fieldId: number): FormDocument => {
    const suggestion = getSuggestion(doc, fieldId)
    if (!suggestion) return doc

    return {
        ...doc,
        values: { ...doc.values, [String(fieldId)]: deepCopy(suggestion.value) },
    }
}

/**
 * Returns all suggestions on a document as a plain object, never `undefined`.
 *
 * @param doc - The form document to read from.
 * @returns A copy of the suggestions map. Empty when the document has none.
 */
export const getSuggestions = (doc: FormDocument): FormSuggestions => ({ ...doc.suggestions })

const deepCopy = <T>(value: T): T => (value === undefined ? value : (JSON.parse(JSON.stringify(value)) as T))
