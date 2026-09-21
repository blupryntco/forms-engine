'use client'

import type { FC } from 'react'

import type { NumberEditProps, NumberViewProps } from '@bluprynt/forms-viewer'

import { FieldLabel } from './field-label'
import { Suggestion } from './suggestion'

export const NumberView: FC<NumberViewProps> = ({ field, value, suggestion }) => (
    <div className="mb-4">
        <FieldLabel
            label={field.label}
            description={field.description}
            answerGuidelines={field.answer_guidelines}
            referenceId={field.reference_id}
        />
        <div className="rounded-md border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-900">
            {value !== undefined ? String(value) : <span className="text-gray-400 italic">—</span>}
        </div>
        <Suggestion suggestion={suggestion} />
    </div>
)

export const NumberEdit: FC<NumberEditProps> = ({
    field,
    value,
    errors,
    onChange,
    suggestion,
    onAcceptSuggestion,
    onRejectSuggestion,
}) => {
    const hasError = errors.length > 0
    return (
        <div className="mb-4">
            <FieldLabel
                label={field.label}
                description={field.description}
                answerGuidelines={field.answer_guidelines}
                referenceId={field.reference_id}
            />
            <input
                type="number"
                value={value !== undefined ? String(value) : ''}
                placeholder={field.placeholder}
                onChange={(e) => {
                    const raw = e.target.value
                    onChange(raw === '' ? undefined : Number(raw))
                }}
                className={`w-full rounded-md border px-3 py-2 text-sm outline-none transition-colors ${
                    hasError
                        ? 'border-red-400 focus:border-red-500 focus:ring-1 focus:ring-red-500'
                        : 'border-gray-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500'
                }`}
            />
            <Suggestion suggestion={suggestion} onAccept={onAcceptSuggestion} onReject={onRejectSuggestion} />
        </div>
    )
}
