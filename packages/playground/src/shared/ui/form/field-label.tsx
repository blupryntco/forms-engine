'use client'

import type { FC } from 'react'

type FieldLabelProps = {
    label: string
    description?: string
    referenceId?: string
}

/** `answer_guidelines` is deliberately not rendered here — it belongs below the
 * control, as an {@link AnswerGuidelines} block. */
export const FieldLabel: FC<FieldLabelProps> = ({ label, description, referenceId }) => (
    <div className="mb-1">
        <div className="flex items-baseline justify-between gap-2">
            <span className="text-sm font-medium text-gray-700">{label}</span>
            {referenceId && (
                <span className="shrink-0 rounded bg-gray-100 px-1.5 py-0.5 font-mono text-[10px] text-gray-500">
                    {referenceId}
                </span>
            )}
        </div>
        {description && <p className="text-xs text-gray-500">{description}</p>}
    </div>
)
