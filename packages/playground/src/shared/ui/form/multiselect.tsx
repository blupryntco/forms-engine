'use client'

import type { FC } from 'react'

import type { MultiselectEditProps, MultiselectViewProps, SelectOption } from '@bluprynt/forms-viewer'

import { AnswerGuidelines } from './answer-guidelines'
import { FieldLabel } from './field-label'
import { Suggestion } from './suggestion'

/** Matches a stored value against an option, tolerating the string/number split. */
const findOption = (options: SelectOption[], raw: string): SelectOption | undefined =>
    options.find((o) => String(o.value) === raw)

export const MultiselectView: FC<MultiselectViewProps> = ({ field, value, options, suggestion }) => {
    const chosen = (value ?? []).map((v) => findOption(options, String(v))?.label ?? String(v))

    return (
        <div className="mb-4">
            <FieldLabel label={field.label} description={field.description} referenceId={field.reference_id} />
            <div className="flex flex-wrap gap-1.5 rounded-md border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-900">
                {chosen.length > 0 ? (
                    chosen.map((label) => (
                        <span key={label} className="rounded bg-white px-2 py-0.5 text-xs ring-1 ring-gray-200">
                            {label}
                        </span>
                    ))
                ) : (
                    <span className="text-gray-400 italic">—</span>
                )}
            </div>
            <AnswerGuidelines text={field.answer_guidelines} />
            <Suggestion suggestion={suggestion} />
        </div>
    )
}

export const MultiselectEdit: FC<MultiselectEditProps> = ({
    field,
    value,
    options,
    errors,
    onChange,
    suggestion,
    onAcceptSuggestion,
    onRejectSuggestion,
}) => {
    const selected = value ?? []
    const hasError = errors.length > 0

    const toggle = (option: SelectOption, checked: boolean) => {
        const next = checked ? [...selected, option.value] : selected.filter((v) => v !== option.value)
        // Emit undefined rather than [] so `required` behaves like every other type.
        onChange(next.length > 0 ? next : undefined)
    }

    return (
        <div className="mb-4">
            <FieldLabel label={field.label} description={field.description} referenceId={field.reference_id} />
            <div
                className={`flex flex-col gap-1.5 rounded-md border px-3 py-2 transition-colors ${
                    hasError ? 'border-red-400' : 'border-gray-300'
                }`}>
                {options.length === 0 && <span className="text-xs text-gray-400 italic">No options defined</span>}
                {options.map((option) => (
                    <label key={String(option.value)} className="flex items-center gap-2 text-sm text-gray-900">
                        <input
                            type="checkbox"
                            checked={selected.includes(option.value)}
                            onChange={(e) => toggle(option, e.target.checked)}
                            className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        {option.label}
                    </label>
                ))}
            </div>
            <AnswerGuidelines text={field.answer_guidelines} />
            <Suggestion suggestion={suggestion} onAccept={onAcceptSuggestion} onReject={onRejectSuggestion} />
        </div>
    )
}
