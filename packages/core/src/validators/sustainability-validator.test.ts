import { SustainabilityValidator } from './sustainability-validator'

const validator = new SustainabilityValidator()
const fieldId = 1
const now = new Date()
const validValue = {
    address: 'eip155:1/erc20:0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
    ccri: 'CCRI-2026-001',
    cmc: '3408',
}

describe('SustainabilityValidator', () => {
    it('returns required error for null', () => {
        const errors = validator.validate({ fieldId, value: null, validation: { required: true }, now })
        expect(errors[0]).toMatchObject({ fieldId, rule: 'REQUIRED' })
    })

    it('returns required error for undefined', () => {
        const errors = validator.validate({ fieldId, value: undefined, validation: { required: true }, now })
        expect(errors[0]?.rule).toBe('REQUIRED')
    })

    it('passes for an absent value when not required', () => {
        const errors = validator.validate({ fieldId, value: undefined, validation: undefined, now })
        expect(errors).toHaveLength(0)
    })

    it('passes when required and the object is complete', () => {
        const errors = validator.validate({ fieldId, value: validValue, validation: { required: true }, now })
        expect(errors).toHaveLength(0)
    })

    it('passes when required and only address is filled', () => {
        const errors = validator.validate({
            fieldId,
            value: { address: validValue.address, ccri: '', cmc: '' },
            validation: { required: true },
            now,
        })
        expect(errors).toHaveLength(0)
    })

    it('returns required error when address is blank but ccri is filled', () => {
        const errors = validator.validate({
            fieldId,
            value: { address: '', ccri: 'CCRI-2026-001', cmc: '' },
            validation: { required: true },
            now,
        })
        expect(errors[0]?.rule).toBe('REQUIRED')
    })

    it('returns required error when the address key is absent', () => {
        const errors = validator.validate({ fieldId, value: { ccri: 'x' }, validation: { required: true }, now })
        expect(errors[0]?.rule).toBe('REQUIRED')
    })

    it('treats an absent address as empty rather than a type error', () => {
        const errors = validator.validate({ fieldId, value: { ccri: 'x' }, validation: undefined, now })
        expect(errors).toHaveLength(0)
    })

    it('returns type error for a non-object value', () => {
        const errors = validator.validate({ fieldId, value: 'eip155:1', validation: { required: true }, now })
        expect(errors[0]).toMatchObject({ rule: 'TYPE', params: { expectedType: 'sustainability' } })
    })

    it('returns type error for an array value', () => {
        const errors = validator.validate({ fieldId, value: [], validation: undefined, now })
        expect(errors[0]?.rule).toBe('TYPE')
    })

    it('returns type error when address is not a string', () => {
        const errors = validator.validate({ fieldId, value: { address: 42 }, validation: undefined, now })
        expect(errors[0]?.rule).toBe('TYPE')
    })

    it('returns type error when ccri is not a string', () => {
        const errors = validator.validate({
            fieldId,
            value: { address: validValue.address, ccri: 42 },
            validation: undefined,
            now,
        })
        expect(errors[0]?.rule).toBe('TYPE')
    })

    it('returns type error when cmc is not a string', () => {
        const errors = validator.validate({
            fieldId,
            value: { address: validValue.address, cmc: {} },
            validation: undefined,
            now,
        })
        expect(errors[0]?.rule).toBe('TYPE')
    })
})
