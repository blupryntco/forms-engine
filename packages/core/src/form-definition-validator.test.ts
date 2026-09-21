import { FormDefinitionValidator } from './form-definition-validator'
import type { FieldEntry } from './types/field-entry'
import type { FormDefinition } from './types/form-definition'

const validator = new FormDefinitionValidator()

const minimal = {
    id: 'test-form',
    version: '1.0.0',
    title: 'Test Form',
    content: [{ id: 1, type: 'string', label: 'Name' }],
}

const schemaIssues = (input: unknown) => validator.validateSchema(input)
const schemaValid = (input: unknown) => validator.validateSchema(input).length === 0

const makeEntry = (id: number, overrides: Partial<FieldEntry> = {}): FieldEntry => ({
    id,
    type: 'string',
    condition: undefined,
    validation: undefined,
    parentId: undefined,
    options: undefined,
    item: undefined,
    label: `Field ${id}`,
    title: undefined,
    ...overrides,
})

const minimalDef = (content: FormDefinition['content']): FormDefinition => ({
    id: 'test',
    version: '1.0.0',
    title: 'Test',
    content,
})

describe('FormDefinitionValidator', () => {
    describe('duplicate IDs', () => {
        it('detects duplicate IDs in flat content', () => {
            const def = minimalDef([
                { id: 1, type: 'string', label: 'A' },
                { id: 1, type: 'string', label: 'B' },
            ])
            const registry = new Map<number, FieldEntry>([[1, makeEntry(1)]])
            const issues = validator.validate(def, registry)
            expect(issues.some((i) => i.code === 'DUPLICATE_ID')).toBe(true)
        })

        it('detects duplicate IDs across sections', () => {
            const def = minimalDef([
                {
                    id: 1,
                    type: 'section' as const,
                    title: 'S1',
                    content: [{ id: 3, type: 'string' as const, label: 'A' }],
                },
                { id: 3, type: 'string', label: 'B' },
            ])
            const registry = new Map<number, FieldEntry>([
                [1, makeEntry(1, { type: 'section' })],
                [3, makeEntry(3)],
            ])
            const issues = validator.validate(def, registry)
            expect(issues.some((i) => i.code === 'DUPLICATE_ID')).toBe(true)
        })
    })

    describe('unknown field references in conditions', () => {
        it('detects condition referencing non-existent field', () => {
            const def = minimalDef([{ id: 1, type: 'string', label: 'A', condition: { field: 999, op: 'set' } }])
            const registry = new Map<number, FieldEntry>([[1, makeEntry(1, { condition: { field: 999, op: 'set' } })]])
            const issues = validator.validate(def, registry)
            expect(issues.some((i) => i.code === 'UNKNOWN_FIELD_REF')).toBe(true)
        })

        it('does not flag valid field references', () => {
            const def = minimalDef([
                { id: 1, type: 'string', label: 'A' },
                { id: 2, type: 'string', label: 'B', condition: { field: 1, op: 'set' } },
            ])
            const registry = new Map<number, FieldEntry>([
                [1, makeEntry(1)],
                [2, makeEntry(2, { condition: { field: 1, op: 'set' } })],
            ])
            const issues = validator.validate(def, registry)
            expect(issues.some((i) => i.code === 'UNKNOWN_FIELD_REF')).toBe(false)
        })
    })

    describe('section nesting depth', () => {
        it('allows 3 levels of nesting', () => {
            const def = minimalDef([
                {
                    id: 1,
                    type: 'section' as const,
                    title: 'L1',
                    content: [
                        {
                            id: 2,
                            type: 'section' as const,
                            title: 'L2',
                            content: [
                                {
                                    id: 3,
                                    type: 'section' as const,
                                    title: 'L3',
                                    content: [{ id: 4, type: 'string' as const, label: 'Deep' }],
                                },
                            ],
                        },
                    ],
                },
            ])
            const registry = new Map<number, FieldEntry>([
                [1, makeEntry(1, { type: 'section' })],
                [2, makeEntry(2, { type: 'section', parentId: 1 })],
                [3, makeEntry(3, { type: 'section', parentId: 2 })],
                [4, makeEntry(4, { parentId: 3 })],
            ])
            const issues = validator.validate(def, registry)
            expect(issues.some((i) => i.code === 'NESTING_DEPTH')).toBe(false)
        })

        it('rejects 4 levels of nesting', () => {
            const def = minimalDef([
                {
                    id: 1,
                    type: 'section' as const,
                    title: 'L1',
                    content: [
                        {
                            id: 2,
                            type: 'section' as const,
                            title: 'L2',
                            content: [
                                {
                                    id: 3,
                                    type: 'section' as const,
                                    title: 'L3',
                                    content: [
                                        {
                                            id: 4,
                                            type: 'section' as const,
                                            title: 'L4',
                                            content: [{ id: 5, type: 'string' as const, label: 'Too deep' }],
                                        },
                                    ],
                                },
                            ],
                        },
                    ],
                },
            ])
            const registry = new Map<number, FieldEntry>([
                [1, makeEntry(1, { type: 'section' })],
                [2, makeEntry(2, { type: 'section', parentId: 1 })],
                [3, makeEntry(3, { type: 'section', parentId: 2 })],
                [4, makeEntry(4, { type: 'section', parentId: 3 })],
                [5, makeEntry(5, { parentId: 4 })],
            ])
            const issues = validator.validate(def, registry)
            expect(issues.some((i) => i.code === 'NESTING_DEPTH')).toBe(true)
        })
    })

    describe('constraint contradictions', () => {
        it('detects minLength > maxLength', () => {
            const def = minimalDef([{ id: 1, type: 'string', label: 'A', validation: { minLength: 10, maxLength: 5 } }])
            const registry = new Map<number, FieldEntry>([
                [1, makeEntry(1, { type: 'string', validation: { minLength: 10, maxLength: 5 } })],
            ])
            const issues = validator.validate(def, registry)
            expect(issues.some((i) => i.code === 'INVALID_MIN_MAX')).toBe(true)
        })

        it('detects min > max for numbers', () => {
            const def = minimalDef([{ id: 1, type: 'number', label: 'A', validation: { min: 100, max: 10 } }])
            const registry = new Map<number, FieldEntry>([
                [1, makeEntry(1, { type: 'number', validation: { min: 100, max: 10 } })],
            ])
            const issues = validator.validate(def, registry)
            expect(issues.some((i) => i.code === 'INVALID_MIN_MAX')).toBe(true)
        })

        it('detects minDate > maxDate for absolute dates', () => {
            const def = minimalDef([
                {
                    id: 1,
                    type: 'date',
                    label: 'A',
                    validation: {
                        minDate: '2030-01-01T00:00:00.000Z',
                        maxDate: '2025-01-01T00:00:00.000Z',
                    },
                },
            ])
            const registry = new Map<number, FieldEntry>([
                [
                    1,
                    makeEntry(1, {
                        type: 'date',
                        validation: {
                            minDate: '2030-01-01T00:00:00.000Z',
                            maxDate: '2025-01-01T00:00:00.000Z',
                        },
                    }),
                ],
            ])
            const issues = validator.validate(def, registry)
            expect(issues.some((i) => i.code === 'INVALID_MIN_MAX')).toBe(true)
        })

        it('skips date range check when dates are relative', () => {
            const def = minimalDef([
                { id: 1, type: 'date', label: 'A', validation: { minDate: '+1y', maxDate: '-1y' } },
            ])
            const registry = new Map<number, FieldEntry>([
                [1, makeEntry(1, { type: 'date', validation: { minDate: '+1y', maxDate: '-1y' } })],
            ])
            const issues = validator.validate(def, registry)
            expect(issues.some((i) => i.code === 'INVALID_MIN_MAX')).toBe(false)
        })

        it('detects minItems > maxItems', () => {
            const def = minimalDef([
                {
                    id: 1,
                    type: 'array',
                    label: 'A',
                    item: { type: 'string', label: 'Item' },
                    validation: { minItems: 10, maxItems: 5 },
                },
            ])
            const registry = new Map<number, FieldEntry>([
                [1, makeEntry(1, { type: 'array', validation: { minItems: 10, maxItems: 5 } })],
            ])
            const issues = validator.validate(def, registry)
            expect(issues.some((i) => i.code === 'INVALID_MIN_MAX')).toBe(true)
        })
    })

    describe('invalid regex patterns', () => {
        it('detects invalid regex pattern', () => {
            const def = minimalDef([{ id: 1, type: 'string', label: 'A', validation: { pattern: '[invalid(' } }])
            const registry = new Map<number, FieldEntry>([
                [1, makeEntry(1, { type: 'string', validation: { pattern: '[invalid(' } })],
            ])
            const issues = validator.validate(def, registry)
            expect(issues.some((i) => i.code === 'INVALID_REGEX')).toBe(true)
        })

        it('does not flag valid regex patterns', () => {
            const def = minimalDef([{ id: 1, type: 'string', label: 'A', validation: { pattern: '^[a-z]+$' } }])
            const registry = new Map<number, FieldEntry>([
                [1, makeEntry(1, { type: 'string', validation: { pattern: '^[a-z]+$' } })],
            ])
            const issues = validator.validate(def, registry)
            expect(issues.some((i) => i.code === 'INVALID_REGEX')).toBe(false)
        })
    })

    describe('condition references a section', () => {
        it('detects condition referencing a section', () => {
            const def = minimalDef([
                {
                    id: 1,
                    type: 'section' as const,
                    title: 'S',
                    content: [{ id: 2, type: 'string' as const, label: 'A' }],
                },
                { id: 3, type: 'string', label: 'B', condition: { field: 1, op: 'set' } },
            ])
            const registry = new Map<number, FieldEntry>([
                [1, makeEntry(1, { type: 'section' })],
                [2, makeEntry(2, { parentId: 1 })],
                [3, makeEntry(3, { condition: { field: 1, op: 'set' } })],
            ])
            const issues = validator.validate(def, registry)
            expect(issues.some((i) => i.code === 'CONDITION_REFS_SECTION')).toBe(true)
        })
    })

    describe('valid definitions', () => {
        it('returns no issues for a valid form definition', () => {
            const def = minimalDef([
                { id: 1, type: 'string', label: 'Name', validation: { required: true } },
                { id: 2, type: 'number', label: 'Age', validation: { min: 0, max: 150 } },
                {
                    id: 3,
                    type: 'string',
                    label: 'Detail',
                    condition: { field: 1, op: 'set' },
                },
            ])
            const registry = new Map<number, FieldEntry>([
                [1, makeEntry(1, { validation: { required: true } })],
                [2, makeEntry(2, { type: 'number', validation: { min: 0, max: 150 } })],
                [3, makeEntry(3, { condition: { field: 1, op: 'set' } })],
            ])
            const issues = validator.validate(def, registry)
            expect(issues).toEqual([])
        })
    })

    describe('multiple issues accumulated', () => {
        it('reports all issues in a single pass', () => {
            const def = minimalDef([
                { id: 1, type: 'string', label: 'A', validation: { minLength: 10, maxLength: 5 } },
                { id: 1, type: 'string', label: 'B' },
                { id: 2, type: 'string', label: 'C', condition: { field: 999, op: 'set' } },
            ])
            const registry = new Map<number, FieldEntry>([
                [1, makeEntry(1, { type: 'string', validation: { minLength: 10, maxLength: 5 } })],
                [2, makeEntry(2, { condition: { field: 999, op: 'set' } })],
            ])
            const issues = validator.validate(def, registry)
            const codes = issues.map((i) => i.code)
            expect(codes).toContain('DUPLICATE_ID')
            expect(codes).toContain('UNKNOWN_FIELD_REF')
            expect(codes).toContain('INVALID_MIN_MAX')
            expect(issues.length).toBeGreaterThanOrEqual(3)
        })
    })
})

