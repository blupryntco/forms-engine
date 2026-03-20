import { BooleanValidator } from './boolean-validator'

const validator = new BooleanValidator()
const fieldId = 1

describe('BooleanValidator', () => {
    it('false satisfies required', () => {
        const errors = validator.validate({ fieldId, value: false, validation: { required: true }, now: new Date() })
        expect(errors).toHaveLength(0)
    })

    it('true satisfies required', () => {
        const errors = validator.validate({ fieldId, value: true, validation: { required: true }, now: new Date() })
        expect(errors).toHaveLength(0)
    })

    it('null does not satisfy required', () => {
        const errors = validator.validate({ fieldId, value: null, validation: { required: true }, now: new Date() })
        expect(errors[0]?.rule).toBe('REQUIRED')
    })

    it('undefined does not satisfy required', () => {
        const errors = validator.validate({
            fieldId,
            value: undefined,
            validation: { required: true },
            now: new Date(),
        })
        expect(errors).toHaveLength(1)
    })

    it('no errors for any boolean when validation is undefined', () => {
        const errorsTrue = validator.validate({ fieldId, value: true, validation: undefined, now: new Date() })
        const errorsFalse = validator.validate({ fieldId, value: false, validation: undefined, now: new Date() })
        expect(errorsTrue).toHaveLength(0)
        expect(errorsFalse).toHaveLength(0)
    })

    it('returns required error for truthy string "true" with required', () => {
        const errors = validator.validate({
            fieldId,
            value: 'true',
            validation: { required: true },
            now: new Date(),
        })
        expect(errors).toHaveLength(1)
        expect(errors[0]).toMatchObject({ fieldId, rule: 'REQUIRED' })
    })

    it('passes for null when not required', () => {
        const errors = validator.validate({ fieldId, value: null, validation: undefined, now: new Date() })
        expect(errors).toHaveLength(0)
    })

    it('returns error with rule REQUIRED for undefined value', () => {
        const errors = validator.validate({
            fieldId,
            value: undefined,
            validation: { required: true },
            now: new Date(),
        })
        expect(errors[0]).toMatchObject({ fieldId, rule: 'REQUIRED' })
    })
})
