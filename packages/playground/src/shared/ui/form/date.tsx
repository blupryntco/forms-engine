'use client'

import type { FC } from 'react'

import type { DateEditProps, DateViewProps } from '@bluprynt/forms-viewer'

import { FieldLabel } from './field-label'

export const DateView: FC<DateViewProps> = ({ field, value }) => (
    <div className="mb-4">
        <FieldLabel label={field.label} description={field.description} />
        <div className="rounded-md border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-900">
            {value ?? <span className="text-gray-400 italic">—</span>}
        </div>
    </div>
)

export const DateEdit: FC<DateEditProps> = ({ field, value, errors, onChange }) => {
    const hasError = errors.length > 0
    return (
        <div className="mb-4">
            <FieldLabel label={field.label} description={field.description} />
            <input
                type="date"
                value={value ?? ''}
                onChange={(e) => onChange(e.target.value || undefined)}
                className={`w-full rounded-md border px-3 py-2 text-sm outline-none transition-colors ${
                    hasError
                        ? 'border-red-400 focus:border-red-500 focus:ring-1 focus:ring-red-500'
                        : 'border-gray-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500'
                }`}
            />
        </div>
    )
}
