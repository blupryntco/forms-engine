'use client'

import { type FC, type PropsWithChildren, useCallback, useState } from 'react'

import {
    EditorComponentMap,
    Form,
    FormEditor as FormEditorComponent,
    FormSectionItemProps,
    FormSections,
    ROOT,
} from '@bluprynt/forms-viewer'
import { useAtom, useAtomValue } from 'jotai'

import { formDefinitionAtom, formDocumentAtom } from '@/entities/form'
import {
    ArrayEdit,
    BooleanEdit,
    DateEdit,
    ErrorView,
    FileEdit,
    NumberEdit,
    SectionEdit,
    SelectEdit,
    StringEdit,
} from '@/shared/ui/form'

export const components: EditorComponentMap = {
    string: StringEdit,
    number: NumberEdit,
    boolean: BooleanEdit,
    date: DateEdit,
    select: SelectEdit,
    array: ArrayEdit,
    file: FileEdit,
    section: SectionEdit,
    error: ErrorView,
}

const SectionTabsContainer: FC<PropsWithChildren> = ({ children }) => (
    <div className="flex gap-0 overflow-x-auto border-b border-gray-200 bg-gray-50 px-2">{children}</div>
)

const SectionTabItem: FC<FormSectionItemProps> = ({ section, active, select }) => (
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

export const FormEditor: FC = () => {
    const definition = useAtomValue(formDefinitionAtom)
    const [formDoc, setFormDoc] = useAtom(formDocumentAtom)

    const [sectionSteps, setSectionSteps] = useState(false)
    const [activeSection, setActiveSection] = useState<typeof ROOT | number | undefined>(undefined)

    const handleSectionSelect = useCallback((id: typeof ROOT | number) => {
        setActiveSection(id)
    }, [])

    const handleToggleSections = useCallback((checked: boolean) => {
        setSectionSteps(checked)
        setActiveSection(checked ? ROOT : undefined)
    }, [])

    return (
        <div className="flex flex-col overflow-hidden bg-white">
            <div className="flex items-center justify-between border-b border-gray-200 bg-white px-3 py-2">
                <span className="text-xs font-medium text-gray-500 uppercase">Editor</span>
                <div className="flex items-center gap-3">
                    <label className="flex items-center gap-1.5 text-xs text-gray-500">
                        <input
                            type="checkbox"
                            checked={sectionSteps}
                            onChange={(e) => handleToggleSections(e.target.checked)}
                            className="h-3.5 w-3.5 rounded border-gray-300 text-blue-600"
                        />
                        Group sections
                    </label>
                </div>
            </div>
            <div className="flex-1 overflow-y-auto p-4">
                <Form definition={definition} data={formDoc} section={activeSection}>
                    {sectionSteps && (
                        <FormSections
                            container={SectionTabsContainer}
                            item={SectionTabItem}
                            onSelect={handleSectionSelect}
                        />
                    )}
                    <FormEditorComponent components={components} onChange={setFormDoc} />
                </Form>
            </div>
        </div>
    )
}
