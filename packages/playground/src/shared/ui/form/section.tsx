'use client'

import type { FC } from 'react'

import type { SectionContentItem, SectionEditProps, SectionViewProps } from '@bluprynt/forms-viewer'

const SectionHeader: FC<{ section: SectionContentItem }> = ({ section }) => (
    <>
        <div className="flex items-baseline justify-between gap-2">
            <h3 className="mb-1 text-base font-semibold text-gray-800">{section.title}</h3>
            {section.reference_id && (
                <span className="shrink-0 rounded bg-gray-100 px-1.5 py-0.5 font-mono text-[10px] text-gray-500">
                    {section.reference_id}
                </span>
            )}
        </div>
        {section.description && <p className="mb-2 text-sm text-gray-500">{section.description}</p>}
        {section.answer_guidelines && (
            <p className="mb-3 border-l-2 border-amber-300 pl-2 text-xs text-amber-700">{section.answer_guidelines}</p>
        )}
    </>
)

export const SectionView: FC<SectionViewProps> = ({ section, children }) => (
    <div className="mb-6 rounded-lg border border-gray-300 bg-white p-4">
        <SectionHeader section={section} />
        <div>{children}</div>
    </div>
)

export const SectionEdit: FC<SectionEditProps> = ({ section, children }) => (
    <div className="mb-6 rounded-lg border border-gray-300 bg-white p-4">
        <SectionHeader section={section} />
        <div>{children}</div>
    </div>
)
