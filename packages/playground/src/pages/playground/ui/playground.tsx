'use client'

import type { FC } from 'react'

import { FormEditor } from '@/widgets/form-editor'
import { FormViewer } from '@/widgets/form-viewer'
import { Header } from '@/widgets/header'
import { RawForm } from '@/widgets/raw-form'

export const Playground: FC = () => (
    <div className="flex h-screen flex-col bg-gray-100">
        <Header />
        <div className="grid min-h-0 flex-1 grid-cols-3 gap-px bg-gray-300">
            <RawForm />
            <FormViewer />
            <FormEditor />
        </div>
    </div>
)
