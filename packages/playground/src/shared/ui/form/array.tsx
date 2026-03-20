'use client'

import type { FC } from 'react'

import type { ArrayEditProps, ArrayViewProps } from '@bluprynt/forms-viewer'

import { FieldLabel } from './field-label'

export const ArrayView: FC<ArrayViewProps> = ({ field, value, children }) => (
    <div className="mb-4">
        <FieldLabel label={field.label} description={field.description} />
        {value && value.length > 0 ? (
            <div className="space-y-2 rounded-md border border-gray-200 bg-gray-50 p-3">{children}</div>
        ) : (
            <div className="rounded-md border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-400 italic">
                No items
            </div>
        )}
    </div>
)

export const ArrayEdit: FC<ArrayEditProps> = ({ field, value, children, errors, onAddItem, onRemoveItem }) => {
    const hasError = errors.length > 0
    const items = value ?? []
    return (
        <div className="mb-4">
            <FieldLabel label={field.label} description={field.description} />
            <div className={`rounded-md border p-3 ${hasError ? 'border-red-400' : 'border-gray-300'}`}>
                {items.length > 0 ? (
                    <div className="space-y-2">
                        {Array.from({ length: items.length }, (_, i) => (
                            <div key={i} className="flex items-start gap-2">
                                <div className="min-w-0 flex-1">{children[i]}</div>
                                <button
                                    type="button"
                                    onClick={() => onRemoveItem(i)}
                                    className="mt-1 shrink-0 rounded px-2 py-1 text-xs text-red-600 hover:bg-red-50">
                                    Remove
                                </button>
                            </div>
                        ))}
                    </div>
                ) : (
                    <p className="text-sm text-gray-400 italic">No items</p>
                )}
                <button
                    type="button"
                    onClick={onAddItem}
                    className="mt-3 rounded-md bg-blue-50 px-3 py-1.5 text-xs font-medium text-blue-700 hover:bg-blue-100">
                    + Add item
                </button>
            </div>
        </div>
    )
}
