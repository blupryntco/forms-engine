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

    it('returns required error for undefined', () => {
        const errors = validator.validate({
            fieldId,
            value: undefined,
            validation: { required: true },
            now: new Date(),
            options: [{ value: 'a', label: 'A' }],
        })
        expect(errors).toHaveLength(1)
        expect(errors[0]?.rule).toBe('REQUIRED')
    })

    it('returns INVALID_OPTION error for empty options array with a value', () => {
        const errors = validator.validate({
            fieldId,
            value: 'a',
            validation: undefined,
            now: new Date(),
            options: [],
        })
        expect(errors).toHaveLength(1)
        expect(errors[0]).toMatchObject({ fieldId, rule: 'INVALID_OPTION' })
    })

    it('uses strict equality — numeric 1 does not match string "1"', () => {
        const errors = validator.validate({
            fieldId,
            value: 1,
            validation: undefined,
            now: new Date(),
            options: [{ value: '1', label: 'One' }],
        })
        expect(errors).toHaveLength(1)
        expect(errors[0]).toMatchObject({ fieldId, rule: 'INVALID_OPTION' })
    })

    it('passes when optional and undefined', () => {
        const errors = validator.validate({
            fieldId,
            value: undefined,
            validation: undefined,
            now: new Date(),
            options: [{ value: 'a', label: 'A' }],
        })
        expect(errors).toHaveLength(0)
    })

    it('passes when options are undefined (no INVALID_OPTION check)', () => {
        const errors = validator.validate({
            fieldId,
            value: 'anything',
            validation: undefined,
            now: new Date(),
            options: undefined,
        })
        expect(errors).toHaveLength(0)
    })
})
