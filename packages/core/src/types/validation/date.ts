/**
 * Validation rules for `date` fields.
 *
 * Date boundaries can be absolute ISO-8601 strings or relative date
 * expressions (e.g. `"+7d"`, `"-1m"`). Relative dates are resolved at
 * validation time.
 *
 * @property required - Whether a value must be provided.
 * @property minDate - Earliest allowed date (inclusive). Absolute or relative.
 * @property maxDate - Latest allowed date (inclusive). Absolute or relative.
 */
export type DateValidation = {
    required?: boolean
    minDate?: string
    maxDate?: string
}
