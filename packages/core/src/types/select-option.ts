/**
 * A single option within a `select` field's predefined list.
 *
 * @property value - The stored value when this option is chosen.
 * @property label - Human-readable display text for this option.
 */
export type SelectOption = {
    value: string | number
    label: string
}
