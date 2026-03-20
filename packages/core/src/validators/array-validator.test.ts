import { FieldValidator } from '../field-validator'
import type { FieldEntry } from '../types/field-entry'

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

describe('ArrayValidator (via FieldValidator)', () => {
    it('returns minItems error', () => {
        const registry = new Map<number, FieldEntry>([
            [
                1,
                makeEntry(1, {
                    type: 'array',
                    validation: { minItems: 2 },
                    item: { type: 'string', label: 'Item' },
                }),
            ],
        ])
        const validator = new FieldValidator(registry)
        const result = validator.validate({ '1': ['only-one'] }, allVisible(1), now)
        expect(result.valid).toBe(false)
        expect(result.fieldErrors.get(1)?.[0]).toMatchObject({
            fieldId: 1,
            rule: 'MIN_ITEMS',
            params: { minItems: 2, actual: 1 },
        })
    })

    it('returns maxItems error', () => {
        const registry = new Map<number, FieldEntry>([
            [
                1,
                makeEntry(1, {
                    type: 'array',
                    validation: { maxItems: 2 },
                    item: { type: 'string', label: 'Item' },
                }),
            ],
        ])
        const validator = new FieldValidator(registry)
        const result = validator.validate({ '1': ['a', 'b', 'c'] }, allVisible(1), now)
        expect(result.valid).toBe(false)
        expect(result.fieldErrors.get(1)?.[0]).toMatchObject({ fieldId: 1, rule: 'MAX_ITEMS' })
    })

    it('validates individual items and includes itemIndex', () => {
        const registry = new Map<number, FieldEntry>([
            [
                1,
                makeEntry(1, {
                    type: 'array',
                    validation: {},
                    item: { type: 'string', label: 'Item', validation: { minLength: 3 } },
                }),
            ],
        ])
        const validator = new FieldValidator(registry)
        const result = validator.validate({ '1': ['abc', 'x', 'def'] }, allVisible(1), now)
        expect(result.valid).toBe(false)
        expect(result.fieldErrors.get(1)).toHaveLength(1)
        expect(result.fieldErrors.get(1)?.[0]).toMatchObject({
            fieldId: 1,
            rule: 'MIN_LENGTH',
            itemIndex: 1,
        })
    })

    it('returns type error for non-array value', () => {
        const registry = new Map<number, FieldEntry>([
            [
                1,
                makeEntry(1, {
                    type: 'array',
                    validation: {},
                    item: { type: 'string', label: 'Item' },
                }),
            ],
        ])
        const validator = new FieldValidator(registry)
        const result = validator.validate({ '1': 'not-an-array' }, allVisible(1), now)
        expect(result.valid).toBe(false)
        expect(result.fieldErrors.get(1)?.[0]).toMatchObject({
            fieldId: 1,
            rule: 'TYPE',
            params: { expectedType: 'array' },
        })
    })

    it('passes valid array', () => {
        const registry = new Map<number, FieldEntry>([
            [
                1,
                makeEntry(1, {
                    type: 'array',
                    validation: { minItems: 1, maxItems: 5 },
                    item: { type: 'string', label: 'Item', validation: { minLength: 1 } },
                }),
            ],
        ])
        const validator = new FieldValidator(registry)
        const result = validator.validate({ '1': ['a', 'b'] }, allVisible(1), now)
        expect(result.valid).toBe(true)
    })

    it('passes when array value is null (optional)', () => {
        const registry = new Map<number, FieldEntry>([
            [
                1,
                makeEntry(1, {
                    type: 'array',
                    validation: { minItems: 1 },
                    item: { type: 'string', label: 'Item' },
                }),
            ],
        ])
        const validator = new FieldValidator(registry)
        const result = validator.validate({ '1': null }, allVisible(1), now)
        expect(result.valid).toBe(true)
    })

    it('validates file items in array', () => {
        const validFile = {
            name: 'doc.pdf',
            mimeType: 'application/pdf',
            size: 1024,
            url: 'https://example.com/doc.pdf',
        }
        const registry = new Map<number, FieldEntry>([
            [
                1,
                makeEntry(1, {
                    type: 'array',
                    validation: {},
                    item: { type: 'file', label: 'Attachment' },
                }),
            ],
        ])
        const validator = new FieldValidator(registry)
        const result = validator.validate({ '1': [validFile, validFile] }, allVisible(1), now)
        expect(result.valid).toBe(true)
    })

    it('returns error with itemIndex for invalid file in array', () => {
        const validFile = {
            name: 'doc.pdf',
            mimeType: 'application/pdf',
            size: 1024,
            url: 'https://example.com/doc.pdf',
        }
        const registry = new Map<number, FieldEntry>([
            [
                1,
                makeEntry(1, {
                    type: 'array',
                    validation: {},
                    item: { type: 'file', label: 'Attachment' },
                }),
            ],
        ])
        const validator = new FieldValidator(registry)
        const result = validator.validate({ '1': [validFile, 'bad', validFile] }, allVisible(1), now)
        expect(result.valid).toBe(false)
        expect(result.fieldErrors.get(1)).toHaveLength(1)
        expect(result.fieldErrors.get(1)?.[0]).toMatchObject({ fieldId: 1, rule: 'TYPE', itemIndex: 1 })
    })

    it('passes when array length exactly at minItems boundary', () => {
        const registry = new Map<number, FieldEntry>([
            [
                1,
                makeEntry(1, {
                    type: 'array',
                    validation: { minItems: 2 },
                    item: { type: 'string', label: 'Item' },
                }),
            ],
        ])
        const validator = new FieldValidator(registry)
        const result = validator.validate({ '1': ['a', 'b'] }, allVisible(1), now)
        expect(result.valid).toBe(true)
    })

    it('passes when array length exactly at maxItems boundary', () => {
        const registry = new Map<number, FieldEntry>([
            [
                1,
                makeEntry(1, {
                    type: 'array',
                    validation: { maxItems: 3 },
                    item: { type: 'string', label: 'Item' },
                }),
            ],
        ])
        const validator = new FieldValidator(registry)
        const result = validator.validate({ '1': ['a', 'b', 'c'] }, allVisible(1), now)
        expect(result.valid).toBe(true)
    })

    it('returns minItems error for empty array with minItems: 1', () => {
        const registry = new Map<number, FieldEntry>([
            [
                1,
                makeEntry(1, {
                    type: 'array',
                    validation: { minItems: 1 },
                    item: { type: 'string', label: 'Item' },
                }),
            ],
        ])
        const validator = new FieldValidator(registry)
        const result = validator.validate({ '1': [] }, allVisible(1), now)
        expect(result.valid).toBe(false)
        expect(result.fieldErrors.get(1)?.[0]).toMatchObject({
            fieldId: 1,
            rule: 'MIN_ITEMS',
            params: { minItems: 1, actual: 0 },
        })
    })

    it('passes when array value is undefined (optional)', () => {
        const registry = new Map<number, FieldEntry>([
            [
                1,
                makeEntry(1, {
                    type: 'array',
                    validation: { minItems: 1 },
                    item: { type: 'string', label: 'Item' },
                }),
            ],
        ])
        const validator = new FieldValidator(registry)
        const result = validator.validate({ '1': undefined }, allVisible(1), now)
        expect(result.valid).toBe(true)
    })

    it('returns multiple errors with correct itemIndex for multiple invalid items', () => {
        const registry = new Map<number, FieldEntry>([
            [
                1,
                makeEntry(1, {
                    type: 'array',
                    validation: {},
                    item: { type: 'string', label: 'Item', validation: { minLength: 3 } },
                }),
            ],
        ])
        const validator = new FieldValidator(registry)
        const result = validator.validate({ '1': ['ab', 'x', 'abcdef'] }, allVisible(1), now)
        expect(result.valid).toBe(false)
        const fieldErrors = result.fieldErrors.get(1) ?? []
        expect(fieldErrors).toHaveLength(2)
        expect(fieldErrors[0]).toMatchObject({ rule: 'MIN_LENGTH', itemIndex: 0 })
        expect(fieldErrors[1]).toMatchObject({ rule: 'MIN_LENGTH', itemIndex: 1 })
    })

    it('returns maxItems error with correct params', () => {
        const registry = new Map<number, FieldEntry>([
            [
                1,
                makeEntry(1, {
                    type: 'array',
                    validation: { maxItems: 2 },
                    item: { type: 'string', label: 'Item' },
                }),
            ],
        ])
        const validator = new FieldValidator(registry)
        const result = validator.validate({ '1': ['a', 'b', 'c', 'd'] }, allVisible(1), now)
        expect(result.valid).toBe(false)
        expect(result.fieldErrors.get(1)?.[0]).toMatchObject({
            fieldId: 1,
            rule: 'MAX_ITEMS',
            params: { maxItems: 2, actual: 4 },
        })
    })
})
