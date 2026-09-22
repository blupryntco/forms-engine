import { MultiselectValidator } from './multiselect-validator'

const validator = new MultiselectValidator()
const fieldId = 1
const options = [
    { value: 'a', label: 'A' },
    { value: 'b', label: 'B' },
]

describe('MultiselectValidator', () => {
    it('returns required error for null', () => {
        const errors = validator.validate({
            fieldId,
            value: null,
            validation: { required: true },
            now: new Date(),
            options,
        })
        expect(errors).toHaveLength(1)
        expect(errors[0]?.rule).toBe('REQUIRED')
    })

    it('returns required error for undefined', () => {
        const errors = validator.validate({
            fieldId,
            value: undefined,
            validation: { required: true },
            now: new Date(),
            options,
        })
        expect(errors).toHaveLength(1)
        expect(errors[0]?.rule).toBe('REQUIRED')
    })

    it('treats an empty array as nothing selected', () => {
        const errors = validator.validate({
            fieldId,
            value: [],
            validation: { required: true },
            now: new Date(),
            options,
        })
        expect(errors).toHaveLength(1)
        expect(errors[0]?.rule).toBe('REQUIRED')
    })

    it('passes when optional and empty', () => {
        for (const value of [null, undefined, []]) {
            const errors = validator.validate({ fieldId, value, validation: undefined, now: new Date(), options })
            expect(errors).toHaveLength(0)
        }
    })

    it('passes a single valid selection', () => {
        const errors = validator.validate({
            fieldId,
            value: ['a'],
            validation: { required: true },
            now: new Date(),
            options,
        })
        expect(errors).toHaveLength(0)
    })

    it('passes multiple valid selections', () => {
        const errors = validator.validate({
            fieldId,
            value: ['a', 'b'],
            validation: { required: true },
            now: new Date(),
            options,
        })
        expect(errors).toHaveLength(0)
    })

    it('returns a TYPE error when the value is not an array', () => {
        const errors = validator.validate({ fieldId, value: 'a', validation: undefined, now: new Date(), options })
        expect(errors).toHaveLength(1)
        expect(errors[0]).toMatchObject({ fieldId, rule: 'TYPE', params: { expectedType: 'multiselect' } })
    })

    it('reports one field-level INVALID_OPTION regardless of how many values are unknown', () => {
        const errors = validator.validate({
            fieldId,
            value: ['a', 'x', 'y'],
            validation: undefined,
            now: new Date(),
            options,
        })
        expect(errors).toHaveLength(1)
        expect(errors[0]).toMatchObject({ fieldId, rule: 'INVALID_OPTION' })
        expect(errors[0]?.itemIndex).toBeUndefined()
    })

    it('uses strict equality — numeric 1 does not match string "1"', () => {
        const errors = validator.validate({
            fieldId,
            value: [1],
            validation: undefined,
            now: new Date(),
            options: [{ value: '1', label: 'One' }],
        })
        expect(errors).toHaveLength(1)
        expect(errors[0]).toMatchObject({ fieldId, rule: 'INVALID_OPTION' })
    })

    it('accepts numeric option values', () => {
        const errors = validator.validate({
            fieldId,
            value: [1, 2],
            validation: { required: true },
            now: new Date(),
            options: [
                { value: 1, label: 'One' },
                { value: 2, label: 'Two' },
            ],
        })
        expect(errors).toHaveLength(0)
    })

    it('returns INVALID_OPTION for an empty options array with a selection', () => {
        const errors = validator.validate({
            fieldId,
            value: ['a'],
            validation: undefined,
            now: new Date(),
            options: [],
        })
        expect(errors).toHaveLength(1)
        expect(errors[0]).toMatchObject({ fieldId, rule: 'INVALID_OPTION' })
    })

    it('passes when options are undefined (no INVALID_OPTION check)', () => {
        const errors = validator.validate({
            fieldId,
            value: ['anything'],
            validation: undefined,
            now: new Date(),
            options: undefined,
        })
        expect(errors).toHaveLength(0)
    })

    it('does not report INVALID_OPTION when required already failed', () => {
        const errors = validator.validate({
            fieldId,
            value: [],
            validation: { required: true },
            now: new Date(),
            options,
        })
        expect(errors).toHaveLength(1)
        expect(errors[0]?.rule).toBe('REQUIRED')
    })
})
