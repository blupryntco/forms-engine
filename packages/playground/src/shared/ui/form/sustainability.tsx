'use client'

import type { FC } from 'react'

import type { SustainabilityValue } from '@bluprynt/forms-core'
import type { SustainabilityEditProps, SustainabilityViewProps } from '@bluprynt/forms-viewer'

import { AnswerGuidelines } from './answer-guidelines'
import { FieldLabel } from './field-label'
import { Suggestion } from './suggestion'
import { TokenSelect, TokenValue } from './token-select'

const TEXT_PARTS = [
    { key: 'ccri', label: 'CCRI', placeholder: 'CCRI reference' },
    { key: 'cmc', label: 'CMC', placeholder: 'CoinMarketCap reference' },
] as const satisfies readonly { key: 'ccri' | 'cmc'; label: string; placeholder: string }[]

/** An all-blank object is emitted as `undefined`, so `required` behaves like every other type. */
const normalize = (value: SustainabilityValue): SustainabilityValue | undefined =>
    value.address || value.ccri || value.cmc ? value : undefined

export const SustainabilityView: FC<SustainabilityViewProps> = ({ field, value, suggestion }) => (
    <div className="mb-4">
        <FieldLabel label={field.label} description={field.description} referenceId={field.reference_id} />
        <div className="rounded-md border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-900">
            {value ? (
                <dl className="space-y-1.5">
                    <div className="flex gap-2">
                        <dt className="w-28 shrink-0 text-xs text-gray-500">Asset address</dt>
                        <dd className="min-w-0">
                            <TokenValue value={value.address} />
                        </dd>
                    </div>
                    {TEXT_PARTS.map((part) => (
                        <div key={part.key} className="flex gap-2">
                            <dt className="w-28 shrink-0 text-xs text-gray-500">{part.label}</dt>
                            <dd className="break-all">
                                {value[part.key] || <span className="text-gray-400 italic">—</span>}
                            </dd>
                        </div>
                    ))}
                </dl>
            ) : (
                <span className="text-gray-400 italic">—</span>
            )}
        </div>
        <AnswerGuidelines text={field.answer_guidelines} />
        <Suggestion suggestion={suggestion} />
    </div>
)

export const SustainabilityEdit: FC<SustainabilityEditProps> = ({
    field,
    value,
    errors,
    onChange,
    suggestion,
    onAcceptSuggestion,
    onRejectSuggestion,
}) => {
    const hasError = errors.length > 0
    const current: SustainabilityValue = value ?? { address: '' }
    const update = (patch: Partial<SustainabilityValue>) => onChange(normalize({ ...current, ...patch }))

    return (
        <div className="mb-4">
            <FieldLabel label={field.label} description={field.description} referenceId={field.reference_id} />
            <div className={`space-y-2 rounded-md border p-3 ${hasError ? 'border-red-400' : 'border-gray-300'}`}>
                <div>
                    <span className="mb-1 block text-xs text-gray-500">Asset address</span>
                    <TokenSelect value={current.address || undefined} onChange={(v) => update({ address: v ?? '' })} />
                </div>
                {TEXT_PARTS.map((part) => (
                    <label key={part.key} className="block">
                        <span className="mb-1 block text-xs text-gray-500">{part.label}</span>
                        <input
                            type="text"
                            value={current[part.key] ?? ''}
                            placeholder={part.placeholder}
                            spellCheck={false}
                            onChange={(e) => update({ [part.key]: e.target.value })}
                            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm outline-none transition-colors focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                        />
                    </label>
                ))}
            </div>
            <AnswerGuidelines text={field.answer_guidelines} />
            <Suggestion suggestion={suggestion} onAccept={onAcceptSuggestion} onReject={onRejectSuggestion} />
        </div>
    )
}
