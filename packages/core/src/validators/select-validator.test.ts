import { SelectValidator } from './select-validator'

const validator = new SelectValidator()
const fieldId = 1

describe('SelectValidator', () => {
    it('returns required error for null', () => {
        const errors = validator.validate({
            fieldId,
            value: null,
            validation: { required: true },
            now: new Date(),
            options: [{ value: 'a', label: 'A' }],
        })
        expect(errors[0]?.rule).toBe('REQUIRED')
    })

    it('returns invalidOption error for value not in options', () => {
        const errors = validator.validate({
            fieldId,
            value: 'c',
            validation: undefined,
            now: new Date(),
            options: [
                { value: 'a', label: 'A' },
                { value: 'b', label: 'B' },
            ],
        })
        expect(errors[0]).toMatchObject({ fieldId, rule: 'INVALID_OPTION' })
    })

    it('passes valid option', () => {
        const errors = validator.validate({
            fieldId,
            value: 'a',
            validation: { required: true },
            now: new Date(),
            options: [
                { value: 'a', label: 'A' },
                { value: 'b', label: 'B' },
            ],
        })
        expect(errors).toHaveLength(0)
    })

    it('passes when optional and null', () => {
        const errors = validator.validate({
            fieldId,
            value: null,
            validation: undefined,
            now: new Date(),
            options: [{ value: 'a', label: 'A' }],
        })
        expect(errors).toHaveLength(0)
    })
})
