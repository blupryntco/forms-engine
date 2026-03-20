import { NumberValidator } from './number-validator'

const validator = new NumberValidator()
const fieldId = 1

describe('NumberValidator', () => {
    it('returns required error for null', () => {
        const errors = validator.validate({ fieldId, value: null, validation: { required: true }, now: new Date() })
        expect(errors[0]?.rule).toBe('REQUIRED')
    })

    it('returns min error', () => {
        const errors = validator.validate({ fieldId, value: 5, validation: { min: 10 }, now: new Date() })
        expect(errors[0]).toMatchObject({
            fieldId,
            rule: 'MIN',
            params: { min: 10, actual: 5 },
        })
    })

    it('returns max error', () => {
        const errors = validator.validate({ fieldId, value: 150, validation: { max: 100 }, now: new Date() })
        expect(errors[0]).toMatchObject({ fieldId, rule: 'MAX' })
    })

    it('returns type error for string value', () => {
        const errors = validator.validate({ fieldId, value: 'abc', validation: { required: true }, now: new Date() })
        expect(errors[0]).toMatchObject({
            fieldId,
            rule: 'TYPE',
            params: { expectedType: 'number' },
        })
    })

    it('passes valid number', () => {
        const errors = validator.validate({
            fieldId,
            value: 42,
            validation: { required: true, min: 0, max: 150 },
            now: new Date(),
        })
        expect(errors).toHaveLength(0)
    })

    it('passes when optional and null', () => {
        const errors = validator.validate({ fieldId, value: null, validation: { min: 10 }, now: new Date() })
        expect(errors).toHaveLength(0)
    })

    it('returns required error for undefined', () => {
        const errors = validator.validate({
            fieldId,
            value: undefined,
            validation: { required: true },
            now: new Date(),
        })
        expect(errors).toHaveLength(1)
        expect(errors[0]?.rule).toBe('REQUIRED')
    })

    it('passes when value exactly at min boundary', () => {
        const errors = validator.validate({ fieldId, value: 10, validation: { min: 10 }, now: new Date() })
        expect(errors).toHaveLength(0)
    })

    it('passes when value exactly at max boundary', () => {
        const errors = validator.validate({ fieldId, value: 100, validation: { max: 100 }, now: new Date() })
        expect(errors).toHaveLength(0)
    })

    it('handles NaN as a number type value', () => {
        const errors = validator.validate({ fieldId, value: NaN, validation: { min: 0 }, now: new Date() })
        // NaN is typeof 'number', so no TYPE error. NaN < 0 is false, so no MIN error either.
        expect(errors.find((e) => e.rule === 'TYPE')).toBeUndefined()
    })

    it('passes for any number when validation is undefined', () => {
        const errors = validator.validate({ fieldId, value: 999, validation: undefined, now: new Date() })
        expect(errors).toHaveLength(0)
    })

    it('returns type error for non-number without required flag', () => {
        const errors = validator.validate({ fieldId, value: 'abc', validation: undefined, now: new Date() })
        expect(errors).toHaveLength(1)
        expect(errors[0]).toMatchObject({ fieldId, rule: 'TYPE', params: { expectedType: 'number' } })
    })

    it('returns max error with correct params', () => {
        const errors = validator.validate({ fieldId, value: 150, validation: { max: 100 }, now: new Date() })
        expect(errors[0]).toMatchObject({
            fieldId,
            rule: 'MAX',
            params: { max: 100, actual: 150 },
        })
    })
})
