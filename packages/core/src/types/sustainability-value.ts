/**
 * Sustainability data for an on-chain asset.
 *
 * The engine does not resolve or verify any of these -- the consumer produces
 * the object and the engine stores it verbatim.
 *
 * @property address - CAIP address of the asset the data describes. Opaque to
 *   the engine: its format is never checked.
 * @property ccri - CCRI (Crypto Carbon Ratings Institute) reference.
 * @property cmc - CoinMarketCap reference.
 */
export type SustainabilityValue = {
    address: string
    ccri?: string
    cmc?: string
}
