'use client'

import type { FC } from 'react'

type FieldLabelProps = {
    label: string
    description?: string
}

export const FieldLabel: FC<FieldLabelProps> = ({ label, description }) => (
    <div className="mb-1">
        <span className="text-sm font-medium text-gray-700">{label}</span>
        {description && <p className="text-xs text-gray-500">{description}</p>}
    </div>
)
