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
            expect(result.errors.some((e) => e.fieldId === 1)).toBe(true)
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
            expect(result.errors.some((e) => e.fieldId === 1)).toBe(true)
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
            expect(result.errors).toHaveLength(0)
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
            const err = result.errors[0]
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
            expect(result.errors[0]?.params).toEqual({ minLength: 10, actual: 5 })
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
            expect(result.errors[0]?.itemIndex).toBe(1)
        })
    })
})
