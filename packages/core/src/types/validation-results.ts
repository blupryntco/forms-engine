/**
 * Machine-readable codes for all field-level validation rules.
 *
 * | Code | Applies to |
 * |------|------------|
 * | `REQUIRED` | All field types |
 * | `TYPE` | All field types (value has wrong runtime type) |
 * | `MIN_LENGTH` | `string` |
 * | `MAX_LENGTH` | `string` |
 * | `PATTERN` | `string` |
 * | `MIN` | `number` |
 * | `MAX` | `number` |
 * | `MIN_DATE` | `date` |
 * | `MAX_DATE` | `date` |
 * | `INVALID_DATE` | `date` (unparseable value) |
 * | `INVALID_OPTION` | `select` (value not in options list) |
 * | `MIN_ITEMS` | `array` |
 * | `MAX_ITEMS` | `array` |
 */
export type FieldValidationRule =
    | 'REQUIRED'
    | 'TYPE'
    | 'MIN_LENGTH'
    | 'MAX_LENGTH'
    | 'PATTERN'
    | 'MIN'
    | 'MAX'
    | 'MIN_DATE'
    | 'MAX_DATE'
    | 'INVALID_DATE'
    | 'INVALID_OPTION'
    | 'MIN_ITEMS'
    | 'MAX_ITEMS'

/**
 * A single validation error for a specific field.
 *
 * @property fieldId - Numeric id of the field that failed validation.
 * @property rule - Machine-readable rule code from {@link FieldValidationRule}.
 * @property message - Human-readable error description.
 * @property params - Optional parameters providing context (e.g. `{ minLength: 5, actual: 3 }`).
 * @property itemIndex - For array fields, the zero-based index of the item
 *   that failed validation. `undefined` for non-array fields.
 */
export type FieldValidationError = {
    fieldId: number
    rule: FieldValidationRule
    message: string
    params?: Record<string, unknown>
    itemIndex?: number
}

/**
 * Machine-readable codes for all document-level validation errors.
 *
 * | Code | Description |
 * |------|-------------|
 * | `FORM_ID_MISMATCH` | The document's form id does not match the engine's form definition id. |
 * | `FORM_VERSION_MISMATCH` | The document's form version does not match the engine's form definition version. |
 */
export type DocumentValidationErrorCode =
    | 'FORM_ID_MISMATCH'
    | 'FORM_VERSION_MISMATCH'
    | 'FORM_SUBMITTED_AT_MISSING'
    | 'FORM_SUBMITTED_AT_INVALID'

/**
 * A document-level validation error indicating a compatibility mismatch
 * between the form document and the engine's form definition.
 *
 * @property code - Machine-readable error code from {@link DocumentValidationErrorCode}.
 * @property message - Human-readable error description.
 * @property params - Optional parameters providing context (e.g. `{ expected, actual }`).
 */
export type DocumentValidationError = {
    code: DocumentValidationErrorCode
    message: string
    params?: Record<string, unknown>
}

/**
 * Aggregated result of validating all visible form fields.
 *
 * @property valid - `true` when `fieldErrors` is empty and no `documentErrors` exist.
 * @property fieldErrors - Map from field id to its validation errors.
 *   Empty map when `valid` is `true`. Fields with no errors have no entry.
 * @property documentErrors - Document-level compatibility errors, if any.
 */
export type FormValidationResult = {
    valid: boolean
    fieldErrors: Map<number, FieldValidationError[]>
    documentErrors?: DocumentValidationError[]
}
