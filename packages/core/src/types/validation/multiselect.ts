/**
 * Validation rules for `multiselect` fields.
 *
 * @property required - When `true`, at least one option must be selected.
 *   An absent value and an empty array both fail this rule.
 */
export type MultiselectValidation = {
    required?: boolean
}
