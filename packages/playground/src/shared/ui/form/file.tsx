'use client'

import type { FC } from 'react'

import type { FileEditProps, FileViewProps } from '@bluprynt/forms-viewer'

import { FieldLabel } from './field-label'

export const FileView: FC<FileViewProps> = ({ field, value }) => (
    <div className="mb-4">
        <FieldLabel label={field.label} description={field.description} />
        <div className="rounded-md border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-900">
            {value ? (
                <div>
                    <a
                        href={value.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:underline">
                        {value.name}
                    </a>
                    <p className="text-xs text-gray-500">
                        {value.mimeType} · {value.size?.toLocaleString()} bytes
                    </p>
                </div>
            ) : (
                <span className="text-gray-400 italic">—</span>
            )}
        </div>
    </div>
)

export const FileEdit: FC<FileEditProps> = ({ field, value, errors, onChange }) => {
    const hasError = errors.length > 0
    return (
        <div className="mb-4">
            <FieldLabel label={field.label} description={field.description} />
            {value ? (
                <div
                    className={`flex items-center justify-between rounded-md border px-3 py-2 text-sm ${
                        hasError ? 'border-red-400' : 'border-gray-300'
                    }`}>
                    <span className="truncate text-gray-900">{value.name}</span>
                    <button
                        type="button"
                        onClick={() => onChange(undefined)}
                        className="shrink-0 rounded px-2 py-1 text-xs text-red-600 hover:bg-red-50">
                        Remove
                    </button>
                </div>
            ) : (
                <label
                    className={`flex cursor-pointer flex-col items-center justify-center rounded-md border-2 border-dashed px-3 py-4 text-sm transition-colors ${
                        hasError ? 'border-red-400 hover:border-red-500' : 'border-gray-300 hover:border-blue-400'
                    }`}>
                    <span className="text-gray-500">Click to select a file</span>
                    <input
                        type="file"
                        className="hidden"
                        onChange={(e) => {
                            const file = e.target.files?.[0]
                            if (!file) return
                            onChange({
                                name: file.name,
                                mimeType: file.type,
                                size: file.size,
                                url: `https://storage.example.com/files/${crypto.randomUUID()}/${file.name}`,
                            })
                        }}
                    />
                </label>
            )}
        </div>
    )
}
