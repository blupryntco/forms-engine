import type { FC, PropsWithChildren } from 'react'

import type { FormSectionItemProps } from '@bluprynt/forms-viewer'

export const SectionTabsContainer: FC<PropsWithChildren> = ({ children }) => (
    <div className="flex gap-0 overflow-x-auto border-b border-gray-200 bg-gray-50 px-2">{children}</div>
)

export const SectionTabItem: FC<FormSectionItemProps> = ({ section, active, select }) => (
    <button
        type="button"
        onClick={select}
        className={`shrink-0 border-b-2 px-3 py-2 text-xs transition-colors ${
            active
                ? 'border-blue-500 text-blue-700'
                : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
        }`}
        title={section.description}>
        {section.title}
    </button>
)
