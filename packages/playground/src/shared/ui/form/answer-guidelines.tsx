'use client'

import type { FC } from 'react'

import { Info } from 'lucide-react'

/**
 * Renders a field's or section's `answer_guidelines` as a muted block beneath
 * the control it applies to. Renders nothing when there are no guidelines.
 */
export const AnswerGuidelines: FC<{ text?: string }> = ({ text }) =>
    text ? (
        <div className="mt-1.5 flex items-start gap-2 rounded-md bg-gray-100 py-2 pr-3 pl-3">
            <Info className="mt-px size-3.5 shrink-0 text-gray-400" aria-hidden />
            <p className="text-xs whitespace-pre-line text-gray-500">{text}</p>
        </div>
    ) : null
