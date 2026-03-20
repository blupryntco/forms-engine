'use client'

import type { FC } from 'react'

import type { ErrorProps } from '@bluprynt/forms-viewer'

export const ErrorView: FC<ErrorProps> = ({ errors }) => (
    <div className="-mt-3 mb-4">
        {errors.map((err, i) => (
            <p key={i} className="text-xs text-red-600">
                {err.message}
            </p>
        ))}
    </div>
)
