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
})
