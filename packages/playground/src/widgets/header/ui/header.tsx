'use client'

import type { FC } from 'react'

import type { PrimitiveAtom } from 'jotai'
import { useAtom } from 'jotai'

import {
    builderPanelVisibleAtom,
    editorPanelVisibleAtom,
    jsonPanelVisibleAtom,
    viewerPanelVisibleAtom,
} from '@/entities/layout'
import { FormSelector } from '@/widgets/form-selector'

const ToggleButton: FC<{ atom: PrimitiveAtom<boolean>; label: string }> = ({ atom, label }) => {
    const [visible, setVisible] = useAtom(atom)

    return (
        <button
            type="button"
            className={`rounded px-3 py-1 text-sm font-medium transition-colors border ${
                visible
                    ? 'border-gray-800 bg-gray-800 text-white'
                    : 'border-gray-300 bg-gray-50 text-gray-500 hover:bg-gray-200'
            }`}
            onClick={() => setVisible(!visible)}>
            {label}
        </button>
    )
}

export const Header: FC = () => {
    return (
        <header className="flex shrink-0 items-center justify-between border-b border-gray-300 bg-white px-4 py-3">
            <h1 className="text-lg font-semibold text-gray-800">Bluprynt Forms Playground</h1>
            <div className="flex items-center gap-4">
                <div className="flex gap-1">
                    <ToggleButton atom={jsonPanelVisibleAtom} label="JSON" />
                    <ToggleButton atom={viewerPanelVisibleAtom} label="Viewer" />
                    <ToggleButton atom={editorPanelVisibleAtom} label="Editor" />
                    <ToggleButton atom={builderPanelVisibleAtom} label="Builder" />
                </div>
                <FormSelector />
            </div>
        </header>
    )
}
