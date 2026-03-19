import { type FC, useCallback, useMemo } from 'react'

import type { ContentItem, FieldContentItem, FormDefinition, SectionContentItem } from '@bluprynt/forms-core'
import { FormDefinitionEditor } from '@bluprynt/forms-core'
import { useFormik } from 'formik'
import { useAtom, useAtomValue } from 'jotai'

import { formDefinitionAtom } from '@/entities/form'
import { editorModeAtom, selectedItemIdAtom } from '@/features/field-editor'
import { Button } from '@/shared/ui/button'
import { Sheet, SheetContent, SheetFooter, SheetHeader, SheetTitle } from '@/shared/ui/sheet'

import type { EditorFormValues } from '../model/editor-form'
import { FieldForm } from './field-form'
import { SectionForm } from './section-form'

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

const findParentAndIndex = (
    content: ContentItem[],
    id: number,
): { parentId: number | undefined; index: number } | undefined => {
    for (let i = 0; i < content.length; i++) {
        if (content[i]?.id === id) return { parentId: undefined, index: i }
        const item = content[i]
        if (item?.type === 'section') {
            const section = item as SectionContentItem
            for (let j = 0; j < section.content.length; j++) {
                if (section.content[j]?.id === id) return { parentId: section.id, index: j }
            }
            const nested = findParentAndIndex(section.content, id)
            if (nested) return nested
        }
    }
    return undefined
}

const buildInitialValues = (item: ContentItem): EditorFormValues => {
    if (item.type === 'section') {
        const section = item as SectionContentItem
        return {
            kind: 'section',
            type: 'string',
            label: '',
            options: [],
            item: undefined,
            validation: undefined,
            title: section.title,
            description: section.description ?? '',
            conditionText: section.condition ? JSON.stringify(section.condition, null, 2) : '',
        }
    }
    const field = item as FieldContentItem
    return {
        kind: 'field',
        type: field.type,
        label: field.label,
        options: field.options ?? [],
        item: field.item,
        validation: field.validation,
        title: '',
        description: field.description ?? '',
        conditionText: field.condition ? JSON.stringify(field.condition, null, 2) : '',
    }
}

const validate = (values: EditorFormValues): Partial<Record<keyof EditorFormValues, string>> => {
    const errors: Partial<Record<keyof EditorFormValues, string>> = {}
    if (values.kind === 'field' && !values.label.trim()) errors.label = 'Required'
    if (values.kind === 'section' && !values.title.trim()) errors.title = 'Required'
    if (values.conditionText.trim()) {
        try {
            JSON.parse(values.conditionText)
        } catch {
            errors.conditionText = 'Invalid JSON'
        }
    }
    return errors
}

const EditorBody: FC<{
    definition: FormDefinition
    selectedItemId: number
    mode: 'add' | 'edit'
    onSubmit: (draft: FormDefinition) => void
    onCancel: () => void
}> = ({ definition, selectedItemId, mode, onSubmit, onCancel }) => {
    const item = useMemo(() => findItemById(definition.content, selectedItemId), [definition.content, selectedItemId])
    const isSection = item?.type === 'section'

    const initialValues = useMemo(() => (item ? buildInitialValues(item) : undefined), [item])

    const formik = useFormik<EditorFormValues>({
        initialValues: initialValues ?? buildInitialValues({ id: 0, type: 'string', label: '' } as FieldContentItem),
        enableReinitialize: true,
        validate,
        onSubmit: (values) => {
            if (!item) return
            const editor = new FormDefinitionEditor(definition)

            if (values.kind === 'section') {
                editor.updateSection(item.id, { title: values.title })
                editor.setFieldDescription(item.id, values.description || undefined)
            } else {
                const field = item as FieldContentItem
                if (values.type !== field.type) {
                    const location = findParentAndIndex(definition.content, item.id)
                    if (!location) return
                    editor.removeItem(item.id)
                    editor.addField(
                        {
                            id: item.id,
                            type: values.type,
                            label: values.label,
                            description: values.description || undefined,
                        },
                        location.parentId,
                        location.index,
                    )
                } else {
                    editor.setLabel(item.id, values.label)
                    editor.setFieldDescription(item.id, values.description || undefined)
                }

                if (values.type === 'select') {
                    editor.setOptions(item.id, values.options)
                }
                if (values.type === 'array' && values.item) {
                    editor.setArrayItem(item.id, values.item)
                }

                editor.setValidation(item.id, values.validation)
            }

            const conditionText = values.conditionText.trim()
            if (conditionText) {
                editor.setCondition(item.id, JSON.parse(conditionText))
            } else {
                editor.setCondition(item.id, undefined)
            }

            onSubmit(editor.toJSON())
        },
    })

    if (!item) return null

    return (
        <>
            <SheetHeader>
                <SheetTitle>
                    {mode === 'add' ? 'Add' : 'Edit'} {isSection ? 'Section' : 'Field'}
                </SheetTitle>
            </SheetHeader>
            <div className="flex-1 overflow-y-auto">
                {isSection ? (
                    <SectionForm formik={formik} itemId={selectedItemId} definition={definition} />
                ) : (
                    <FieldForm formik={formik} definition={definition} itemId={selectedItemId} />
                )}
            </div>
            <SheetFooter className="mt-4 flex gap-2">
                <Button variant="outline" size="sm" onClick={onCancel}>
                    Cancel
                </Button>
                <Button size="sm" onClick={formik.submitForm} disabled={!formik.isValid}>
                    Save
                </Button>
            </SheetFooter>
        </>
    )
}

export const FieldEditor: FC = () => {
    const [selectedItemId, setSelectedItemId] = useAtom(selectedItemIdAtom)
    const editorMode = useAtomValue(editorModeAtom)
    const [definition, setDefinition] = useAtom(formDefinitionAtom)

    const handleCancel = useCallback(() => {
        if (editorMode === 'add' && selectedItemId != null && definition) {
            const editor = new FormDefinitionEditor(definition)
            editor.removeItem(selectedItemId)
            setDefinition(editor.toJSON())
        }
        setSelectedItemId(null)
    }, [editorMode, selectedItemId, definition, setDefinition, setSelectedItemId])

    const handleSubmit = useCallback(
        (draft: FormDefinition) => {
            setDefinition(draft)
            setSelectedItemId(null)
        },
        [setDefinition, setSelectedItemId],
    )

    return (
        <Sheet open={selectedItemId != null} onOpenChange={(open) => !open && handleCancel()}>
            <SheetContent className="flex flex-col">
                {definition && selectedItemId != null && (
                    <EditorBody
                        key={selectedItemId}
                        definition={definition}
                        selectedItemId={selectedItemId}
                        mode={editorMode}
                        onSubmit={handleSubmit}
                        onCancel={handleCancel}
                    />
                )}
            </SheetContent>
        </Sheet>
    )
}
