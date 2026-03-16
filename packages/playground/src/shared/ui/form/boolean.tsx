'use client'

import type { FC } from 'react'

import type { BooleanEditProps, BooleanViewProps } from '@bluprynt/forms-viewer'

import { FieldLabel } from './field-label'

export const BooleanView: FC<BooleanViewProps> = ({ field, value }) => (
    <div className="mb-4">
        <FieldLabel label={field.label} description={field.description} />
        <div className="rounded-md border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-900">
            {value !== undefined ? value ? 'Yes' : 'No' : <span className="text-gray-400 italic">—</span>}
        </div>
    </div>
)

export const BooleanEdit: FC<BooleanEditProps> = ({ field, value, errors, onChange }) => {
    const hasError = errors.length > 0
    return (
        <div className="mb-4">
            <FieldLabel label={field.label} description={field.description} />
            <label
                className={`flex cursor-pointer items-center gap-2 rounded-md border px-3 py-2 text-sm ${
                    hasError ? 'border-red-400' : 'border-gray-300'
                }`}>
                <input
                    type="checkbox"
                    checked={value ?? false}
                    onChange={(e) => onChange(e.target.checked)}
                    className="h-4 w-4 rounded border-gray-300 text-blue-600"
                />
                <span className="text-gray-700">{value ? 'Yes' : 'No'}</span>
            </label>
        </div>
    )
}
