/**
 * Validation rules for `string` fields.
 *
 * @property required - Whether a non-empty value must be provided.
 * @property minLength - Minimum character count (inclusive).
 * @property maxLength - Maximum character count (inclusive).
 * @property pattern - Regular expression the value must match.
 * @property patternMessage - Custom error message shown when `pattern` fails.
 */
export type StringValidation = {
    required?: boolean
    minLength?: number
    maxLength?: number
    pattern?: string
    patternMessage?: string
}
