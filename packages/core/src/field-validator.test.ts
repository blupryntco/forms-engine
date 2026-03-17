import { FieldValidator } from './field-validator'
import type { FieldEntry } from './types/field-entry'
import type { FieldType } from './types/field-types'

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

const allVisible = (...ids: number[]): Map<number, boolean> => {
    const map = new Map<number, boolean>()
    for (const id of ids) map.set(id, true)
    return map
}

const now = new Date('2025-06-15T00:00:00.000Z')

describe('FieldValidator', () => {
    describe('validator registration', () => {
        const fieldTypes: FieldType[] = ['string', 'number', 'boolean', 'date', 'select', 'array', 'file']

        it.each(fieldTypes.filter((t) => t !== 'array'))('has a validator registered for "%s" field type', (type) => {
            const entry = makeEntry(1, {
                type,
                validation: { required: true },
                options: type === 'select' ? [{ value: 'a', label: 'A' }] : undefined,
            })
            const registry = new Map<number, FieldEntry>([[1, entry]])
            const validator = new FieldValidator(registry)
            const result = validator.validate({}, allVisible(1), now)
            expect(result.fieldErrors.has(1)).toBe(true)
        })

        it('has a validator registered for "array" field type', () => {
            const entry = makeEntry(1, {
                type: 'array',
                validation: { minItems: 1 },
                item: { type: 'string', label: 'Item' },
            })
            const registry = new Map<number, FieldEntry>([[1, entry]])
            const validator = new FieldValidator(registry)
            const result = validator.validate({ '1': [] }, allVisible(1), now)
            expect(result.fieldErrors.has(1)).toBe(true)
        })
    })

    describe('hidden fields are skipped', () => {
        it('does not validate hidden required field', () => {
            const registry = new Map<number, FieldEntry>([
                [1, makeEntry(1, { type: 'string', validation: { required: true } })],
            ])
            const validator = new FieldValidator(registry)
            const vis = new Map<number, boolean>([[1, false]])
            const result = validator.validate({}, vis, now)
            expect(result.valid).toBe(true)
            expect(result.fieldErrors.size).toBe(0)
        })
    })

    describe('sections are skipped', () => {
        it('does not try to validate section entries', () => {
            const registry = new Map<number, FieldEntry>([
                [1, makeEntry(1, { type: 'section' })],
                [2, makeEntry(2, { type: 'string', parentId: 1 })],
            ])
            const validator = new FieldValidator(registry)
            const result = validator.validate({ '2': 'hello' }, allVisible(1, 2), now)
            expect(result.valid).toBe(true)
        })
    })

    describe('error fields', () => {
        it('includes fieldId, rule, message in every error', () => {
            const registry = new Map<number, FieldEntry>([
                [1, makeEntry(1, { type: 'string', validation: { required: true } })],
            ])
            const validator = new FieldValidator(registry)
            const result = validator.validate({}, allVisible(1), now)
            const err = result.fieldErrors.get(1)?.[0]
            expect(err).toBeDefined()
            expect(err).toHaveProperty('fieldId', 1)
            expect(err).toHaveProperty('rule', 'REQUIRED')
            expect(err).toHaveProperty('message')
        })

        it('includes params when applicable', () => {
            const registry = new Map<number, FieldEntry>([
                [1, makeEntry(1, { type: 'string', validation: { minLength: 10 } })],
            ])
            const validator = new FieldValidator(registry)
            const result = validator.validate({ '1': 'short' }, allVisible(1), now)
            expect(result.fieldErrors.get(1)?.[0]?.params).toEqual({ minLength: 10, actual: 5 })
        })

        it('includes itemIndex for array item errors', () => {
            const registry = new Map<number, FieldEntry>([
                [
                    1,
                    makeEntry(1, {
                        type: 'array',
                        validation: {},
                        item: { type: 'number', label: 'Num', validation: { min: 0 } },
                    }),
                ],
            ])
            const validator = new FieldValidator(registry)
            const result = validator.validate({ '1': [5, -1, 3] }, allVisible(1), now)
            expect(result.fieldErrors.get(1)?.[0]?.itemIndex).toBe(1)
        })
    })

    describe('validate with now defaulting', () => {
        it('calls validate without explicit now argument and still works', () => {
            const registry = new Map<number, FieldEntry>([
                [1, makeEntry(1, { type: 'string', validation: { required: true } })],
            ])
            const validator = new FieldValidator(registry)
            // Call without `now` — should use default new Date()
            const result = validator.validate({}, allVisible(1))
            expect(result.valid).toBe(false)
            expect(result.fieldErrors.has(1)).toBe(true)
        })
    })

    describe('validate with field id not in visibilityMap', () => {
        it('validates the field when its id is not in visibilityMap (not skipped)', () => {
            const registry = new Map<number, FieldEntry>([
                [1, makeEntry(1, { type: 'string', validation: { required: true } })],
            ])
            const validator = new FieldValidator(registry)
            // Empty visibility map — field 1 is not present (not explicitly false)
            const emptyVis = new Map<number, boolean>()
            const result = validator.validate({}, emptyVis, now)
            // visibilityMap.get(1) === undefined, not false, so field should be validated
            expect(result.valid).toBe(false)
            expect(result.fieldErrors.has(1)).toBe(true)
        })
    })

    describe('validate with empty registry', () => {
        it('returns valid: true with empty registry', () => {
            const registry = new Map<number, FieldEntry>()
            const validator = new FieldValidator(registry)
            const result = validator.validate({}, new Map(), now)
            expect(result.valid).toBe(true)
            expect(result.fieldErrors.size).toBe(0)
        })
    })

    describe('multiple validation errors on single field', () => {
        it('string field fails both minLength and pattern', () => {
            const registry = new Map<number, FieldEntry>([
                [
                    1,
                    makeEntry(1, {
                        type: 'string',
                        validation: { minLength: 10, pattern: '^[A-Z]+$' },
                    }),
                ],
            ])
            const validator = new FieldValidator(registry)
            // 'ab' is too short (< 10) and doesn't match pattern (lowercase)
            const result = validator.validate({ '1': 'ab' }, allVisible(1), now)
            expect(result.valid).toBe(false)
            const errors = result.fieldErrors.get(1)
            expect(errors).toBeDefined()
            expect(errors?.length).toBeGreaterThanOrEqual(2)
            const rules = errors?.map((e) => e.rule)
            expect(rules).toContain('MIN_LENGTH')
            expect(rules).toContain('PATTERN')
        })
    })

    describe('array field with maxItems violation', () => {
        it('reports MAX_ITEMS when array exceeds maxItems', () => {
            const registry = new Map<number, FieldEntry>([
                [
                    1,
                    makeEntry(1, {
                        type: 'array',
                        validation: { maxItems: 2 },
                        item: { type: 'string', label: 'S' },
                    }),
                ],
            ])
            const validator = new FieldValidator(registry)
            const result = validator.validate({ '1': ['a', 'b', 'c'] }, allVisible(1), now)
            expect(result.valid).toBe(false)
            const errors = result.fieldErrors.get(1)
            expect(errors).toBeDefined()
            expect(errors?.some((e) => e.rule === 'MAX_ITEMS')).toBe(true)
        })
    })

    describe('array field with non-string item types', () => {
        it('validates array of number items', () => {
            const registry = new Map<number, FieldEntry>([
                [
                    1,
                    makeEntry(1, {
                        type: 'array',
                        validation: {},
                        item: { type: 'number', label: 'Num', validation: { min: 0 } },
                    }),
                ],
            ])
            const validator = new FieldValidator(registry)
            // Valid numbers
            const resultOk = validator.validate({ '1': [1, 2, 3] }, allVisible(1), now)
            expect(resultOk.valid).toBe(true)

            // Invalid number (below min)
            const resultBad = validator.validate({ '1': [1, -5, 3] }, allVisible(1), now)
            expect(resultBad.valid).toBe(false)
            expect(resultBad.fieldErrors.get(1)?.[0]?.itemIndex).toBe(1)
        })

        it('validates array of date items', () => {
            const registry = new Map<number, FieldEntry>([
                [
                    1,
                    makeEntry(1, {
                        type: 'array',
                        validation: {},
                        item: { type: 'date', label: 'Date', validation: { required: true } },
                    }),
                ],
            ])
            const validator = new FieldValidator(registry)
            const resultOk = validator.validate({ '1': ['2025-06-15'] }, allVisible(1), now)
            expect(resultOk.valid).toBe(true)

            // Empty string item should fail required
            const resultBad = validator.validate({ '1': [''] }, allVisible(1), now)
            expect(resultBad.valid).toBe(false)
        })
    })
})