describe('FormDefinitionValidator.validateSchema', () => {
    describe('valid inputs', () => {
        it('accepts minimal form definition', () => {
            expect(schemaValid(minimal)).toBe(true)
        })

        it('accepts form with optional description', () => {
            expect(schemaValid({ ...minimal, description: 'A test form' })).toBe(true)
        })

        it('accepts form with all field types', () => {
            expect(
                schemaValid({
                    ...minimal,
                    content: [
                        { id: 1, type: 'string', label: 'Text' },
                        { id: 2, type: 'number', label: 'Count' },
                        { id: 3, type: 'boolean', label: 'Flag' },
                        { id: 4, type: 'date', label: 'When' },
                        { id: 5, type: 'select', label: 'Choice', options: [{ value: 'a', label: 'A' }] },
                        { id: 6, type: 'array', label: 'Items', item: { type: 'string', label: 'Item' } },
                        { id: 7, type: 'file', label: 'Document' },
                    ],
                }),
            ).toBe(true)
        })

        it('accepts nested sections up to 3 levels', () => {
            expect(
                schemaValid({
                    ...minimal,
                    content: [
                        {
                            id: 1,
                            type: 'section',
                            title: 'L1',
                            content: [
                                {
                                    id: 2,
                                    type: 'section',
                                    title: 'L2',
                                    content: [
                                        {
                                            id: 3,
                                            type: 'section',
                                            title: 'L3',
                                            content: [{ id: 4, type: 'string', label: 'Deep' }],
                                        },
                                    ],
                                },
                            ],
                        },
                    ],
                }),
            ).toBe(true)
        })
    })

    describe('top-level structure', () => {
        it('rejects non-object input', () => {
            expect(schemaValid(null)).toBe(false)
            expect(schemaValid('string')).toBe(false)
            expect(schemaValid(42)).toBe(false)
            expect(schemaValid([])).toBe(false)
        })

        it('rejects missing required fields', () => {
            const result = schemaIssues({})
            expect(result.length).toBeGreaterThan(0)
            expect(result.some((i) => i.message.includes('required property "id"'))).toBe(true)
        })

        it('rejects invalid version format', () => {
            expect(schemaValid({ ...minimal, version: 'abc' })).toBe(false)
            expect(schemaValid({ ...minimal, version: '1.0' })).toBe(false)
        })

        it('accepts valid version formats', () => {
            expect(schemaValid({ ...minimal, version: '0.0.0' })).toBe(true)
            expect(schemaValid({ ...minimal, version: '10.20.30' })).toBe(true)
        })

        it('rejects empty content array', () => {
            expect(schemaValid({ ...minimal, content: [] })).toBe(false)
        })

        it('rejects additional top-level properties', () => {
            const result = schemaIssues({ ...minimal, extra: true })
            expect(result.length).toBeGreaterThan(0)
            expect(result.some((i) => i.message.includes('extra'))).toBe(true)
        })
    })

    describe('field id constraints', () => {
        it('rejects non-integer id', () => {
            expect(schemaValid({ ...minimal, content: [{ id: 1.5, type: 'string', label: 'A' }] })).toBe(false)
        })

        it('rejects zero id', () => {
            expect(schemaValid({ ...minimal, content: [{ id: 0, type: 'string', label: 'A' }] })).toBe(false)
        })

        it('rejects negative id', () => {
            expect(schemaValid({ ...minimal, content: [{ id: -1, type: 'string', label: 'A' }] })).toBe(false)
        })

        it('accepts positive integer id', () => {
            expect(schemaValid({ ...minimal, content: [{ id: 1, type: 'string', label: 'A' }] })).toBe(true)
        })
    })

    describe('field validation rules', () => {
        it('accepts string with all validation options', () => {
            expect(
                schemaValid({
                    ...minimal,
                    content: [
                        {
                            id: 1,
                            type: 'string',
                            label: 'S',
                            validation: {
                                required: true,
                                minLength: 2,
                                maxLength: 100,
                                pattern: '^[A-Z]',
                                patternMessage: 'Uppercase',
                            },
                        },
                    ],
                }),
            ).toBe(true)
        })

        it('accepts number with min/max', () => {
            expect(
                schemaValid({
                    ...minimal,
                    content: [{ id: 1, type: 'number', label: 'N', validation: { required: true, min: 0, max: 150 } }],
                }),
            ).toBe(true)
        })

        it('accepts boolean with required', () => {
            expect(
                schemaValid({
                    ...minimal,
                    content: [{ id: 1, type: 'boolean', label: 'B', validation: { required: true } }],
                }),
            ).toBe(true)
        })

        it('accepts date with absolute dates', () => {
            expect(
                schemaValid({
                    ...minimal,
                    content: [
                        {
                            id: 1,
                            type: 'date',
                            label: 'D',
                            validation: { minDate: '2024-01-01T00:00:00.000Z', maxDate: '2030-12-31T23:59:59.999Z' },
                        },
                    ],
                }),
            ).toBe(true)
        })

        it('accepts date with relative dates', () => {
            expect(
                schemaValid({
                    ...minimal,
                    content: [{ id: 1, type: 'date', label: 'D', validation: { minDate: '-5d', maxDate: '+1y' } }],
                }),
            ).toBe(true)
        })

        it('rejects date with invalid date format', () => {
            expect(
                schemaValid({
                    ...minimal,
                    content: [{ id: 1, type: 'date', label: 'D', validation: { minDate: 'not-a-date' } }],
                }),
            ).toBe(false)
        })

        it('rejects date with short ISO date (requires full timestamp)', () => {
            expect(
                schemaValid({
                    ...minimal,
                    content: [{ id: 1, type: 'date', label: 'D', validation: { minDate: '2025-01-01' } }],
                }),
            ).toBe(false)
        })

        it('rejects unknown validation properties', () => {
            expect(
                schemaValid({
                    ...minimal,
                    content: [{ id: 1, type: 'string', label: 'S', validation: { foo: true } }],
                }),
            ).toBe(false)
        })

        it('accepts array with item validation', () => {
            expect(
                schemaValid({
                    ...minimal,
                    content: [
                        {
                            id: 1,
                            type: 'array',
                            label: 'Tags',
                            item: { type: 'string', label: 'Tag', validation: { minLength: 1, maxLength: 50 } },
                            validation: { minItems: 1, maxItems: 10 },
                        },
                    ],
                }),
            ).toBe(true)
        })
    })

    describe('file fields', () => {
        it('accepts valid file field', () => {
            expect(schemaValid({ ...minimal, content: [{ id: 1, type: 'file', label: 'Resume' }] })).toBe(true)
        })

        it('accepts file field with required validation', () => {
            expect(
                schemaValid({
                    ...minimal,
                    content: [{ id: 1, type: 'file', label: 'Resume', validation: { required: true } }],
                }),
            ).toBe(true)
        })

        it('rejects file field with unsupported validation property', () => {
            expect(
                schemaValid({
                    ...minimal,
                    content: [{ id: 1, type: 'file', label: 'Resume', validation: { minLength: 5 } }],
                }),
            ).toBe(false)
        })

        it('rejects file field with extra properties', () => {
            expect(
                schemaValid({
                    ...minimal,
                    content: [{ id: 1, type: 'file', label: 'Resume', extra: true }],
                }),
            ).toBe(false)
        })

        it('accepts array with file item type', () => {
            expect(
                schemaValid({
                    ...minimal,
                    content: [
                        {
                            id: 1,
                            type: 'array',
                            label: 'Attachments',
                            item: { type: 'file', label: 'Attachment' },
                            validation: { minItems: 1, maxItems: 5 },
                        },
                    ],
                }),
            ).toBe(true)
        })
    })

    describe('select fields', () => {
        it('accepts select with string options', () => {
            expect(
                schemaValid({
                    ...minimal,
                    content: [{ id: 1, type: 'select', label: 'S', options: [{ value: 'a', label: 'A' }] }],
                }),
            ).toBe(true)
        })

        it('accepts select with numeric options', () => {
            expect(
                schemaValid({
                    ...minimal,
                    content: [{ id: 1, type: 'select', label: 'S', options: [{ value: 1, label: 'One' }] }],
                }),
            ).toBe(true)
        })

        it('rejects select without options', () => {
            expect(schemaValid({ ...minimal, content: [{ id: 1, type: 'select', label: 'S' }] })).toBe(false)
        })

        it('rejects select with empty options', () => {
            expect(schemaValid({ ...minimal, content: [{ id: 1, type: 'select', label: 'S', options: [] }] })).toBe(
                false,
            )
        })
    })

    describe('array fields', () => {
        it('rejects array without item', () => {
            expect(schemaValid({ ...minimal, content: [{ id: 1, type: 'array', label: 'A' }] })).toBe(false)
        })

        it('accepts array with select item', () => {
            expect(
                schemaValid({
                    ...minimal,
                    content: [
                        {
                            id: 1,
                            type: 'array',
                            label: 'Days',
                            item: { type: 'select', label: 'Day', options: [{ value: 'mon', label: 'Monday' }] },
                        },
                    ],
                }),
            ).toBe(true)
        })

        it('rejects array item with id property', () => {
            expect(
                schemaValid({
                    ...minimal,
                    content: [{ id: 1, type: 'array', label: 'A', item: { id: 99, type: 'string', label: 'I' } }],
                }),
            ).toBe(false)
        })

        it('accepts all scalar item types', () => {
            for (const type of ['string', 'number', 'boolean', 'date', 'blockchain', 'sustainability']) {
                expect(
                    schemaValid({
                        ...minimal,
                        content: [{ id: 1, type: 'array', label: 'A', item: { type, label: 'I' } }],
                    }),
                ).toBe(true)
            }
        })
    })

    describe('conditions', () => {
        it('accepts set/notset without value', () => {
            expect(
                schemaValid({
                    ...minimal,
                    content: [
                        { id: 1, type: 'string', label: 'A' },
                        { id: 2, type: 'string', label: 'B', condition: { field: 1, op: 'set' } },
                    ],
                }),
            ).toBe(true)
            expect(
                schemaValid({
                    ...minimal,
                    content: [
                        { id: 1, type: 'string', label: 'A' },
                        { id: 2, type: 'string', label: 'B', condition: { field: 1, op: 'notset' } },
                    ],
                }),
            ).toBe(true)
        })

        it('accepts comparison operators with value', () => {
            for (const op of ['eq', 'ne', 'lt', 'gt', 'lte', 'gte']) {
                expect(
                    schemaValid({
                        ...minimal,
                        content: [
                            { id: 1, type: 'number', label: 'A' },
                            { id: 2, type: 'string', label: 'B', condition: { field: 1, op, value: 10 } },
                        ],
                    }),
                ).toBe(true)
            }
        })

        it('accepts in/notin with array value', () => {
            expect(
                schemaValid({
                    ...minimal,
                    content: [
                        { id: 1, type: 'string', label: 'A' },
                        { id: 2, type: 'string', label: 'B', condition: { field: 1, op: 'in', value: ['a', 'b'] } },
                    ],
                }),
            ).toBe(true)
        })

        it('rejects in with non-array value', () => {
            expect(
                schemaValid({
                    ...minimal,
                    content: [
                        { id: 1, type: 'string', label: 'A' },
                        { id: 2, type: 'string', label: 'B', condition: { field: 1, op: 'in', value: 'not-array' } },
                    ],
                }),
            ).toBe(false)
        })

        it('rejects unknown operator', () => {
            expect(
                schemaValid({
                    ...minimal,
                    content: [
                        { id: 1, type: 'string', label: 'A' },
                        { id: 2, type: 'string', label: 'B', condition: { field: 1, op: 'contains', value: 'x' } },
                    ],
                }),
            ).toBe(false)
        })

        it('accepts compound and condition', () => {
            expect(
                schemaValid({
                    ...minimal,
                    content: [
                        { id: 1, type: 'boolean', label: 'A' },
                        { id: 2, type: 'boolean', label: 'B' },
                        {
                            id: 3,
                            type: 'string',
                            label: 'C',
                            condition: {
                                and: [
                                    { field: 1, op: 'eq', value: true },
                                    { field: 2, op: 'eq', value: true },
                                ],
                            },
                        },
                    ],
                }),
            ).toBe(true)
        })

        it('accepts compound or condition', () => {
            expect(
                schemaValid({
                    ...minimal,
                    content: [
                        { id: 1, type: 'string', label: 'A' },
                        {
                            id: 2,
                            type: 'string',
                            label: 'B',
                            condition: {
                                or: [
                                    { field: 1, op: 'eq', value: 'x' },
                                    { field: 1, op: 'eq', value: 'y' },
                                ],
                            },
                        },
                    ],
                }),
            ).toBe(true)
        })

        it('accepts nested compound conditions', () => {
            expect(
                schemaValid({
                    ...minimal,
                    content: [
                        { id: 1, type: 'string', label: 'A' },
                        { id: 2, type: 'number', label: 'B' },
                        {
                            id: 3,
                            type: 'string',
                            label: 'C',
                            condition: {
                                and: [
                                    { field: 1, op: 'set' },
                                    {
                                        or: [
                                            { field: 2, op: 'gt', value: 10 },
                                            { field: 2, op: 'lt', value: 0 },
                                        ],
                                    },
                                ],
                            },
                        },
                    ],
                }),
            ).toBe(true)
        })

        it('rejects condition with non-integer field reference', () => {
            expect(
                schemaValid({
                    ...minimal,
                    content: [
                        { id: 1, type: 'string', label: 'A' },
                        { id: 2, type: 'string', label: 'B', condition: { field: 1.5, op: 'set' } },
                    ],
                }),
            ).toBe(false)
        })

        it('rejects condition with zero field reference', () => {
            expect(
                schemaValid({
                    ...minimal,
                    content: [
                        { id: 1, type: 'string', label: 'A' },
                        { id: 2, type: 'string', label: 'B', condition: { field: 0, op: 'set' } },
                    ],
                }),
            ).toBe(false)
        })
    })

    describe('sections', () => {
        it('accepts section with fields', () => {
            expect(
                schemaValid({
                    ...minimal,
                    content: [{ id: 1, type: 'section', title: 'S', content: [{ id: 2, type: 'string', label: 'A' }] }],
                }),
            ).toBe(true)
        })

        it('accepts section with description and condition', () => {
            expect(
                schemaValid({
                    ...minimal,
                    content: [
                        { id: 1, type: 'boolean', label: 'Toggle' },
                        {
                            id: 2,
                            type: 'section',
                            title: 'S',
                            description: 'Info',
                            condition: { field: 1, op: 'eq', value: true },
                            content: [{ id: 3, type: 'string', label: 'A' }],
                        },
                    ],
                }),
            ).toBe(true)
        })

        it('rejects section with empty content', () => {
            expect(schemaValid({ ...minimal, content: [{ id: 1, type: 'section', title: 'S', content: [] }] })).toBe(
                false,
            )
        })

        it('rejects section without title', () => {
            expect(
                schemaValid({
                    ...minimal,
                    content: [{ id: 1, type: 'section', content: [{ id: 2, type: 'string', label: 'A' }] }],
                }),
            ).toBe(false)
        })
    })

    describe('error output', () => {
        it('all issues have code SCHEMA_INVALID', () => {
            const result = schemaIssues({})
            expect(result.length).toBeGreaterThan(0)
            expect(result.every((i) => i.code === 'SCHEMA_INVALID')).toBe(true)
        })

        it('returns multiple errors with allErrors mode', () => {
            const result = schemaIssues({ id: 123, version: 'bad' })
            expect(result.length).toBeGreaterThan(1)
        })

        it('formats unsupported properties with readable paths', () => {
            const result = schemaIssues({ ...minimal, content: [{ id: 1, type: 'string', label: 'A', extra: true }] })

            expect(result).toContainEqual(
                expect.objectContaining({
                    code: 'SCHEMA_INVALID',
                    message: 'Content item 1 has unsupported property: "extra".',
                    params: expect.objectContaining({
                        keyword: 'additionalProperties',
                        path: '/content/0',
                        property: 'extra',
                    }),
                }),
            )
        })

        it('deduplicates oneOf branch errors and suppresses generic oneOf errors', () => {
            const result = schemaIssues({
                ...minimal,
                content: [
                    {
                        id: 1,
                        type: 'section',
                        title: 'Section',
                        content: [{ id: 2, label: 'Name', validation: { required: true, maxLength: 10 } }],
                    },
                ],
            })
            const messages = result.map((issue) => issue.message)

            expect(messages).toContain('Content item 1 > content item 1 is missing required property "type".')
            expect(messages).toContain(
                'Content item 1 > content item 1 validation has unsupported properties: "maxLength", "required".',
            )
            expect(messages).not.toContain('Content item 1 is invalid.')
            expect(messages).not.toContain('Content item 1 > content item 1 is invalid.')
            expect(messages.filter((message) => message.includes('required property "type"'))).toHaveLength(1)
        })

        it('does not report required properties from unrelated oneOf branches for known item types', () => {
            const result = schemaIssues({
                ...minimal,
                content: [{ id: 1, type: 'section', content: [{ id: 2, type: 'string', label: 'Name' }] }],
            })
            const messages = result.map((issue) => issue.message)

            expect(messages).toContain('Content item 1 is missing required property "title".')
            expect(messages).not.toContain('Content item 1 is missing required property "label".')
            expect(messages).not.toContain('Content item 1 is missing required property "options".')
            expect(messages).not.toContain('Content item 1 is missing required property "item".')
        })

        it('formats invalid type errors with readable paths', () => {
            const result = schemaIssues({ ...minimal, content: [{ id: 'bad', type: 'string', label: 'A' }] })

            expect(result).toContainEqual(
                expect.objectContaining({
                    code: 'SCHEMA_INVALID',
                    message: 'Content item 1 > id must be an integer.',
                    params: expect.objectContaining({
                        keyword: 'type',
                        path: '/content/0/id',
                        property: 'id',
                    }),
                }),
            )
        })

        it('returns empty array for valid input', () => {
            expect(schemaIssues(minimal)).toEqual([])
        })
    })

    describe('authoring metadata (placeholder / answer_guidelines / reference_id)', () => {
        const METADATA = {
            placeholder: 'Acme Ltd',
            answer_guidelines: 'Use the registered name',
            reference_id: 'KYI-3.1.a',
        }

        const fieldOfType = (type: string): Record<string, unknown> => {
            if (type === 'static') return { id: 1, type, text: 'Read this first.' }

            const base: Record<string, unknown> = { id: 1, type, label: 'Field' }
            if (type === 'select' || type === 'multiselect') base.options = [{ value: 'a', label: 'A' }]
            if (type === 'array') base.item = { type: 'string', label: 'Item' }
            return base
        }

        const FIELD_TYPES = [
            'string',
            'number',
            'boolean',
            'date',
            'select',
            'multiselect',
            'array',
            'file',
            'static',
            'blockchain',
            'sustainability',
        ]

        it.each(FIELD_TYPES)('accepts the metadata on a %s field', (type) => {
            expect(schemaValid({ ...minimal, content: [{ ...fieldOfType(type), ...METADATA }] })).toBe(true)
        })

        it.each(FIELD_TYPES)('still accepts a %s field without any of the metadata', (type) => {
            expect(schemaValid({ ...minimal, content: [fieldOfType(type)] })).toBe(true)
        })

        it('accepts the metadata on a section', () => {
            const content = [
                {
                    id: 1,
                    type: 'section',
                    title: 'Details',
                    ...METADATA,
                    content: [{ id: 2, type: 'string', label: 'Name' }],
                },
            ]
            expect(schemaValid({ ...minimal, content })).toBe(true)
        })

        it.each([
            'string',
            'number',
            'boolean',
            'date',
            'select',
            'file',
        ])('accepts the metadata on a %s array item', (type) => {
            const item: Record<string, unknown> = { type, label: 'Item', ...METADATA }
            if (type === 'select') item.options = [{ value: 'a', label: 'A' }]
            expect(schemaValid({ ...minimal, content: [{ id: 1, type: 'array', label: 'Tags', item }] })).toBe(true)
        })

        it('still rejects an unknown property on a field', () => {
            const issues = schemaIssues({ ...minimal, content: [{ id: 1, type: 'string', label: 'Name', nope: 'x' }] })
            expect(issues.some((i) => i.code === 'SCHEMA_INVALID' && i.message.includes('"nope"'))).toBe(true)
        })

        it('still rejects an unknown property on a section', () => {
            const content = [
                { id: 1, type: 'section', title: 'S', nope: 'x', content: [{ id: 2, type: 'string', label: 'N' }] },
            ]
            const issues = schemaIssues({ ...minimal, content })
            expect(issues.some((i) => i.code === 'SCHEMA_INVALID' && i.message.includes('"nope"'))).toBe(true)
        })

        it('does not report the metadata as unsupported alongside an unrelated error', () => {
            const issues = schemaIssues({ ...minimal, content: [{ id: 1, type: 'string', ...METADATA }] })
            expect(issues.length).toBeGreaterThan(0)
            for (const key of ['placeholder', 'answer_guidelines', 'reference_id']) {
                expect(issues.some((i) => i.message.includes(`"${key}"`))).toBe(false)
            }
        })
    })
    describe('static fields', () => {
        it('accepts a static field with only id, type and text', () => {
            expect(schemaValid({ ...minimal, content: [{ id: 1, type: 'static', text: 'Read this first.' }] })).toBe(
                true,
            )
        })

        it('accepts a static field with an optional label', () => {
            const content = [{ id: 1, type: 'static', text: 'Read this first.', label: 'Before you begin' }]
            expect(schemaValid({ ...minimal, content })).toBe(true)
        })

        it('accepts a static field with a condition', () => {
            const content = [
                { id: 1, type: 'boolean', label: 'Agree' },
                { id: 2, type: 'static', text: 'Thanks.', condition: { field: 1, op: 'eq', value: true } },
            ]
            expect(schemaValid({ ...minimal, content })).toBe(true)
        })

        it('rejects a static field without text', () => {
            const issues = schemaIssues({ ...minimal, content: [{ id: 1, type: 'static', label: 'Note' }] })
            expect(issues.some((i) => i.code === 'SCHEMA_INVALID' && i.message.includes('"text"'))).toBe(true)
        })

        it('rejects validation on a static field', () => {
            const content = [{ id: 1, type: 'static', text: 'Note', validation: { required: true } }]
            const issues = schemaIssues({ ...minimal, content })
            expect(issues.some((i) => i.code === 'SCHEMA_INVALID' && i.message.includes('"validation"'))).toBe(true)
        })

        it('rejects options on a static field', () => {
            const content = [{ id: 1, type: 'static', text: 'Note', options: [{ value: 'a', label: 'A' }] }]
            const issues = schemaIssues({ ...minimal, content })
            expect(issues.some((i) => i.code === 'SCHEMA_INVALID' && i.message.includes('"options"'))).toBe(true)
        })

        it('rejects a static field as an array item', () => {
            const content = [{ id: 1, type: 'array', label: 'Notes', item: { type: 'static', text: 'Note' } }]
            expect(schemaValid({ ...minimal, content })).toBe(false)
        })

        it('reports CONDITION_REFS_STATIC when a condition references a static field', () => {
            const registry = new Map<number, FieldEntry>([
                [1, makeEntry(1, { type: 'static' })],
                [2, makeEntry(2, { condition: { field: 1, op: 'set' } })],
            ])
            const issues = validator.validate(minimalDef([]), registry)
            expect(issues.some((i) => i.code === 'CONDITION_REFS_STATIC' && i.itemId === 2)).toBe(true)
        })

        it('still reports CONDITION_REFS_SECTION for a section reference', () => {
            const registry = new Map<number, FieldEntry>([
                [1, makeEntry(1, { type: 'section' })],
                [2, makeEntry(2, { condition: { field: 1, op: 'set' } })],
            ])
            const issues = validator.validate(minimalDef([]), registry)
            expect(issues.some((i) => i.code === 'CONDITION_REFS_SECTION' && i.itemId === 2)).toBe(true)
            expect(issues.some((i) => i.code === 'CONDITION_REFS_STATIC')).toBe(false)
        })

        it('accepts a condition on a static field that references a real field', () => {
            const registry = new Map<number, FieldEntry>([
                [1, makeEntry(1, { type: 'boolean' })],
                [2, makeEntry(2, { type: 'static', condition: { field: 1, op: 'eq', value: true } })],
            ])
            expect(validator.validate(minimalDef([]), registry)).toEqual([])
        })
    })

    describe('multiselect fields', () => {
        const multiselect = (extra: Record<string, unknown> = {}) => ({
            id: 1,
            type: 'multiselect',
            label: 'Licences held',
            options: [
                { value: 'a', label: 'A' },
                { value: 'b', label: 'B' },
            ],
            ...extra,
        })

        it('accepts a multiselect field with options', () => {
            expect(schemaValid({ ...minimal, content: [multiselect()] })).toBe(true)
        })

        it('accepts required validation', () => {
            expect(schemaValid({ ...minimal, content: [multiselect({ validation: { required: true } })] })).toBe(true)
        })

        it('rejects a multiselect field without options', () => {
            const issues = schemaIssues({ ...minimal, content: [{ id: 1, type: 'multiselect', label: 'L' }] })
            expect(issues.some((i) => i.code === 'SCHEMA_INVALID' && i.message.includes('"options"'))).toBe(true)
        })

        it('rejects an empty options list', () => {
            expect(schemaValid({ ...minimal, content: [multiselect({ options: [] })] })).toBe(false)
        })

        it('rejects unsupported validation rules', () => {
            expect(schemaValid({ ...minimal, content: [multiselect({ validation: { minItems: 1 } })] })).toBe(false)
        })

        it('rejects a multiselect field as an array item', () => {
            const item = { type: 'multiselect', label: 'Item', options: [{ value: 'a', label: 'A' }] }
            expect(schemaValid({ ...minimal, content: [{ id: 1, type: 'array', label: 'Rows', item }] })).toBe(false)
        })
    })

    describe('backward compatibility', () => {
        it('accepts a definition written before static and multiselect existed', () => {
            const legacy = {
                id: 'employee-onboarding',
                version: '1.0.0',
                title: 'Employee Onboarding',
                content: [
                    {
                        id: 1,
                        type: 'section',
                        title: 'Personal Information',
                        content: [
                            { id: 2, type: 'string', label: 'Full Name', validation: { required: true, minLength: 2 } },
                            { id: 3, type: 'date', label: 'Date of Birth' },
                            {
                                id: 4,
                                type: 'select',
                                label: 'Employment Type',
                                options: [
                                    { value: 'full-time', label: 'Full-time' },
                                    { value: 'contract', label: 'Contract' },
                                ],
                                validation: { required: true },
                            },
                            {
                                id: 5,
                                type: 'date',
                                label: 'Contract End Date',
                                condition: { field: 4, op: 'eq', value: 'contract' },
                            },
                            {
                                id: 6,
                                type: 'array',
                                label: 'Certifications',
                                item: { type: 'string', label: 'Certification' },
                                validation: { minItems: 1, maxItems: 10 },
                            },
                            { id: 7, type: 'file', label: 'Resume' },
                            { id: 8, type: 'boolean', label: 'I agree', validation: { required: true } },
                            { id: 9, type: 'number', label: 'Weekly Hours', validation: { min: 1, max: 40 } },
                        ],
                    },
                ],
            }
            expect(schemaIssues(legacy)).toEqual([])
        })
    })

    describe('blockchain and sustainability fields', () => {
        it('accepts a blockchain field', () => {
            expect(
                schemaValid({
                    ...minimal,
                    content: [{ id: 1, type: 'blockchain', label: 'Token', validation: { required: true } }],
                }),
            ).toBe(true)
        })

        it('accepts a sustainability field', () => {
            expect(
                schemaValid({
                    ...minimal,
                    content: [{ id: 1, type: 'sustainability', label: 'Footprint', validation: { required: true } }],
                }),
            ).toBe(true)
        })

        it('rejects unknown validation rules on a blockchain field', () => {
            expect(
                schemaValid({
                    ...minimal,
                    content: [{ id: 1, type: 'blockchain', label: 'Token', validation: { pattern: '^eip155' } }],
                }),
            ).toBe(false)
        })

        it('rejects a blockchain field without a label', () => {
            expect(schemaValid({ ...minimal, content: [{ id: 1, type: 'blockchain' }] })).toBe(false)
        })

        it('accepts both as array item types', () => {
            for (const type of ['blockchain', 'sustainability']) {
                expect(
                    schemaValid({
                        ...minimal,
                        content: [{ id: 1, type: 'array', label: 'Assets', item: { type, label: 'Asset' } }],
                    }),
                ).toBe(true)
            }
        })

        it.each([
            'blockchain',
            'sustainability',
        ] as const)('accepts a condition referencing a %s field -- neither is valueless', (type) => {
            const def = minimalDef([
                { id: 1, type, label: 'Asset' },
                { id: 2, type: 'string', label: 'Notes', condition: { field: 1, op: 'set' } },
            ])
            const registry = new Map<number, FieldEntry>([
                [1, makeEntry(1, { type })],
                [2, makeEntry(2, { condition: { field: 1, op: 'set' } })],
            ])
            expect(validator.validate(def, registry)).toEqual([])
        })
    })
})
