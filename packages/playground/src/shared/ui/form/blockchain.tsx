'use client'

import type { FC } from 'react'

import type { BlockchainEditProps, BlockchainViewProps } from '@bluprynt/forms-viewer'

import { AnswerGuidelines } from './answer-guidelines'
import { FieldLabel } from './field-label'
import { Suggestion } from './suggestion'
import { TokenSelect, TokenValue } from './token-select'

export const BlockchainView: FC<BlockchainViewProps> = ({ field, value, suggestion }) => (
    <div className="mb-4">
        <FieldLabel label={field.label} description={field.description} referenceId={field.reference_id} />
        <div className="rounded-md border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-900">
            <TokenValue value={value} />
        </div>
        <AnswerGuidelines text={field.answer_guidelines} />
        <Suggestion suggestion={suggestion} />
    </div>
)

export const BlockchainEdit: FC<BlockchainEditProps> = ({
    field,
    value,
    errors,
    onChange,
    suggestion,
    onAcceptSuggestion,
    onRejectSuggestion,
}) => (
    <div className="mb-4">
        <FieldLabel label={field.label} description={field.description} referenceId={field.reference_id} />
        <TokenSelect value={value} placeholder={field.placeholder} hasError={errors.length > 0} onChange={onChange} />
        <AnswerGuidelines text={field.answer_guidelines} />
        <Suggestion suggestion={suggestion} onAccept={onAcceptSuggestion} onReject={onRejectSuggestion} />
    </div>
)
