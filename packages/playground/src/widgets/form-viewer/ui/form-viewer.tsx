'use client'

import type { FC } from 'react'
import { useCallback, useState } from 'react'

import {
    Form,
    FormDocumentValidation,
    FormFieldsValidation,
    FormSections,
    FormViewer as FormViewerComponent,
    ROOT,
    ViewerComponentMap,
} from '@bluprynt/forms-viewer'
import { useAtomValue } from 'jotai'

import { formDefinitionAtom, formDocumentAtom } from '@/entities/form'
import {
    ArrayView,
    BooleanView,
    DateView,
    DocumentErrorItem,
    DocumentErrorsContainer,
    ErrorView,
    FieldErrorGroup,
    FieldErrorItem,
    FieldErrorsContainer,
    FileView,
    NumberView,
    SectionTabItem,
    SectionTabsContainer,
    SectionView,
    SelectView,
    StringView,
} from '@/shared/ui/form'

export const components: ViewerComponentMap = {
    string: StringView,
    number: NumberView,
    boolean: BooleanView,
    date: DateView,
    select: SelectView,
    array: ArrayView,
    file: FileView,
    section: SectionView,
    error: ErrorView,
}

export const FormViewer: FC = () => {
    const definition = useAtomValue(formDefinitionAtom)
    const formDoc = useAtomValue(formDocumentAtom)

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
                <span className="text-xs font-medium text-gray-500 uppercase">Viewer</span>
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
                    <FormDocumentValidation container={DocumentErrorsContainer} error={DocumentErrorItem} />
                    <FormFieldsValidation
                        container={FieldErrorsContainer}
                        field={FieldErrorGroup}
                        error={FieldErrorItem}
                    />
                    <FormViewerComponent components={components} />
                </Form>
            </div>
        </div>
    )
}
