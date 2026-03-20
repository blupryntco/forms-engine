import { type FC, useMemo } from 'react'

import type { Condition, ContentItem, FormDefinition, SectionContentItem } from '@bluprynt/forms-core'

import type { EditorFormik } from '../model/editor-form'
import { ConditionalEditor, collectFields } from './conditional-editor'
import { Label, TextInput } from './primitives'

const findItemById = (content: ContentItem[], id: number): ContentItem | undefined => {
    for (const item of content) {
        if (item.id === id) return item
        if (item.type === 'section') {
            const found = findItemById(item.content, id)
            if (found) return found
        }
    }
    return undefined
}

export const SectionForm: FC<{
    formik: EditorFormik
    itemId: number
    definition: FormDefinition
}> = ({ formik, itemId, definition }) => {
    const current = (findItemById(definition.content, itemId) as SectionContentItem | undefined) ?? undefined
    const fields = useMemo(() => collectFields(definition.content), [definition.content])

    const condition = useMemo<Condition | undefined>(() => {
        const text = formik.values.conditionText.trim()
        if (!text) return undefined

        try {
            return JSON.parse(text) as Condition
        } catch {
            return undefined
        }
    }, [formik.values.conditionText])

    return (
        <div className="flex flex-col gap-4">
            <div>
                <Label>Title</Label>
                <div className="mt-1">
                    <TextInput
                        value={formik.values.title}
                        placeholder="Section title"
                        onChange={(v) => formik.setFieldValue('title', v)}
                    />
                </div>
            </div>

            <div>
                <Label>Description</Label>
                <div className="mt-1">
                    <TextInput
                        value={formik.values.description}
                        placeholder="Optional description"
                        onChange={(v) => formik.setFieldValue('description', v)}
                    />
                </div>
            </div>

            <div>
                <span className="text-xs font-medium text-gray-500 uppercase">Children</span>
                <p className="text-sm text-gray-900">{current?.content?.length ?? 0} items</p>
            </div>

            <div>
                <Label>Condition</Label>
                <div className="mt-1">
                    <ConditionalEditor
                        condition={condition}
                        fields={fields}
                        onChange={(c) => formik.setFieldValue('conditionText', c ? JSON.stringify(c, null, 2) : '')}
                    />
                </div>
            </div>
        </div>
    )
}
