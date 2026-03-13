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
})
