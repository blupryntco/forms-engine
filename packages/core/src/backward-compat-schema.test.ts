/**
 * Backward compatibility of the published JSON schema.
 *
 * `form-definition.schema.json` ships in the package and is strict
 * (`additionalProperties: false` at every level), so it is the gate a consuming
 * app actually hits. This release only ever *loosened* it -- three optional
 * metadata properties on existing definitions, and new `oneOf` branches for the
 * new field types. Nothing that validated under 4.0.1 may stop validating.
 */

import { LEGACY_RAW_DEFINITIONS } from './__fixtures__/backward_compatibility'
import { FormDefinitionValidator } from './form-definition-validator'

const validator = new FormDefinitionValidator()

const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T

describe('backward compatibility -- JSON schema', () => {
    it.each(Object.keys(LEGACY_RAW_DEFINITIONS))('accepts the 4.0.1 definition %s unchanged', (slug) => {
        expect(validator.validateSchema(LEGACY_RAW_DEFINITIONS[slug])).toEqual([])
    })

    it('still rejects an unknown property, so the additive change did not disable strictness', () => {
        const definition = clone(LEGACY_RAW_DEFINITIONS['vasp-registration']) as {
            content: Record<string, unknown>[]
        }
        definition.content[0] = { ...definition.content[0], notARealProperty: true }

        expect(validator.validateSchema(definition)).not.toEqual([])
    })

    it('accepts the three new metadata properties alongside the old ones', () => {
        // Proves the new keys were *added* to the allowed set rather than
        // replacing anything -- the same definition validates with and without.
        const definition = clone(LEGACY_RAW_DEFINITIONS['vasp-registration']) as {
            content: Record<string, unknown>[]
        }
        const section = definition.content[0] as Record<string, unknown>
        const fields = section.content as Record<string, unknown>[]

        expect(validator.validateSchema(definition)).toEqual([])

        section.placeholder = 'section placeholder'
        section.answer_guidelines = 'section guidance'
        section.reference_id = 'SEC-1'
        fields[0] = {
            ...fields[0],
            placeholder: 'field placeholder',
            answer_guidelines: 'field guidance',
            reference_id: 'FLD-1',
        }

        expect(validator.validateSchema(definition)).toEqual([])
    })

    it('keeps every 4.0.1 array item type legal', () => {
        // 4.0.1 allowed six item types (FieldType minus 'array'). The branch
        // widened this set; none of the originals may have been dropped.
        const item = (type: string) =>
            type === 'select'
                ? { type, label: 'Entry', options: [{ value: 'a', label: 'A' }] }
                : { type, label: 'Entry' }

        for (const type of ['string', 'number', 'boolean', 'date', 'select', 'file']) {
            const definition = {
                id: 'legacy-array-items',
                version: '1.0.0',
                title: 'Legacy array items',
                content: [{ id: 1, type: 'array', label: `array of ${type}`, item: item(type) }],
            }

            expect(validator.validateSchema(definition)).toEqual([])
        }
    })

    it('keeps every 4.0.1 condition shape legal', () => {
        const conditions = [
            { field: 1, op: 'set' },
            { field: 1, op: 'notset' },
            { field: 1, op: 'eq', value: 'x' },
            { field: 1, op: 'ne', value: 'x' },
            { field: 1, op: 'lt', value: 1 },
            { field: 1, op: 'gt', value: 1 },
            { field: 1, op: 'lte', value: 1 },
            { field: 1, op: 'gte', value: 1 },
            { field: 1, op: 'in', value: ['x'] },
            { field: 1, op: 'notin', value: ['x'] },
            {
                and: [
                    { field: 1, op: 'set' },
                    { field: 1, op: 'ne', value: 'x' },
                ],
            },
            { or: [{ field: 1, op: 'set' }, { and: [{ field: 1, op: 'set' }] }] },
        ]

        for (const condition of conditions) {
            const definition = {
                id: 'legacy-conditions',
                version: '1.0.0',
                title: 'Legacy conditions',
                content: [
                    { id: 1, type: 'string', label: 'Source' },
                    { id: 2, type: 'string', label: 'Target', condition },
                ],
            }

            expect(validator.validateSchema(definition)).toEqual([])
        }
    })

    it('keeps every 4.0.1 validation rule legal', () => {
        const fields = [
            {
                id: 1,
                type: 'string',
                label: 'S',
                validation: { required: true, minLength: 1, maxLength: 2, pattern: '^a$', patternMessage: 'nope' },
            },
            { id: 2, type: 'number', label: 'N', validation: { required: true, min: 0, max: 1 } },
            { id: 3, type: 'boolean', label: 'B', validation: { required: true } },
            {
                id: 4,
                type: 'date',
                label: 'D',
                validation: { required: true, minDate: '-1m', maxDate: '2025-01-01T00:00:00.000Z' },
            },
            {
                id: 5,
                type: 'select',
                label: 'Sel',
                options: [{ value: 'a', label: 'A' }],
                validation: { required: true },
            },
            {
                id: 6,
                type: 'array',
                label: 'A',
                item: { type: 'string', label: 'E' },
                validation: { minItems: 0, maxItems: 3 },
            },
            { id: 7, type: 'file', label: 'F', validation: { required: true } },
        ]

        expect(
            validator.validateSchema({
                id: 'legacy-validation',
                version: '1.0.0',
                title: 'Legacy validation',
                content: fields,
            }),
        ).toEqual([])
    })
})
