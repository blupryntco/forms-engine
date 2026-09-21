'use client'

import type { FC } from 'react'

import type { SelectEditProps, SelectViewProps } from '@bluprynt/forms-viewer'

import { FieldLabel } from './field-label'
import { Suggestion } from './suggestion'

export const SelectView: FC<SelectViewProps> = ({ field, value, options, suggestion }) => {
    const selected = options.find((o) => o.value === value)
    return (
        <div className="mb-4">
            <FieldLabel
                label={field.label}
                description={field.description}
                answerGuidelines={field.answer_guidelines}
                referenceId={field.reference_id}
            />
            <div className="rounded-md border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-900">
                {selected ? selected.label : <span className="text-gray-400 italic">—</span>}
            </div>
            <Suggestion suggestion={suggestion} />
        </div>
    )
}

export const SelectEdit: FC<SelectEditProps> = ({
    field,
    value,
    options,
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
            <select
                value={value !== undefined ? String(value) : ''}
                onChange={(e) => {
                    const raw = e.target.value
                    if (raw === '') {
                        onChange(undefined)
                        return
                    }
                    const opt = options.find((o) => String(o.value) === raw)
                    onChange(opt ? opt.value : raw)
                }}
                className={`w-full rounded-md border px-3 py-2 text-sm outline-none transition-colors ${
                    hasError
                        ? 'border-red-400 focus:border-red-500 focus:ring-1 focus:ring-red-500'
                        : 'border-gray-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500'
                }`}>
                <option value="">{field.placeholder ?? '— Select —'}</option>
                {options.map((opt) => (
                    <option key={String(opt.value)} value={String(opt.value)}>
                        {opt.label}
                    </option>
                ))}
            </select>
            <Suggestion suggestion={suggestion} onAccept={onAcceptSuggestion} onReject={onRejectSuggestion} />
        </div>
    )
}
