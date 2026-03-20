import { type FC, Fragment } from 'react'

import type {
    ArrayItemDef,
    ContentItem,
    FieldContentItem,
    FieldValidationError,
    FormValues,
} from '@bluprynt/forms-core'

import type { EditorArrayItemProps, EditorComponentMap, EditorFieldProps, ViewerComponentMap } from '../types'
import { getArrayField, getFieldErrors } from './utils'

type FormItemsProps = {
    items: ContentItem[]
    visibilityMap: Map<number, boolean>
    values: FormValues
    fieldErrors: Map<number, FieldValidationError[]>
    components: ViewerComponentMap | EditorComponentMap
    showInlineValidation: boolean
    renderFieldProps?: (field: FieldContentItem) => EditorFieldProps
    renderArrayItemProps?: (arrayField: FieldContentItem, index: number) => EditorArrayItemProps
}

export const FormItems: FC<FormItemsProps> = ({
    items,
    visibilityMap,
    values,
    fieldErrors,
    components,
    showInlineValidation,
    renderFieldProps,
    renderArrayItemProps,
}) => {
    const SectionComponent = components.section
    const ErrorComponent = showInlineValidation ? components.error : undefined

    const elements: React.ReactNode[] = []

    for (const item of items) {
        if (!visibilityMap.get(item.id)) continue

        if (item.type === 'section') {
            elements.push(
                <SectionComponent key={item.id} section={item}>
                    <FormItems
                        items={item.content}
                        visibilityMap={visibilityMap}
                        values={values}
                        fieldErrors={fieldErrors}
                        components={components}
                        showInlineValidation={showInlineValidation}
                        renderFieldProps={renderFieldProps}
                        renderArrayItemProps={renderArrayItemProps}
                    />
                </SectionComponent>,
            )
        } else if (item.type === 'array') {
            const errors = getFieldErrors(fieldErrors, item.id)
            const modeProps = renderFieldProps?.(item) ?? {}

            const ArrayComponent = components.array as React.ComponentType<Record<string, unknown>>
            const arrayValue = (values[String(item.id)] as unknown[] | undefined) ?? []
            const itemDef = item.item as ArrayItemDef
            const ItemComponent = components[
                itemDef.type as keyof Omit<ViewerComponentMap, 'array' | 'section' | 'error'>
            ] as React.ComponentType<Record<string, unknown>> | undefined

            elements.push(
                <ArrayComponent
                    key={item.id}
                    field={item}
                    value={values[String(item.id)]}
                    itemDef={item.item}
                    errors={errors}
                    {...modeProps}>
                    {ItemComponent
                        ? arrayValue.map((itemValue, index) => {
                              const itemErrors = getFieldErrors(fieldErrors, item.id, index)
                              const synthetic = getArrayField(item, index)
                              const itemModeProps = renderArrayItemProps?.(item, index) ?? {}

                              const baseProps: Record<string, unknown> = {
                                  field: synthetic,
                                  value: itemValue,
                                  errors: itemErrors,
                                  ...itemModeProps,
                              }

                              if (itemDef.type === 'select') {
                                  baseProps.options = itemDef.options ?? []
                              }

                              return (
                                  // biome-ignore lint/suspicious/noArrayIndexKey: index is unique in array
                                  <Fragment key={`${item.id}-${index}`}>
                                      <ItemComponent {...baseProps} />
                                      {ErrorComponent && itemErrors.length > 0 && (
                                          <ErrorComponent errors={itemErrors} field={synthetic} />
                                      )}
                                  </Fragment>
                              )
                          })
                        : null}
                </ArrayComponent>,
            )

            if (ErrorComponent && errors.length > 0) {
                elements.push(<ErrorComponent key={`${item.id}-error`} errors={errors} field={item} />)
            }
        } else {
            const errors = getFieldErrors(fieldErrors, item.id)
            const modeProps = renderFieldProps?.(item) ?? {}

            const fieldProps: Record<string, unknown> = {
                field: item,
                value: values[String(item.id)],
                errors,
                ...modeProps,
            }

            if (item.type === 'select') fieldProps.options = (item as FieldContentItem).options ?? []

            const fieldType = item.type as keyof Omit<ViewerComponentMap, 'array' | 'section' | 'error'>
            const FieldComponent = components[fieldType] as React.ComponentType<Record<string, unknown>>

            elements.push(<FieldComponent key={item.id} {...fieldProps} />)

            if (ErrorComponent && errors.length > 0)
                elements.push(<ErrorComponent key={`${item.id}-error`} errors={errors} field={item} />)
        }
    }

    if (elements.length === 0) return null

    return elements
}
