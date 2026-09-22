'use client'

import type { FC } from 'react'

import type { StaticEditProps, StaticViewProps } from '@bluprynt/forms-viewer'

/**
 * Renders a display-only text block. Static blocks hold no value, so the same
 * component serves both the viewer and the editor — there is nothing to edit.
 */
export const StaticView: FC<StaticViewProps> = ({ field }) => (
    <div className="mb-4 rounded-md border-l-2 border-blue-300 bg-blue-50/60 px-3 py-2">
        {(field.label || field.reference_id) && (
            <div className="mb-1 flex items-baseline justify-between gap-2">
                {field.label && <span className="text-sm font-medium text-gray-800">{field.label}</span>}
                {field.reference_id && (
                    <span className="shrink-0 rounded bg-white px-1.5 py-0.5 font-mono text-[10px] text-gray-500">
                        {field.reference_id}
                    </span>
                )}
            </div>
        )}
        <p className="text-sm whitespace-pre-line text-gray-700">{field.text}</p>
        {field.description && <p className="mt-1 text-xs text-gray-500">{field.description}</p>}
    </div>
)

/**
 * A static block is identical in view and edit mode — there is nothing to
 * change — but both component maps need their own entry.
 */
export const StaticEdit: FC<StaticEditProps> = ({ field }) => <StaticView field={field} />
