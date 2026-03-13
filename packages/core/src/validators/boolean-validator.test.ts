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
})
