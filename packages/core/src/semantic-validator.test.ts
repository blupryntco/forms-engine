import { SemanticValidator } from './semantic-validator'
import type { FieldEntry, FormDefinition } from './types'

const validator = new SemanticValidator()

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

describe('SemanticValidator', () => {
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
            expect(issues.some((i) => i.code === 'INVALID_RANGE_MIN_MAX_LENGTH')).toBe(true)
        })

        it('detects min > max for numbers', () => {
            const def = minimalDef([{ id: 1, type: 'number', label: 'A', validation: { min: 100, max: 10 } }])
            const registry = new Map<number, FieldEntry>([
                [1, makeEntry(1, { type: 'number', validation: { min: 100, max: 10 } })],
            ])
            const issues = validator.validate(def, registry)
            expect(issues.some((i) => i.code === 'INVALID_RANGE_MIN_MAX')).toBe(true)
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
            expect(issues.some((i) => i.code === 'INVALID_RANGE_DATE')).toBe(true)
        })

        it('skips date range check when dates are relative', () => {
            const def = minimalDef([
                { id: 1, type: 'date', label: 'A', validation: { minDate: '+1y', maxDate: '-1y' } },
            ])
            const registry = new Map<number, FieldEntry>([
                [1, makeEntry(1, { type: 'date', validation: { minDate: '+1y', maxDate: '-1y' } })],
            ])
            const issues = validator.validate(def, registry)
            expect(issues.some((i) => i.code === 'INVALID_RANGE_DATE')).toBe(false)
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
            expect(issues.some((i) => i.code === 'INVALID_RANGE_ITEMS')).toBe(true)
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
            expect(codes).toContain('INVALID_RANGE_MIN_MAX_LENGTH')
            expect(issues.length).toBeGreaterThanOrEqual(3)
        })
    })
})
