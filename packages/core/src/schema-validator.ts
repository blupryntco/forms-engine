import Ajv2020 from 'ajv/dist/2020'

import schema from './form-definition.schema.json'
import type { FormDefinitionIssue } from './types'

const ajv = new Ajv2020({ allErrors: true })
const validateFn = ajv.compile(schema)

/**
 * Validates raw input against the form definition JSON schema.
 *
 * Returns an array of {@link FormDefinitionIssue} with code `SCHEMA_INVALID`
 * for every schema violation found. Returns an empty array when the input
 * conforms to the schema.
 */
export function validateFormDefinitionSchema(input: unknown): FormDefinitionIssue[] {
    if (validateFn(input)) return []

    return (validateFn.errors ?? []).map((err) => {
        const path = err.instancePath || '/'
        const message = err.message ?? 'Unknown error'

        if (err.keyword === 'additionalProperties') {
            const additional = (err.params as { additionalProperty?: string }).additionalProperty
            return { code: 'SCHEMA_INVALID', message: `${path}: ${message}: '${additional}'` }
        }

        return { code: 'SCHEMA_INVALID', message: `${path}: ${message}` }
    })
}
