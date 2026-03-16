'use client'

import type { FC } from 'react'

import { FormSelector } from '@/widgets/form-selector'

export const Header: FC = () => {
    return (
        <header className="flex shrink-0 items-center justify-between border-b border-gray-300 bg-white px-4 py-3">
            <h1 className="text-lg font-semibold text-gray-800">Bluprynt Forms Playground</h1>
            <FormSelector />
        </header>
    )
}
