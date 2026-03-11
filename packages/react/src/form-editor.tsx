import { type FC, Fragment, useCallback, useRef } from 'react'

import type { FieldContentItem, FormDocument, FormValidationResult, FormValues } from '@bluprynt/forms-core'

import { renderContent } from './render-content'
import type { FormEditorProps } from './types'
import { useFormEngine } from './use-form-engine'

export const FormEditor: FC<FormEditorProps> = ({
    definition,
    data,
    components,
    onChange,
    section,
    includeSectionHeader = true,
    showValidation = false,
}) => {
    const engine = useFormEngine(definition)
    const visibilityMap = engine.getVisibilityMap(data)
    const validation = engine.validate(data)

    // Stable ref so memoized callbacks always read fresh state
    const stateRef = useRef({ data, onChange, engine })
    stateRef.current = { data, onChange, engine }

    // ── Per-field onChange (stable identity per field id) ──

    const fieldOnChangeMap = useRef(new Map<string, (value: unknown) => void>())

    const getFieldOnChange = useCallback((fieldId: number): ((value: unknown) => void) => {
        const key = String(fieldId)
        let handler = fieldOnChangeMap.current.get(key)
        if (!handler) {
            handler = (newValue: unknown) => {
                const { data: cur, onChange: cb, engine: eng } = stateRef.current
                const newValues: FormValues = { ...cur.values, [key]: newValue }
                const newDoc: FormDocument = { ...cur, values: newValues }
                cb(newDoc, eng.validate(newDoc))
            }
            fieldOnChangeMap.current.set(key, handler)
        }
        return handler
    }, [])

    // ── Array mutation handlers (stable identity per array field id) ──

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
                const { data: cur, onChange: cb, engine: eng } = stateRef.current
                const arr = (cur.values[key] as unknown[] | undefined) ?? []
                const newValues: FormValues = { ...cur.values, [key]: mutate([...arr]) }
                const newDoc: FormDocument = { ...cur, values: newValues }
                cb(newDoc, eng.validate(newDoc))
            }

            handlers = {
                onAddItem: () =>
                    fire((arr) => {
                        arr.push(undefined)
                        return arr
                    }),
                onRemoveItem: (index: number) =>
                    fire((arr) => {
                        arr.splice(index, 1)
                        return arr
                    }),
                onMoveItem: (fromIndex: number, toIndex: number) =>
                    fire((arr) => {
                        const [moved] = arr.splice(fromIndex, 1)
                        arr.splice(toIndex, 0, moved)
                        return arr
                    }),
            }
            arrayHandlersMap.current.set(key, handlers)
        }
        return handlers
    }, [])

    // ── Array item onChange (stable identity per field+index) ──

    const arrayItemOnChangeMap = useRef(new Map<string, (value: unknown) => void>())

    const getArrayItemOnChange = useCallback((fieldId: number, index: number): ((value: unknown) => void) => {
        const mapKey = `${fieldId}-${index}`
        let handler = arrayItemOnChangeMap.current.get(mapKey)
        if (!handler) {
            handler = (newValue: unknown) => {
                const { data: cur, onChange: cb, engine: eng } = stateRef.current
                const fieldKey = String(fieldId)
                const arr = [...((cur.values[fieldKey] as unknown[] | undefined) ?? [])]
                arr[index] = newValue
                const newValues: FormValues = { ...cur.values, [fieldKey]: arr }
                const newDoc: FormDocument = { ...cur, values: newValues }
                cb(newDoc, eng.validate(newDoc))
            }
            arrayItemOnChangeMap.current.set(mapKey, handler)
        }
        return handler
    }, [])

    // ── Render ──

    const errors = showValidation ? validation.errors : []

    return (
        <Fragment>
            {renderContent({
                items: definition.content,
                visibilityMap,
                values: data.values,
                errors,
                components,
                sectionFilter: section,
                includeSectionHeader,
                renderFieldProps: (field: FieldContentItem) => {
                    if (field.type === 'array') {
                        return {
                            onChange: getFieldOnChange(field.id),
                            ...getArrayHandlers(field.id),
                        }
                    }
                    return { onChange: getFieldOnChange(field.id) }
                },
                renderArrayItemProps: (_arrayField: FieldContentItem, index: number) => ({
                    onChange: getArrayItemOnChange(_arrayField.id, index),
                }),
            })}
        </Fragment>
    )
}
