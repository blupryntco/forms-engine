/**
 * A machine-proposed answer for a single field.
 *
 * Suggestions live alongside user-entered values in a {@link FormDocument} and
 * never participate in validation or visibility. A suggestion is only ever
 * copied into `values` when it is explicitly accepted.
 *
 * @property value - The proposed value, shaped like the field's own value.
 * @property confidence - How confident the producer is, as a `0..1` fraction
 *   (`0.3` means 30%). Range-checked on write, not on read.
 * @property source - Human-readable explanation of why the value was proposed.
 */
export type FieldSuggestion = {
    value: unknown
    confidence: number
    source: string
}

/**
 * A sparse map of suggestions keyed by stringified field id (e.g. `"1"`, `"42"`),
 * using the same key space as {@link FormValues}.
 *
 * Most fields have no suggestion, so keys are expected to be missing.
 */
export type FormSuggestions = Record<string, FieldSuggestion>
