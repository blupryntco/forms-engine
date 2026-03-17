import { DateValidator } from './date-validator'

const validator = new DateValidator()
const fieldId = 1
const now = new Date('2025-06-15T00:00:00.000Z')

describe('DateValidator', () => {
    it('returns required error for empty date', () => {
        const errors = validator.validate({ fieldId, value: '', validation: { required: true }, now })
        expect(errors[0]?.rule).toBe('REQUIRED')
    })

    it('returns minDate error for date before minimum', () => {
        const errors = validator.validate({
            fieldId,
            value: '2024-06-01T00:00:00.000Z',
            validation: { minDate: '2025-01-01T00:00:00.000Z' },
            now,
        })
        expect(errors[0]).toMatchObject({ fieldId, rule: 'MIN_DATE' })
    })

    it('returns maxDate error for date after maximum', () => {
        const errors = validator.validate({
            fieldId,
            value: '2025-06-01T00:00:00.000Z',
            validation: { maxDate: '2025-01-01T00:00:00.000Z' },
            now,
        })
        expect(errors[0]).toMatchObject({ fieldId, rule: 'MAX_DATE' })
    })

    it('resolves relative dates for minDate', () => {
        const errors = validator.validate({
            fieldId,
            value: '2025-06-09T00:00:00.000Z',
            validation: { minDate: '-5d' },
            now,
        })
        expect(errors[0]?.rule).toBe('MIN_DATE')
    })

    it('resolves relative dates for maxDate', () => {
        const errors = validator.validate({
            fieldId,
            value: '2025-06-21T00:00:00.000Z',
            validation: { maxDate: '+5d' },
            now,
        })
        expect(errors[0]?.rule).toBe('MAX_DATE')
    })

    it('returns invalidDate error for non-parseable date string', () => {
        const errors = validator.validate({ fieldId, value: 'not-a-date', validation: {}, now })
        expect(errors[0]?.rule).toBe('INVALID_DATE')
    })

    it('passes valid date', () => {
        const errors = validator.validate({
            fieldId,
            value: '2025-06-15T00:00:00.000Z',
            validation: {
                required: true,
                minDate: '2025-01-01T00:00:00.000Z',
                maxDate: '2025-12-31T23:59:59.999Z',
            },
            now,
        })
        expect(errors).toHaveLength(0)
    })

    it('returns type error for non-string value', () => {
        const errors = validator.validate({ fieldId, value: 12345, validation: {}, now })
        expect(errors[0]).toMatchObject({ fieldId, rule: 'TYPE', params: { expectedType: 'date' } })
    })

    it('returns required error for null', () => {
        const errors = validator.validate({ fieldId, value: null, validation: { required: true }, now })
        expect(errors).toHaveLength(1)
        expect(errors[0]?.rule).toBe('REQUIRED')
    })

    it('returns required error for undefined', () => {
        const errors = validator.validate({ fieldId, value: undefined, validation: { required: true }, now })
        expect(errors).toHaveLength(1)
        expect(errors[0]?.rule).toBe('REQUIRED')
    })

    it('passes when value exactly at minDate boundary', () => {
        const errors = validator.validate({
            fieldId,
            value: '2025-01-01T00:00:00.000Z',
            validation: { minDate: '2025-01-01T00:00:00.000Z' },
            now,
        })
        expect(errors).toHaveLength(0)
    })

    it('passes when value exactly at maxDate boundary', () => {
        const errors = validator.validate({
            fieldId,
            value: '2025-12-31T23:59:59.999Z',
            validation: { maxDate: '2025-12-31T23:59:59.999Z' },
            now,
        })
        expect(errors).toHaveLength(0)
    })

    it('passes for optional field with null', () => {
        const errors = validator.validate({
            fieldId,
            value: null,
            validation: { minDate: '2025-01-01T00:00:00.000Z' },
            now,
        })
        expect(errors).toHaveLength(0)
    })

    it('passes for optional field with undefined', () => {
        const errors = validator.validate({ fieldId, value: undefined, validation: {}, now })
        expect(errors).toHaveLength(0)
    })

    it('passes for valid date with no validation rules', () => {
        const errors = validator.validate({ fieldId, value: '2025-06-15T00:00:00.000Z', validation: undefined, now })
        expect(errors).toHaveLength(0)
    })

    it('resolves relative dates with month unit', () => {
        // now is 2025-06-15, "-1m" resolves to 2025-05-15
        const errorsBelow = validator.validate({
            fieldId,
            value: '2025-05-01T00:00:00.000Z',
            validation: { minDate: '-1m' },
            now,
        })
        expect(errorsBelow[0]?.rule).toBe('MIN_DATE')

        // "+1m" resolves to 2025-07-15
        const errorsAbove = validator.validate({
            fieldId,
            value: '2025-08-01T00:00:00.000Z',
            validation: { maxDate: '+1m' },
            now,
        })
        expect(errorsAbove[0]?.rule).toBe('MAX_DATE')
    })
})
