/**
 * A flat key-value map of user-submitted form data.
 *
 * Keys are stringified field ids (e.g. `"1"`, `"42"`). Values are the raw
 * data entered by the user, typed according to the field's {@link FieldType}.
 */
export type FormValues = Record<string, unknown>

/**
 * A complete form document containing form metadata and user-submitted values.
 *
 * This is the serialization/storage format for filled forms. The `form`
 * property links the document back to the schema that produced it, and
 * `values` holds the flat field data.
 *
 * @property form - Metadata identifying the form schema.
 * @property form.id - The form schema's unique identifier (from {@link FormDefinition.id}).
 * @property form.version - The form schema's version (from {@link FormDefinition.version}).
 * @property values - Flat key-value map of user-submitted data.
 */
export type FormDocument = {
    form: {
        id: string
        version: string
        submittedAt: string
    }
    values: FormValues
}
