import type { FormDefinition } from './form-definition'
import type { FormDocument } from './form-values'

/**
 * A point-in-time snapshot pairing a {@link FormDefinition} with a
 * {@link FormDocument}.
 *
 * @property definition - The form schema that describes the structure.
 * @property document - The filled form data.
 */
export type FormSnapshot = {
    definition: FormDefinition
    document: FormDocument
}
