'use client'

import type { FC } from 'react'
import { Pane, SplitPane } from 'react-split-pane'

import { useAtomValue } from 'jotai'

import {
    builderPanelVisibleAtom,
    editorPanelVisibleAtom,
    jsonPanelVisibleAtom,
    viewerPanelVisibleAtom,
} from '@/entities/layout'
import { FormBuilder } from '@/widgets/form-builder'
import { FormEditor } from '@/widgets/form-editor'
import { FormViewer } from '@/widgets/form-viewer'
import { Header } from '@/widgets/header'
import { RawForm } from '@/widgets/raw-form'

export const Playground: FC = () => {
    const jsonVisible = useAtomValue(jsonPanelVisibleAtom)
    const viewerVisible = useAtomValue(viewerPanelVisibleAtom)
    const editorVisible = useAtomValue(editorPanelVisibleAtom)
    const builderVisible = useAtomValue(builderPanelVisibleAtom)

    const visibleCount = [jsonVisible, viewerVisible, editorVisible, builderVisible].filter(Boolean).length
    const defaultSize = visibleCount > 0 ? `${Math.floor(100 / visibleCount)}%` : '100%'

    return (
        <div className="flex h-screen flex-col bg-gray-100">
            <Header />
            <div className="min-h-0 flex-1">
                {visibleCount === 0 ? (
                    <div className="flex h-full items-center justify-center text-gray-400">No panels visible</div>
                ) : (
                    <SplitPane
                        key={`${jsonVisible}-${viewerVisible}-${editorVisible}-${builderVisible}`}
                        direction="horizontal"
                        className="h-full">
                        {jsonVisible && (
                            <Pane defaultSize={defaultSize} minSize="200px">
                                <RawForm />
                            </Pane>
                        )}
                        {viewerVisible && (
                            <Pane defaultSize={defaultSize} minSize="200px">
                                <FormViewer />
                            </Pane>
                        )}
                        {editorVisible && (
                            <Pane defaultSize={defaultSize} minSize="200px">
                                <FormEditor />
                            </Pane>
                        )}
                        {builderVisible && (
                            <Pane minSize="200px">
                                <FormBuilder />
                            </Pane>
                        )}
                    </SplitPane>
                )}
            </div>
        </div>
    )
}
