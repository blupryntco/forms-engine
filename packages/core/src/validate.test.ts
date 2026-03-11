import type { FieldEntry } from './types'
import { FieldValidator } from './validate'

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
    describe('string validation', () => {
        it('returns required error for empty string', () => {
            const registry = new Map<number, FieldEntry>([
                [1, makeEntry(1, { type: 'string', validation: { required: true } })],
            ])
            const validator = new FieldValidator(registry)
            const result = validator.validate({ '1': '' }, allVisible(1), now)
            expect(result.valid).toBe(false)
            expect(result.errors[0]).toMatchObject({ fieldId: 1, rule: 'required' })
        })

        it('returns required error for null', () => {
            const registry = new Map<number, FieldEntry>([
                [1, makeEntry(1, { type: 'string', validation: { required: true } })],
            ])
            const validator = new FieldValidator(registry)
            const result = validator.validate({ '1': null }, allVisible(1), now)
            expect(result.valid).toBe(false)
            expect(result.errors[0]?.rule).toBe('required')
        })

        it('returns required error for undefined (missing key)', () => {
            const registry = new Map<number, FieldEntry>([
                [1, makeEntry(1, { type: 'string', validation: { required: true } })],
            ])
            const validator = new FieldValidator(registry)
            const result = validator.validate({}, allVisible(1), now)
            expect(result.valid).toBe(false)
            expect(result.errors[0]?.rule).toBe('required')
        })

        it('passes when optional and empty', () => {
            const registry = new Map<number, FieldEntry>([
                [1, makeEntry(1, { type: 'string', validation: { minLength: 5 } })],
            ])
            const validator = new FieldValidator(registry)
            const result = validator.validate({ '1': '' }, allVisible(1), now)
            expect(result.valid).toBe(true)
        })

        it('returns minLength error', () => {
            const registry = new Map<number, FieldEntry>([
                [1, makeEntry(1, { type: 'string', validation: { minLength: 5 } })],
            ])
            const validator = new FieldValidator(registry)
            const result = validator.validate({ '1': 'abc' }, allVisible(1), now)
            expect(result.valid).toBe(false)
            expect(result.errors[0]).toMatchObject({
                fieldId: 1,
                rule: 'minLength',
                params: { minLength: 5, actual: 3 },
            })
        })

        it('returns maxLength error', () => {
            const registry = new Map<number, FieldEntry>([
                [1, makeEntry(1, { type: 'string', validation: { maxLength: 3 } })],
            ])
            const validator = new FieldValidator(registry)
            const result = validator.validate({ '1': 'abcdef' }, allVisible(1), now)
            expect(result.valid).toBe(false)
            expect(result.errors[0]).toMatchObject({
                fieldId: 1,
                rule: 'maxLength',
                params: { maxLength: 3, actual: 6 },
            })
        })

        it('returns pattern error with default message', () => {
            const registry = new Map<number, FieldEntry>([
                [1, makeEntry(1, { type: 'string', validation: { pattern: '^[0-9]+$' } })],
            ])
            const validator = new FieldValidator(registry)
            const result = validator.validate({ '1': 'abc' }, allVisible(1), now)
            expect(result.valid).toBe(false)
            expect(result.errors[0]).toMatchObject({ fieldId: 1, rule: 'pattern' })
            expect(result.errors[0]?.message).toBe('Value does not match the required pattern')
        })

        it('returns pattern error with custom patternMessage', () => {
            const registry = new Map<number, FieldEntry>([
                [
                    1,
                    makeEntry(1, {
                        type: 'string',
                        validation: { pattern: '^[0-9]+$', patternMessage: 'Digits only' },
                    }),
                ],
            ])
            const validator = new FieldValidator(registry)
            const result = validator.validate({ '1': 'abc' }, allVisible(1), now)
            expect(result.errors[0]?.message).toBe('Digits only')
        })

        it('passes valid string', () => {
            const registry = new Map<number, FieldEntry>([
                [
                    1,
                    makeEntry(1, {
                        type: 'string',
                        validation: { required: true, minLength: 2, maxLength: 10, pattern: '^[A-Za-z]+$' },
                    }),
                ],
            ])
            const validator = new FieldValidator(registry)
            const result = validator.validate({ '1': 'Hello' }, allVisible(1), now)
            expect(result.valid).toBe(true)
        })
    })

    describe('number validation', () => {
        it('returns required error for null', () => {
            const registry = new Map<number, FieldEntry>([
                [1, makeEntry(1, { type: 'number', validation: { required: true } })],
            ])
            const validator = new FieldValidator(registry)
            const result = validator.validate({ '1': null }, allVisible(1), now)
            expect(result.valid).toBe(false)
            expect(result.errors[0]?.rule).toBe('required')
        })

        it('returns min error', () => {
            const registry = new Map<number, FieldEntry>([
                [1, makeEntry(1, { type: 'number', validation: { min: 10 } })],
            ])
            const validator = new FieldValidator(registry)
            const result = validator.validate({ '1': 5 }, allVisible(1), now)
            expect(result.valid).toBe(false)
            expect(result.errors[0]).toMatchObject({
                fieldId: 1,
                rule: 'min',
                params: { min: 10, actual: 5 },
            })
        })

        it('returns max error', () => {
            const registry = new Map<number, FieldEntry>([
                [1, makeEntry(1, { type: 'number', validation: { max: 100 } })],
            ])
            const validator = new FieldValidator(registry)
            const result = validator.validate({ '1': 150 }, allVisible(1), now)
            expect(result.valid).toBe(false)
            expect(result.errors[0]).toMatchObject({ fieldId: 1, rule: 'max' })
        })

        it('returns type error for string value on number field', () => {
            const registry = new Map<number, FieldEntry>([
                [1, makeEntry(1, { type: 'number', validation: { required: true } })],
            ])
            const validator = new FieldValidator(registry)
            const result = validator.validate({ '1': 'abc' }, allVisible(1), now)
            expect(result.valid).toBe(false)
            expect(result.errors[0]).toMatchObject({
                fieldId: 1,
                rule: 'type',
                params: { expectedType: 'number' },
            })
        })

        it('passes valid number', () => {
            const registry = new Map<number, FieldEntry>([
                [1, makeEntry(1, { type: 'number', validation: { required: true, min: 0, max: 150 } })],
            ])
            const validator = new FieldValidator(registry)
            const result = validator.validate({ '1': 42 }, allVisible(1), now)
            expect(result.valid).toBe(true)
        })
    })

    describe('boolean validation', () => {
        it('false satisfies required', () => {
            const registry = new Map<number, FieldEntry>([
                [1, makeEntry(1, { type: 'boolean', validation: { required: true } })],
            ])
            const validator = new FieldValidator(registry)
            const result = validator.validate({ '1': false }, allVisible(1), now)
            expect(result.valid).toBe(true)
        })

        it('true satisfies required', () => {
            const registry = new Map<number, FieldEntry>([
                [1, makeEntry(1, { type: 'boolean', validation: { required: true } })],
            ])
            const validator = new FieldValidator(registry)
            const result = validator.validate({ '1': true }, allVisible(1), now)
            expect(result.valid).toBe(true)
        })

        it('null does not satisfy required', () => {
            const registry = new Map<number, FieldEntry>([
                [1, makeEntry(1, { type: 'boolean', validation: { required: true } })],
            ])
            const validator = new FieldValidator(registry)
            const result = validator.validate({ '1': null }, allVisible(1), now)
            expect(result.valid).toBe(false)
            expect(result.errors[0]?.rule).toBe('required')
        })

        it('undefined does not satisfy required', () => {
            const registry = new Map<number, FieldEntry>([
                [1, makeEntry(1, { type: 'boolean', validation: { required: true } })],
            ])
            const validator = new FieldValidator(registry)
            const result = validator.validate({}, allVisible(1), now)
            expect(result.valid).toBe(false)
        })
    })

    describe('date validation', () => {
        it('returns required error for empty date', () => {
            const registry = new Map<number, FieldEntry>([
                [1, makeEntry(1, { type: 'date', validation: { required: true } })],
            ])
            const validator = new FieldValidator(registry)
            const result = validator.validate({ '1': '' }, allVisible(1), now)
            expect(result.valid).toBe(false)
            expect(result.errors[0]?.rule).toBe('required')
        })

        it('returns minDate error for date before minimum', () => {
            const registry = new Map<number, FieldEntry>([
                [1, makeEntry(1, { type: 'date', validation: { minDate: '2025-01-01T00:00:00.000Z' } })],
            ])
            const validator = new FieldValidator(registry)
            const result = validator.validate({ '1': '2024-06-01T00:00:00.000Z' }, allVisible(1), now)
            expect(result.valid).toBe(false)
            expect(result.errors[0]).toMatchObject({ fieldId: 1, rule: 'minDate' })
        })

        it('returns maxDate error for date after maximum', () => {
            const registry = new Map<number, FieldEntry>([
                [1, makeEntry(1, { type: 'date', validation: { maxDate: '2025-01-01T00:00:00.000Z' } })],
            ])
            const validator = new FieldValidator(registry)
            const result = validator.validate({ '1': '2025-06-01T00:00:00.000Z' }, allVisible(1), now)
            expect(result.valid).toBe(false)
            expect(result.errors[0]).toMatchObject({ fieldId: 1, rule: 'maxDate' })
        })

        it('resolves relative dates for minDate', () => {
            // -5d from 2025-06-15 = 2025-06-10
            const registry = new Map<number, FieldEntry>([
                [1, makeEntry(1, { type: 'date', validation: { minDate: '-5d' } })],
            ])
            const validator = new FieldValidator(registry)
            // A date before the resolved minDate
            const result = validator.validate({ '1': '2025-06-09T00:00:00.000Z' }, allVisible(1), now)
            expect(result.valid).toBe(false)
            expect(result.errors[0]?.rule).toBe('minDate')
        })

        it('resolves relative dates for maxDate', () => {
            // +5d from 2025-06-15 = 2025-06-20
            const registry = new Map<number, FieldEntry>([
                [1, makeEntry(1, { type: 'date', validation: { maxDate: '+5d' } })],
            ])
            const validator = new FieldValidator(registry)
            // A date after the resolved maxDate
            const result = validator.validate({ '1': '2025-06-21T00:00:00.000Z' }, allVisible(1), now)
            expect(result.valid).toBe(false)
            expect(result.errors[0]?.rule).toBe('maxDate')
        })

        it('returns invalidDate error for non-parseable date string', () => {
            const registry = new Map<number, FieldEntry>([[1, makeEntry(1, { type: 'date', validation: {} })]])
            const validator = new FieldValidator(registry)
            const result = validator.validate({ '1': 'not-a-date' }, allVisible(1), now)
            expect(result.valid).toBe(false)
            expect(result.errors[0]?.rule).toBe('invalidDate')
        })

        it('passes valid date', () => {
            const registry = new Map<number, FieldEntry>([
                [
                    1,
                    makeEntry(1, {
                        type: 'date',
                        validation: {
                            required: true,
                            minDate: '2025-01-01T00:00:00.000Z',
                            maxDate: '2025-12-31T23:59:59.999Z',
                        },
                    }),
                ],
            ])
            const validator = new FieldValidator(registry)
            const result = validator.validate({ '1': '2025-06-15T00:00:00.000Z' }, allVisible(1), now)
            expect(result.valid).toBe(true)
        })
    })

    describe('select validation', () => {
        it('returns required error for null', () => {
            const registry = new Map<number, FieldEntry>([
                [
                    1,
                    makeEntry(1, {
                        type: 'select',
                        validation: { required: true },
                        options: [{ value: 'a', label: 'A' }],
                    }),
                ],
            ])
            const validator = new FieldValidator(registry)
            const result = validator.validate({ '1': null }, allVisible(1), now)
            expect(result.valid).toBe(false)
            expect(result.errors[0]?.rule).toBe('required')
        })

        it('returns invalidOption error for value not in options', () => {
            const registry = new Map<number, FieldEntry>([
                [
                    1,
                    makeEntry(1, {
                        type: 'select',
                        options: [
                            { value: 'a', label: 'A' },
                            { value: 'b', label: 'B' },
                        ],
                    }),
                ],
            ])
            const validator = new FieldValidator(registry)
            const result = validator.validate({ '1': 'c' }, allVisible(1), now)
            expect(result.valid).toBe(false)
            expect(result.errors[0]).toMatchObject({ fieldId: 1, rule: 'invalidOption' })
        })

        it('passes valid option', () => {
            const registry = new Map<number, FieldEntry>([
                [
                    1,
                    makeEntry(1, {
                        type: 'select',
                        validation: { required: true },
                        options: [
                            { value: 'a', label: 'A' },
                            { value: 'b', label: 'B' },
                        ],
                    }),
                ],
            ])
            const validator = new FieldValidator(registry)
            const result = validator.validate({ '1': 'a' }, allVisible(1), now)
            expect(result.valid).toBe(true)
        })
    })

    describe('array validation', () => {
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
            expect(result.errors[0]).toMatchObject({
                fieldId: 1,
                rule: 'minItems',
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
            expect(result.errors[0]).toMatchObject({ fieldId: 1, rule: 'maxItems' })
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
            expect(result.errors).toHaveLength(1)
            expect(result.errors[0]).toMatchObject({
                fieldId: 1,
                rule: 'minLength',
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
            expect(result.errors[0]).toMatchObject({
                fieldId: 1,
                rule: 'type',
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
    })

    describe('file validation', () => {
        const validFile = {
            name: 'doc.pdf',
            mimeType: 'application/pdf',
            size: 1024,
            url: 'https://example.com/doc.pdf',
        }

        it('returns required error for null', () => {
            const registry = new Map<number, FieldEntry>([
                [1, makeEntry(1, { type: 'file', validation: { required: true } })],
            ])
            const validator = new FieldValidator(registry)
            const result = validator.validate({ '1': null }, allVisible(1), now)
            expect(result.valid).toBe(false)
            expect(result.errors[0]).toMatchObject({ fieldId: 1, rule: 'required' })
        })

        it('returns required error for undefined (missing key)', () => {
            const registry = new Map<number, FieldEntry>([
                [1, makeEntry(1, { type: 'file', validation: { required: true } })],
            ])
            const validator = new FieldValidator(registry)
            const result = validator.validate({}, allVisible(1), now)
            expect(result.valid).toBe(false)
            expect(result.errors[0]?.rule).toBe('required')
        })

        it('passes when required and valid file object', () => {
            const registry = new Map<number, FieldEntry>([
                [1, makeEntry(1, { type: 'file', validation: { required: true } })],
            ])
            const validator = new FieldValidator(registry)
            const result = validator.validate({ '1': validFile }, allVisible(1), now)
            expect(result.valid).toBe(true)
        })

        it('passes when optional and null', () => {
            const registry = new Map<number, FieldEntry>([[1, makeEntry(1, { type: 'file' })]])
            const validator = new FieldValidator(registry)
            const result = validator.validate({ '1': null }, allVisible(1), now)
            expect(result.valid).toBe(true)
        })

        it('returns type error for string instead of object', () => {
            const registry = new Map<number, FieldEntry>([[1, makeEntry(1, { type: 'file' })]])
            const validator = new FieldValidator(registry)
            const result = validator.validate({ '1': 'not-a-file' }, allVisible(1), now)
            expect(result.valid).toBe(false)
            expect(result.errors[0]).toMatchObject({
                fieldId: 1,
                rule: 'type',
                params: { expectedType: 'file' },
            })
        })

        it('returns type error for object missing properties', () => {
            const registry = new Map<number, FieldEntry>([[1, makeEntry(1, { type: 'file' })]])
            const validator = new FieldValidator(registry)
            const result = validator.validate({ '1': { name: 'doc.pdf' } }, allVisible(1), now)
            expect(result.valid).toBe(false)
            expect(result.errors[0]?.rule).toBe('type')
        })

        it('returns type error when property has wrong type (size is string)', () => {
            const registry = new Map<number, FieldEntry>([[1, makeEntry(1, { type: 'file' })]])
            const validator = new FieldValidator(registry)
            const result = validator.validate({ '1': { ...validFile, size: '1024' } }, allVisible(1), now)
            expect(result.valid).toBe(false)
            expect(result.errors[0]?.rule).toBe('type')
        })

        it('validates file items in array', () => {
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
            expect(result.errors).toHaveLength(1)
            expect(result.errors[0]).toMatchObject({ fieldId: 1, rule: 'type', itemIndex: 1 })
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
            expect(err).toHaveProperty('rule', 'required')
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
