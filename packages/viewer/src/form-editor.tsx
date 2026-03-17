import { type FC, useCallback, useRef } from 'react'

import { FieldContentItem, FormDocument, FormEngine, FormValidationResult } from '@bluprynt/forms-core'

import { FormContent } from './form'
import { useFormContext } from './form-context'
import type { EditorArrayItemProps, EditorComponentMap, EditorFieldProps } from './types'

type FormEditorProps = {
    components: EditorComponentMap
    onChange: (data: FormDocument, validation: FormValidationResult) => void
}

export const FormEditor: FC<FormEditorProps> = ({ components, onChange }) => {
    const { definition, data, visibilityMap, fieldErrors, section, engine, showInlineValidation, documentErrors } =
        useFormContext()

    const { renderFieldProps, renderArrayItemProps } = useEditorHandlers(engine, data, onChange)

    if (!definition || !data || (documentErrors && documentErrors.length > 0)) return null

    return (
        <FormContent
            mode="editor"
            items={definition.content}
            visibilityMap={visibilityMap}
            values={data.values}
            fieldErrors={fieldErrors}
            components={components}
            section={section}
            showInlineValidation={showInlineValidation}
            renderFieldProps={renderFieldProps}
            renderArrayItemProps={renderArrayItemProps}
        />
    )
}

export const useEditorHandlers = (
    engine: FormEngine | undefined,
    data: FormDocument | undefined,
    onChange: (data: FormDocument, validation: FormValidationResult) => void,
): {
    renderFieldProps: (field: FieldContentItem) => EditorFieldProps
    renderArrayItemProps: (field: FieldContentItem, index: number) => EditorArrayItemProps
} => {
    // Latest ref pattern
    const stateRef = useRef({ data, onChange, engine })
    stateRef.current = { data, onChange, engine }

    // Per-field onChange handler

    const fieldOnChangeMap = useRef(new Map<string, (value: unknown) => void>())
    const getFieldOnChange = useCallback((fieldId: number): ((value: unknown) => void) => {
        const key = String(fieldId)

        let handler = fieldOnChangeMap.current.get(key)
        if (!handler) {
            handler = (newValue: unknown) => {
                const { data, onChange, engine } = stateRef.current
                if (!data || !engine) return

                const document: FormDocument = { ...data, values: { ...data.values, [key]: newValue } }

                onChange(document, engine.validate(document))
            }
            fieldOnChangeMap.current.set(key, handler)
        }
        return handler
    }, [])

    // Array mutation handlers

    const arrayHandlersMap = useRef(
        new Map<
            string,
            {
                onAddItem: () => void
                onRemoveItem: (index: number) => void
                onMoveItem: (fromIndex: number, toIndex: number) => void
            }
        >(),
    )
    const getArrayHandlers = useCallback((fieldId: number) => {
        const key = String(fieldId)

        let handlers = arrayHandlersMap.current.get(key)
        if (!handlers) {
            const fire = (mutate: (arr: unknown[]) => unknown[]) => {
                const { data, onChange, engine } = stateRef.current
                if (!data || !engine) return

                const items = (data.values[key] as unknown[] | undefined) ?? []
                const document: FormDocument = { ...data, values: { ...data.values, [key]: mutate([...items]) } }

                onChange(document, engine.validate(document))
            }

            handlers = {
                onAddItem: () =>
                    fire((values) => {
                        values.push(undefined)
                        return values
                    }),
                onRemoveItem: (index: number) =>
                    fire((values) => {
                        values.splice(index, 1)
                        return values
                    }),
                onMoveItem: (fromIndex: number, toIndex: number) =>
                    fire((values) => {
                        const [moved] = values.splice(fromIndex, 1)
                        values.splice(toIndex, 0, moved)
                        return values
                    }),
            }
            arrayHandlersMap.current.set(key, handlers)
        }
        return handlers
    }, [])

    // Array item onChange handler

    const arrayItemOnChangeMap = useRef(new Map<string, (value: unknown) => void>())
    const getArrayItemOnChange = useCallback((fieldId: number, index: number): ((value: unknown) => void) => {
        const mapKey = `${fieldId}-${index}`

        let handler = arrayItemOnChangeMap.current.get(mapKey)
        if (!handler) {
            handler = (newValue: unknown) => {
                const fieldKey = String(fieldId)

                const { data, onChange, engine } = stateRef.current
                if (!data || !engine) return

                const items = [...((data.values[fieldKey] as unknown[] | undefined) ?? [])]
                items[index] = newValue

                const document: FormDocument = { ...data, values: { ...data.values, [fieldKey]: items } }
                onChange(document, engine.validate(document))
            }
            arrayItemOnChangeMap.current.set(mapKey, handler)
        }
        return handler
    }, [])

    return {
        renderFieldProps: (field: FieldContentItem): EditorFieldProps => {
            if (field.type === 'array') {
                return {
                    onChange: getFieldOnChange(field.id),
                    ...getArrayHandlers(field.id),
                }
            }
            return { onChange: getFieldOnChange(field.id) }
        },
        renderArrayItemProps: (field: FieldContentItem, index: number): EditorArrayItemProps => ({
            onChange: getArrayItemOnChange(field.id, index),
        }),
    } as const
}
