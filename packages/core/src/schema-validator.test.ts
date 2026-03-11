import { validateSchema } from './schema-validator'

const minimal = {
    id: 'test-form',
    version: '1.0.0',
    title: 'Test Form',
    content: [{ id: 1, type: 'string', label: 'Name' }],
}

// ── Helpers ──

const issues = (input: unknown) => validateSchema(input)
const valid = (input: unknown) => validateSchema(input).length === 0

// ════════════════════════════════════════════════════════════════════════════
// Valid schemas
// ════════════════════════════════════════════════════════════════════════════

describe('validateSchema — valid inputs', () => {
    it('accepts minimal form definition', () => {
        expect(valid(minimal)).toBe(true)
    })

    it('accepts form with optional description', () => {
        expect(valid({ ...minimal, description: 'A test form' })).toBe(true)
    })

    it('accepts form with all field types', () => {
        expect(
            valid({
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
            valid({
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

// ════════════════════════════════════════════════════════════════════════════
// Top-level structure
// ════════════════════════════════════════════════════════════════════════════

describe('validateSchema — top-level structure', () => {
    it('rejects non-object input', () => {
        expect(valid(null)).toBe(false)
        expect(valid('string')).toBe(false)
        expect(valid(42)).toBe(false)
        expect(valid([])).toBe(false)
    })

    it('rejects missing required fields', () => {
        const result = issues({})
        expect(result.length).toBeGreaterThan(0)
        expect(result.some((i) => i.message.includes("'id'"))).toBe(true)
    })

    it('rejects invalid version format', () => {
        expect(valid({ ...minimal, version: 'abc' })).toBe(false)
        expect(valid({ ...minimal, version: '1.0' })).toBe(false)
    })

    it('accepts valid version formats', () => {
        expect(valid({ ...minimal, version: '0.0.0' })).toBe(true)
        expect(valid({ ...minimal, version: '10.20.30' })).toBe(true)
    })

    it('rejects empty content array', () => {
        expect(valid({ ...minimal, content: [] })).toBe(false)
    })

    it('rejects additional top-level properties', () => {
        const result = issues({ ...minimal, extra: true })
        expect(result.length).toBeGreaterThan(0)
        expect(result.some((i) => i.message.includes('extra'))).toBe(true)
    })
})

// ════════════════════════════════════════════════════════════════════════════
// Field IDs
// ════════════════════════════════════════════════════════════════════════════

describe('validateSchema — field id constraints', () => {
    it('rejects non-integer id', () => {
        expect(valid({ ...minimal, content: [{ id: 1.5, type: 'string', label: 'A' }] })).toBe(false)
    })

    it('rejects zero id', () => {
        expect(valid({ ...minimal, content: [{ id: 0, type: 'string', label: 'A' }] })).toBe(false)
    })

    it('rejects negative id', () => {
        expect(valid({ ...minimal, content: [{ id: -1, type: 'string', label: 'A' }] })).toBe(false)
    })

    it('accepts positive integer id', () => {
        expect(valid({ ...minimal, content: [{ id: 1, type: 'string', label: 'A' }] })).toBe(true)
    })
})

// ════════════════════════════════════════════════════════════════════════════
// Validation rules per field type
// ════════════════════════════════════════════════════════════════════════════

describe('validateSchema — field validation rules', () => {
    it('accepts string with all validation options', () => {
        expect(
            valid({
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
            valid({
                ...minimal,
                content: [{ id: 1, type: 'number', label: 'N', validation: { required: true, min: 0, max: 150 } }],
            }),
        ).toBe(true)
    })

    it('accepts boolean with required', () => {
        expect(
            valid({
                ...minimal,
                content: [{ id: 1, type: 'boolean', label: 'B', validation: { required: true } }],
            }),
        ).toBe(true)
    })

    it('accepts date with absolute dates', () => {
        expect(
            valid({
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
            valid({
                ...minimal,
                content: [{ id: 1, type: 'date', label: 'D', validation: { minDate: '-5d', maxDate: '+1y' } }],
            }),
        ).toBe(true)
    })

    it('rejects date with invalid date format', () => {
        expect(
            valid({
                ...minimal,
                content: [{ id: 1, type: 'date', label: 'D', validation: { minDate: 'not-a-date' } }],
            }),
        ).toBe(false)
    })

    it('rejects date with short ISO date (requires full timestamp)', () => {
        expect(
            valid({
                ...minimal,
                content: [{ id: 1, type: 'date', label: 'D', validation: { minDate: '2025-01-01' } }],
            }),
        ).toBe(false)
    })

    it('rejects unknown validation properties', () => {
        expect(
            valid({
                ...minimal,
                content: [{ id: 1, type: 'string', label: 'S', validation: { foo: true } }],
            }),
        ).toBe(false)
    })

    it('accepts array with item validation', () => {
        expect(
            valid({
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

// ════════════════════════════════════════════════════════════════════════════
// File fields
// ════════════════════════════════════════════════════════════════════════════

describe('validateSchema — file fields', () => {
    it('accepts valid file field', () => {
        expect(valid({ ...minimal, content: [{ id: 1, type: 'file', label: 'Resume' }] })).toBe(true)
    })

    it('accepts file field with required validation', () => {
        expect(
            valid({
                ...minimal,
                content: [{ id: 1, type: 'file', label: 'Resume', validation: { required: true } }],
            }),
        ).toBe(true)
    })

    it('rejects file field with unsupported validation property', () => {
        expect(
            valid({
                ...minimal,
                content: [{ id: 1, type: 'file', label: 'Resume', validation: { minLength: 5 } }],
            }),
        ).toBe(false)
    })

    it('rejects file field with extra properties', () => {
        expect(
            valid({
                ...minimal,
                content: [{ id: 1, type: 'file', label: 'Resume', extra: true }],
            }),
        ).toBe(false)
    })

    it('accepts array with file item type', () => {
        expect(
            valid({
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

// ════════════════════════════════════════════════════════════════════════════
// Select fields
// ════════════════════════════════════════════════════════════════════════════

describe('validateSchema — select fields', () => {
    it('accepts select with string options', () => {
        expect(
            valid({
                ...minimal,
                content: [{ id: 1, type: 'select', label: 'S', options: [{ value: 'a', label: 'A' }] }],
            }),
        ).toBe(true)
    })

    it('accepts select with numeric options', () => {
        expect(
            valid({
                ...minimal,
                content: [{ id: 1, type: 'select', label: 'S', options: [{ value: 1, label: 'One' }] }],
            }),
        ).toBe(true)
    })

    it('rejects select without options', () => {
        expect(valid({ ...minimal, content: [{ id: 1, type: 'select', label: 'S' }] })).toBe(false)
    })

    it('rejects select with empty options', () => {
        expect(valid({ ...minimal, content: [{ id: 1, type: 'select', label: 'S', options: [] }] })).toBe(false)
    })
})

// ════════════════════════════════════════════════════════════════════════════
// Array fields
// ════════════════════════════════════════════════════════════════════════════

describe('validateSchema — array fields', () => {
    it('rejects array without item', () => {
        expect(valid({ ...minimal, content: [{ id: 1, type: 'array', label: 'A' }] })).toBe(false)
    })

    it('accepts array with select item', () => {
        expect(
            valid({
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
            valid({
                ...minimal,
                content: [{ id: 1, type: 'array', label: 'A', item: { id: 99, type: 'string', label: 'I' } }],
            }),
        ).toBe(false)
    })

    it('accepts all scalar item types', () => {
        for (const type of ['string', 'number', 'boolean', 'date']) {
            expect(
                valid({
                    ...minimal,
                    content: [{ id: 1, type: 'array', label: 'A', item: { type, label: 'I' } }],
                }),
            ).toBe(true)
        }
    })
})

// ════════════════════════════════════════════════════════════════════════════
// Conditions
// ════════════════════════════════════════════════════════════════════════════

describe('validateSchema — conditions', () => {
    it('accepts set/notset without value', () => {
        expect(
            valid({
                ...minimal,
                content: [
                    { id: 1, type: 'string', label: 'A' },
                    { id: 2, type: 'string', label: 'B', condition: { field: 1, op: 'set' } },
                ],
            }),
        ).toBe(true)
        expect(
            valid({
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
                valid({
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
            valid({
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
            valid({
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
            valid({
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
            valid({
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
            valid({
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
            valid({
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
            valid({
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
            valid({
                ...minimal,
                content: [
                    { id: 1, type: 'string', label: 'A' },
                    { id: 2, type: 'string', label: 'B', condition: { field: 0, op: 'set' } },
                ],
            }),
        ).toBe(false)
    })
})

// ════════════════════════════════════════════════════════════════════════════
// Sections
// ════════════════════════════════════════════════════════════════════════════

describe('validateSchema — sections', () => {
    it('accepts section with fields', () => {
        expect(
            valid({
                ...minimal,
                content: [{ id: 1, type: 'section', title: 'S', content: [{ id: 2, type: 'string', label: 'A' }] }],
            }),
        ).toBe(true)
    })

    it('accepts section with description and condition', () => {
        expect(
            valid({
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
        expect(valid({ ...minimal, content: [{ id: 1, type: 'section', title: 'S', content: [] }] })).toBe(false)
    })

    it('rejects section without title', () => {
        expect(
            valid({
                ...minimal,
                content: [{ id: 1, type: 'section', content: [{ id: 2, type: 'string', label: 'A' }] }],
            }),
        ).toBe(false)
    })
})

// ════════════════════════════════════════════════════════════════════════════
// Error output format
// ════════════════════════════════════════════════════════════════════════════

describe('validateSchema — error output', () => {
    it('all issues have code SCHEMA_INVALID', () => {
        const result = issues({})
        expect(result.length).toBeGreaterThan(0)
        expect(result.every((i) => i.code === 'SCHEMA_INVALID')).toBe(true)
    })

    it('returns multiple errors with allErrors mode', () => {
        const result = issues({ id: 123, version: 'bad' })
        expect(result.length).toBeGreaterThan(1)
    })

    it('each issue has path and message in message field', () => {
        const result = issues({ ...minimal, content: [{ id: 1, type: 'string', label: 'A', extra: true }] })
        expect(result.length).toBeGreaterThan(0)
        expect(result[0]!.message).toContain('extra')
    })

    it('returns empty array for valid input', () => {
        expect(issues(minimal)).toEqual([])
    })
})
