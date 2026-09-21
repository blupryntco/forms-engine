'use client'

import type { FC } from 'react'

import { findToken, tokenLabel, tokensByChain } from '@/shared/data'

const truncate = (address: string): string => (address.length > 44 ? `${address.slice(0, 41)}…` : address)

/**
 * Token picker for `blockchain` values and for a `sustainability` value's
 * `address`. A value outside the catalogue is offered back as a "Custom" option
 * so documents written before the catalogue existed keep rendering.
 */
export const TokenSelect: FC<{
    value: string | undefined
    placeholder?: string
    hasError?: boolean
    onChange: (value: string | undefined) => void
}> = ({ value, placeholder, hasError = false, onChange }) => {
    const isCustom = value !== undefined && value !== '' && findToken(value) === undefined

    return (
        <select
            value={value ?? ''}
            onChange={(e) => onChange(e.target.value || undefined)}
            className={`w-full rounded-md border px-3 py-2 text-sm outline-none transition-colors ${
                hasError
                    ? 'border-red-400 focus:border-red-500 focus:ring-1 focus:ring-red-500'
                    : 'border-gray-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500'
            }`}>
            <option value="">{placeholder ?? '— Select a token —'}</option>
            {isCustom && <option value={value}>Custom — {truncate(value)}</option>}
            {tokensByChain().map(([chain, tokens]) => (
                <optgroup key={chain} label={chain}>
                    {tokens.map((token) => (
                        <option key={token.address} value={token.address}>
                            {tokenLabel(token)}
                        </option>
                    ))}
                </optgroup>
            ))}
        </select>
    )
}

/** Read-only counterpart: the resolved token name above the raw CAIP address. */
export const TokenValue: FC<{ value: string | undefined }> = ({ value }) => {
    if (!value) return <span className="text-gray-400 italic">—</span>

    const token = findToken(value)
    return (
        <div>
            {token && <div>{tokenLabel(token)}</div>}
            <div className={`font-mono break-all ${token ? 'text-xs text-gray-500' : 'text-sm'}`}>{value}</div>
        </div>
    )
}
