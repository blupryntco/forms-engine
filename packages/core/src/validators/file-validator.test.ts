import { FileValidator } from './file-validator'

const validator = new FileValidator()
const fieldId = 1

const validFile = {
    name: 'doc.pdf',
    mimeType: 'application/pdf',
    size: 1024,
    url: 'https://example.com/doc.pdf',
}

describe('FileValidator', () => {
    it('returns required error for null', () => {
        const errors = validator.validate({ fieldId, value: null, validation: { required: true }, now: new Date() })
        expect(errors[0]).toMatchObject({ fieldId, rule: 'REQUIRED' })
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

    it('passes when required and valid file object', () => {
        const errors = validator.validate({
            fieldId,
            value: validFile,
            validation: { required: true },
            now: new Date(),
        })
        expect(errors).toHaveLength(0)
    })

    it('passes when optional and null', () => {
        const errors = validator.validate({ fieldId, value: null, validation: undefined, now: new Date() })
        expect(errors).toHaveLength(0)
    })

    it('returns type error for string instead of object', () => {
        const errors = validator.validate({ fieldId, value: 'not-a-file', validation: undefined, now: new Date() })
        expect(errors[0]).toMatchObject({
            fieldId,
            rule: 'TYPE',
            params: { expectedType: 'file' },
        })
    })

    it('returns type error for object missing properties', () => {
        const errors = validator.validate({
            fieldId,
            value: { name: 'doc.pdf' },
            validation: undefined,
            now: new Date(),
        })
        expect(errors[0]?.rule).toBe('TYPE')
    })

    it('returns type error when property has wrong type (size is string)', () => {
        const errors = validator.validate({
            fieldId,
            value: { ...validFile, size: '1024' },
            validation: undefined,
            now: new Date(),
        })
        expect(errors[0]?.rule).toBe('TYPE')
    })

    it('passes when optional and undefined', () => {
        const errors = validator.validate({ fieldId, value: undefined, validation: undefined, now: new Date() })
        expect(errors).toHaveLength(0)
    })

    it('passes with valid file when no validation rules', () => {
        const errors = validator.validate({ fieldId, value: validFile, validation: undefined, now: new Date() })
        expect(errors).toHaveLength(0)
    })

    it('returns type error for array value (typeof object)', () => {
        const errors = validator.validate({ fieldId, value: [1, 2, 3], validation: undefined, now: new Date() })
        expect(errors).toHaveLength(1)
        expect(errors[0]).toMatchObject({ fieldId, rule: 'TYPE', params: { expectedType: 'file' } })
    })

    it('passes with extra properties on file object', () => {
        const errors = validator.validate({
            fieldId,
            value: { ...validFile, extra: 'data', anotherProp: 42 },
            validation: undefined,
            now: new Date(),
        })
        expect(errors).toHaveLength(0)
    })
})
