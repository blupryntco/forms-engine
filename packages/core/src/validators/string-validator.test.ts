import { StringValidator } from './string-validator'

const validator = new StringValidator()
const fieldId = 1

describe('StringValidator', () => {
    it('returns required error for empty string', () => {
        const errors = validator.validate({ fieldId, value: '', validation: { required: true }, now: new Date() })
        expect(errors).toHaveLength(1)
        expect(errors[0]).toMatchObject({ fieldId, rule: 'REQUIRED' })
    })

    it('returns required error for null', () => {
        const errors = validator.validate({ fieldId, value: null, validation: { required: true }, now: new Date() })
        expect(errors[0]?.rule).toBe('REQUIRED')
    })

    it('returns required error for undefined', () => {
        const errors = validator.validate({
            fieldId,
            value: undefined,
            validation: { required: true },
            now: new Date(),
        })
        expect(errors[0]?.rule).toBe('REQUIRED')
    })

    it('passes when optional and empty', () => {
        const errors = validator.validate({ fieldId, value: '', validation: { minLength: 5 }, now: new Date() })
        expect(errors).toHaveLength(0)
    })

    it('returns minLength error', () => {
        const errors = validator.validate({ fieldId, value: 'abc', validation: { minLength: 5 }, now: new Date() })
        expect(errors[0]).toMatchObject({
            fieldId,
            rule: 'MIN_LENGTH',
            params: { minLength: 5, actual: 3 },
        })
    })

    it('returns maxLength error', () => {
        const errors = validator.validate({
            fieldId,
            value: 'abcdef',
            validation: { maxLength: 3 },
            now: new Date(),
        })
        expect(errors[0]).toMatchObject({
            fieldId,
            rule: 'MAX_LENGTH',
            params: { maxLength: 3, actual: 6 },
        })
    })

    it('returns pattern error with default message', () => {
        const errors = validator.validate({
            fieldId,
            value: 'abc',
            validation: { pattern: '^[0-9]+$' },
            now: new Date(),
        })
        expect(errors[0]).toMatchObject({ fieldId, rule: 'PATTERN' })
        expect(errors[0]?.message).toBe('Value does not match the required pattern')
    })

    it('returns pattern error with custom patternMessage', () => {
        const errors = validator.validate({
            fieldId,
            value: 'abc',
            validation: { pattern: '^[0-9]+$', patternMessage: 'Digits only' },
            now: new Date(),
        })
        expect(errors[0]?.message).toBe('Digits only')
    })

    it('passes valid string', () => {
        const errors = validator.validate({
            fieldId,
            value: 'Hello',
            validation: { required: true, minLength: 2, maxLength: 10, pattern: '^[A-Za-z]+$' },
            now: new Date(),
        })
        expect(errors).toHaveLength(0)
    })

    it('returns type error for non-string value', () => {
        const errors = validator.validate({ fieldId, value: 42, validation: { required: true }, now: new Date() })
        expect(errors[0]).toMatchObject({ fieldId, rule: 'TYPE', params: { expectedType: 'string' } })
    })

    it('passes when value exactly at minLength boundary', () => {
        const errors = validator.validate({ fieldId, value: 'abc', validation: { minLength: 3 }, now: new Date() })
        expect(errors).toHaveLength(0)
    })

    it('passes when value exactly at maxLength boundary', () => {
        const errors = validator.validate({ fieldId, value: 'abc', validation: { maxLength: 3 }, now: new Date() })
        expect(errors).toHaveLength(0)
    })

    it('passes pattern matching a valid value', () => {
        const errors = validator.validate({
            fieldId,
            value: '12345',
            validation: { pattern: '^[0-9]+$' },
            now: new Date(),
        })
        expect(errors).toHaveLength(0)
    })

    it('passes for any string when validation is undefined', () => {
        const errors = validator.validate({ fieldId, value: 'anything', validation: undefined, now: new Date() })
        expect(errors).toHaveLength(0)
    })

    it('returns type error for boolean value without required flag', () => {
        const errors = validator.validate({ fieldId, value: true, validation: undefined, now: new Date() })
        expect(errors).toHaveLength(1)
        expect(errors[0]).toMatchObject({ fieldId, rule: 'TYPE', params: { expectedType: 'string' } })
    })

    it('returns multiple errors when minLength and pattern both fail', () => {
        const errors = validator.validate({
            fieldId,
            value: 'ab',
            validation: { minLength: 5, pattern: '^[0-9]+$' },
            now: new Date(),
        })
        expect(errors).toHaveLength(2)
        expect(errors[0]).toMatchObject({ rule: 'MIN_LENGTH' })
        expect(errors[1]).toMatchObject({ rule: 'PATTERN' })
    })

    describe('pattern safety', () => {
        const validate = (value: string, validation: Record<string, unknown>) =>
            validator.validate({ fieldId, value, validation, now: new Date() })

        it('skips the pattern when maxLength fails', () => {
            const errors = validate(`${'a'.repeat(40)}!`, { maxLength: 30, pattern: '^[0-9]+$' })
            expect(errors).toHaveLength(1)
            expect(errors[0]).toMatchObject({ rule: 'MAX_LENGTH' })
        })

        it('fails a value over 10000 characters without maxLength', () => {
            const errors = validate('a'.repeat(10001), { pattern: '^a+$', patternMessage: 'Only a' })
            expect(errors).toHaveLength(1)
            expect(errors[0]).toMatchObject({ rule: 'PATTERN', message: 'Only a' })
        })

        it('runs the pattern on a value of exactly 10000 characters', () => {
            expect(validate('a'.repeat(10000), { pattern: '^a+$' })).toHaveLength(0)
        })

        it('runs the pattern on a long value when maxLength allows it', () => {
            expect(validate('a'.repeat(10001), { maxLength: 20000, pattern: '^a+$' })).toHaveLength(0)
        })

        it('fails an unsafe pattern without running it', () => {
            const errors = validate(`${'a'.repeat(40)}!`, { pattern: '^(a+)+$' })
            expect(errors).toHaveLength(1)
            expect(errors[0]).toMatchObject({ rule: 'PATTERN' })
        })

        it('fails a value that an unsafe pattern would match', () => {
            expect(validate('aaa', { pattern: '^(a+)+$' })[0]).toMatchObject({ rule: 'PATTERN' })
        })

        it('fails a pattern longer than 1000 characters', () => {
            expect(validate('a', { pattern: `a|${'b'.repeat(1000)}` })[0]).toMatchObject({ rule: 'PATTERN' })
        })

        it('fails an invalid pattern instead of throwing', () => {
            expect(validate('abc', { pattern: '[invalid(' })[0]).toMatchObject({ rule: 'PATTERN' })
        })
    })
})
