import { BlockchainValidator } from './blockchain-validator'

const validator = new BlockchainValidator()
const fieldId = 1
const now = new Date()
const address = 'eip155:1/erc20:0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48'

describe('BlockchainValidator', () => {
    it('returns required error for null', () => {
        const errors = validator.validate({ fieldId, value: null, validation: { required: true }, now })
        expect(errors[0]).toMatchObject({ fieldId, rule: 'REQUIRED' })
    })

    it('returns required error for undefined', () => {
        const errors = validator.validate({ fieldId, value: undefined, validation: { required: true }, now })
        expect(errors[0]?.rule).toBe('REQUIRED')
    })

    it('returns required error for an empty string', () => {
        const errors = validator.validate({ fieldId, value: '', validation: { required: true }, now })
        expect(errors[0]?.rule).toBe('REQUIRED')
    })

    it('passes when required and an address is present', () => {
        const errors = validator.validate({ fieldId, value: address, validation: { required: true }, now })
        expect(errors).toHaveLength(0)
    })

    it('passes for an absent value when not required', () => {
        const errors = validator.validate({ fieldId, value: undefined, validation: undefined, now })
        expect(errors).toHaveLength(0)
    })

    it('returns type error for a non-string value', () => {
        const errors = validator.validate({ fieldId, value: 42, validation: undefined, now })
        expect(errors[0]).toMatchObject({ rule: 'TYPE', params: { expectedType: 'blockchain' } })
    })

    it('accepts any string -- the CAIP format is never checked', () => {
        const errors = validator.validate({ fieldId, value: 'not-a-caip-address', validation: { required: true }, now })
        expect(errors).toHaveLength(0)
    })
})
