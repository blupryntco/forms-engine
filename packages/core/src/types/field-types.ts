/**
 * Union of all supported form field types.
 *
 * - `string` -- free-text input
 * - `number` -- numeric input
 * - `boolean` -- true/false toggle
 * - `date` -- date picker (ISO-8601 string value)
 * - `select` -- single selection from a predefined list
 * - `array` -- ordered list of values whose item type is any non-array field type
 * - `file` -- file upload (stores name, MIME type, size, URL)
 */
export type FieldType = 'string' | 'number' | 'boolean' | 'date' | 'select' | 'array' | 'file'

/**
 * Discriminator for every content node in a form definition.
 * Includes all {@link FieldType} values plus `'section'` for grouping containers.
 */
export type ContentItemType = FieldType | 'section'
