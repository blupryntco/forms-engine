'use client'

import type { FC } from 'react'

import type { SectionEditProps, SectionViewProps } from '@bluprynt/forms-viewer'

export const SectionView: FC<SectionViewProps> = ({ section, children }) => (
    <div className="mb-6 rounded-lg border border-gray-300 bg-white p-4">
        <h3 className="mb-1 text-base font-semibold text-gray-800">{section.title}</h3>
        {section.description && <p className="mb-3 text-sm text-gray-500">{section.description}</p>}
        <div>{children}</div>
    </div>
)

export const SectionEdit: FC<SectionEditProps> = ({ section, children }) => (
    <div className="mb-6 rounded-lg border border-gray-300 bg-white p-4">
        <h3 className="mb-1 text-base font-semibold text-gray-800">{section.title}</h3>
        {section.description && <p className="mb-3 text-sm text-gray-500">{section.description}</p>}
        <div>{children}</div>
    </div>
)
