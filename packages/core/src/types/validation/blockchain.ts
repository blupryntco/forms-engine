/**
 * Validation rules for `blockchain` fields.
 *
 * The value is an opaque CAIP address string -- there is deliberately no format
 * rule, so a malformed address is the consumer's concern, not the engine's.
 *
 * @property required - Whether an address must be provided.
 */
export type BlockchainValidation = {
    required?: boolean
}
