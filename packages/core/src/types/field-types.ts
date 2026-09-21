/**
 * Union of all supported form field types.
 *
 * - `string` -- free-text input
 * - `number` -- numeric input
 * - `boolean` -- true/false toggle
 * - `date` -- date picker (ISO-8601 string value)
 * - `select` -- single selection from a predefined list
 * - `multiselect` -- any number of selections from a predefined list; the
 *   value is an array of the chosen options' `value`s
 * - `array` -- ordered list of values whose item type is any non-array field type
 * - `file` -- file upload (stores name, MIME type, size, URL)
 * - `static` -- display-only text; holds no value and is never validated
 * - `blockchain` -- a CAIP address identifying an on-chain asset. The value is
 *   an opaque string: the engine never checks its format
 * - `sustainability` -- sustainability data for an on-chain asset; the value is
 *   a {@link SustainabilityValue} object (`address`, `ccri`, `cmc`)
 */
export type FieldType =
    | 'string'
    | 'number'
    | 'boolean'
    | 'date'
    | 'select'
    | 'multiselect'
    | 'array'
    | 'file'
    | 'static'
    | 'blockchain'
    | 'sustainability'

/**
 * Discriminator for every content node in a form definition.
 * Includes all {@link FieldType} values plus `'section'` for grouping containers.
 */
export type ContentItemType = FieldType | 'section'
