/**
 * Demo catalogue of CAIP-19 asset identifiers offered by the playground's
 * `blockchain` field editor.
 *
 * The engine itself never resolves or validates an address — a `blockchain`
 * value is an opaque string to it. This list exists only so the playground can
 * show a token picker instead of a bare text box; a real app would fetch its
 * own catalogue. Chain names and ids follow `@blupryntco/caip-tools`.
 */
export type TokenOption = {
    /** CAIP-19 asset identifier. */
    address: string
    name: string
    symbol: string
    /** Display name of the chain the asset lives on. */
    chain: string
}

export const KNOWN_TOKENS: TokenOption[] = [
    { address: 'eip155:1/slip44:60', name: 'Ether', symbol: 'ETH', chain: 'Ethereum' },
    {
        address: 'eip155:1/erc20:0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
        name: 'USD Coin',
        symbol: 'USDC',
        chain: 'Ethereum',
    },
    {
        address: 'eip155:1/erc20:0xdac17f958d2ee523a2206206994597c13d831ec7',
        name: 'Tether USD',
        symbol: 'USDT',
        chain: 'Ethereum',
    },
    {
        address: 'eip155:1/erc20:0x6b175474e89094c44da98b954eedeac495271d0f',
        name: 'Dai Stablecoin',
        symbol: 'DAI',
        chain: 'Ethereum',
    },
    {
        address: 'eip155:1/erc20:0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2',
        name: 'Wrapped Ether',
        symbol: 'WETH',
        chain: 'Ethereum',
    },
    {
        address: 'eip155:8453/erc20:0x833589fcd6edb6e08f4c7c32d4f71b54bda02913',
        name: 'USD Coin',
        symbol: 'USDC',
        chain: 'Base',
    },
    {
        address: 'eip155:137/erc20:0x3c499c542cef5e3811e1192ce70d8cc03d5c3359',
        name: 'USD Coin',
        symbol: 'USDC',
        chain: 'Polygon',
    },
    {
        address: 'eip155:42161/erc20:0xaf88d065e77c8cc2239327c5edb3a432268e5831',
        name: 'USD Coin',
        symbol: 'USDC',
        chain: 'Arbitrum One',
    },
    {
        address: 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp/slip44:501',
        name: 'Solana',
        symbol: 'SOL',
        chain: 'Solana',
    },
    {
        address: 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp/token:EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
        name: 'USD Coin',
        symbol: 'USDC',
        chain: 'Solana',
    },
]

export const findToken = (address: string | undefined): TokenOption | undefined =>
    address === undefined ? undefined : KNOWN_TOKENS.find((token) => token.address === address)

export const tokenLabel = (token: TokenOption): string => `${token.name} (${token.symbol}) — ${token.chain}`

/** The catalogue grouped by chain, preserving the declaration order. */
export const tokensByChain = (): [string, TokenOption[]][] => {
    const groups = new Map<string, TokenOption[]>()
    for (const token of KNOWN_TOKENS) {
        const existing = groups.get(token.chain)
        if (existing) existing.push(token)
        else groups.set(token.chain, [token])
    }
    return [...groups.entries()]
}
