'use client'

import type { FC } from 'react'
import { useCallback, useState } from 'react'

import { useSetAtom } from 'jotai'

import { formDefinitionAtom, formDocumentAtom } from '@/entities/form'
import { SAMPLE_FORMS } from '@/shared/data'

export const FormSelector: FC = () => {
    const [selectedIndex, setSelectedIndex] = useState(0)

    const setFormDefinition = useSetAtom(formDefinitionAtom)
    const setFormDocument = useSetAtom(formDocumentAtom)

    const handleFormChange = useCallback(
        (index: number) => {
            setSelectedIndex(index)

            const form = SAMPLE_FORMS[index]
            setFormDefinition(form?.definition)
            setFormDocument(form?.values)
        },
        [setFormDefinition, setFormDocument],
    )

    return (
        <select
            value={selectedIndex}
            onChange={(e) => handleFormChange(Number(e.target.value))}
            className="rounded border border-gray-300 px-2 py-1 text-sm text-gray-700 outline-none focus:border-blue-500">
            {SAMPLE_FORMS.map((sample, i) => (
                <option key={sample.definition.id} value={i}>
                    {sample.label}
                </option>
            ))}
        </select>
    )
}
