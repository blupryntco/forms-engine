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
 * | `SCHEMA_INVALID` | The form definition does not conform to the JSON schema. |
 * | `DUPLICATE_ID` | Two or more content items share the same numeric id. |
 * | `NESTING_DEPTH` | A section is nested deeper than the allowed 3 levels. |
 * | `UNKNOWN_FIELD_REF` | A condition references a field id that does not exist in the form. |
 * | `CONDITION_REFS_SECTION` | A condition references a section id; sections have no value to compare. |
 * | `INVALID_MIN_MAX` | A field's minimum constraint exceeds its maximum constraint. |
 * | `INVALID_REGEX` | String field `pattern` is not a valid regular expression. |
 * | `CIRCULAR_DEPENDENCY` | Condition dependencies form a cycle (A depends on B depends on A). |
 * | `FORM_ID_MISMATCH` | The document's form id does not match the engine's form definition id. |
 * | `FORM_VERSION_MISMATCH` | The document's form version does not match the engine's form definition version. |
 * | `FORM_SUBMITTED_AT_MISSING` | The document's submittedAt field is missing. |
 * | `FORM_SUBMITTED_AT_INVALID` | The document's submittedAt field is not a valid date. |
 */
export type DocumentValidationErrorCode =
    | 'SCHEMA_INVALID'
    | 'DUPLICATE_ID'
    | 'NESTING_DEPTH'
    | 'UNKNOWN_FIELD_REF'
    | 'CONDITION_REFS_SECTION'
    | 'INVALID_MIN_MAX'
    | 'INVALID_REGEX'
    | 'CIRCULAR_DEPENDENCY'
    | 'FORM_ID_MISMATCH'
    | 'FORM_VERSION_MISMATCH'
    | 'FORM_SUBMITTED_AT_MISSING'
    | 'FORM_SUBMITTED_AT_INVALID'

/**
 * A single validation error found during form definition or document validation.
 *
 * @property code - Machine-readable error code from {@link DocumentValidationErrorCode}.
 * @property message - Human-readable error description.
 * @property params - Optional parameters providing context (e.g. `{ expected, actual }`).
 * @property itemId - Id of the content item involved, when applicable.
 */
export type DocumentValidationError = {
    code: DocumentValidationErrorCode
    message: string
    params?: Record<string, unknown>
    itemId?: number
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
