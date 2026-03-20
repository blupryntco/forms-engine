'use client'

import type { FC } from 'react'

import { FormBuilder as FormBuilderComponent } from '@bluprynt/forms-builder'
import { useAtom } from 'jotai'

import { formDefinitionAtom } from '@/entities/form'
import { FieldEditor, selectedItemIdAtom } from '@/features/field-editor'

import { BuilderAddPlaceholder } from './builder-add-field'
import { BuilderContainer } from './builder-container'
import { BuilderItem } from './builder-item'
import { BuilderSection } from './builder-section'

export const FormBuilder: FC = () => {
    const [definition, setDefinition] = useAtom(formDefinitionAtom)
    const [selectedItemId] = useAtom(selectedItemIdAtom)

    if (!definition) return null

    return (
        <div className="flex h-full flex-col overflow-hidden bg-white">
            <div className="flex items-center justify-between border-b border-gray-200 bg-white px-3 py-2">
                <span className="text-xs font-medium text-gray-500 uppercase">Builder</span>
            </div>
            <div className="flex-1 overflow-y-auto p-4">
                <FormBuilderComponent
                    definition={definition}
                    container={BuilderContainer}
                    field={BuilderItem}
                    section={BuilderSection}
                    addPlaceholder={BuilderAddPlaceholder}
                    selectedId={selectedItemId}
                    onDefinitionChange={setDefinition}
                />
            </div>
            <FieldEditor />
        </div>
    )
}
