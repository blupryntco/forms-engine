'use client'

import type { FC } from 'react'

import type { FieldSuggestion } from '@bluprynt/forms-viewer'

type SuggestionProps = {
    suggestion: FieldSuggestion | undefined
    /** Omitted in read-only mode, which renders the suggestion without actions. */
    onAccept?: () => void
    onReject?: () => void
}

const formatValue = (value: unknown): string => {
    if (value === undefined || value === null) return '—'
    if (typeof value === 'string') return value
    return JSON.stringify(value)
}

export const Suggestion: FC<SuggestionProps> = ({ suggestion, onAccept, onReject }) => {
    if (!suggestion) return null

    return (
        <div className="mt-1.5 rounded-md border border-violet-200 bg-violet-50 px-3 py-2">
            <div className="flex items-baseline justify-between gap-2">
                <span className="text-[10px] font-semibold tracking-wide text-violet-700 uppercase">Suggested</span>
                <span className="shrink-0 text-[10px] text-violet-600">
                    {Math.round(suggestion.confidence * 100)}% confidence
                </span>
            </div>
            <p className="mt-0.5 text-sm text-gray-900">{formatValue(suggestion.value)}</p>
            <p className="mt-0.5 text-xs text-violet-700">{suggestion.source}</p>
            {(onAccept || onReject) && (
                <div className="mt-2 flex gap-2">
                    {onAccept && (
                        <button
                            type="button"
                            onClick={onAccept}
                            className="rounded bg-violet-600 px-2 py-1 text-xs font-medium text-white hover:bg-violet-700">
                            Accept
                        </button>
                    )}
                    {onReject && (
                        <button
                            type="button"
                            onClick={onReject}
                            className="rounded border border-violet-300 bg-white px-2 py-1 text-xs font-medium text-violet-700 hover:bg-violet-100">
                            Reject
                        </button>
                    )}
                </div>
            )}
        </div>
    )
}
