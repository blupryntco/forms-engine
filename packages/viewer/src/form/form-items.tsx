import { type FC, Fragment } from 'react'

import type {
    AnyFieldContentItem,
    ArrayItemDef,
    ArrayObjRow,
    ContentItem,
    FieldContentItem,
    FieldValidationError,
    FormSuggestions,
    FormValues,
} from '@bluprynt/forms-core'

import type {
    EditorArrayItemProps,
    EditorArrayObjItemProps,
    EditorComponentMap,
    EditorFieldProps,
    ViewerComponentMap,
} from '../types'
import { getArrayField, getArrayObjField, getArrayObjItemErrors, getArrayObjRowErrors, getFieldErrors } from './utils'

type AnyComponent = React.ComponentType<Record<string, unknown>> | undefined

type FormItemsProps = {
    items: ContentItem[]
    visibilityMap: Map<number, boolean>
    values: FormValues
    suggestions?: FormSuggestions
    fieldErrors: Map<number, FieldValidationError[]>
    components: ViewerComponentMap | EditorComponentMap
    showInlineValidation: boolean
    renderFieldProps?: (field: FieldContentItem) => EditorFieldProps
    renderArrayItemProps?: (arrayField: FieldContentItem, index: number) => EditorArrayItemProps
    renderArrayObjItemProps?: (
        arrayField: FieldContentItem,
        index: number,
        subFieldId: number,
    ) => EditorArrayObjItemProps
}

/** Looks up the component for a value field type. Optional map keys may be absent. */
const componentFor = (components: ViewerComponentMap | EditorComponentMap, type: string): AnyComponent =>
    components[type as keyof Omit<ViewerComponentMap, 'array' | 'section' | 'error'>] as AnyComponent

/** `select` and `multiselect` components are the only ones that receive injected options. */
const withOptions = (props: Record<string, unknown>, def: { type: string; options?: unknown }): void => {
    if (def.type === 'select' || def.type === 'multiselect') props.options = def.options ?? []
}

export const FormItems: FC<FormItemsProps> = ({
    items,
    visibilityMap,
    values,
    suggestions,
    fieldErrors,
    components,
    showInlineValidation,
    renderFieldProps,
    renderArrayItemProps,
    renderArrayObjItemProps,
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
                        suggestions={suggestions}
                        fieldErrors={fieldErrors}
                        components={components}
                        showInlineValidation={showInlineValidation}
                        renderFieldProps={renderFieldProps}
                        renderArrayItemProps={renderArrayItemProps}
                        renderArrayObjItemProps={renderArrayObjItemProps}
                    />
                </SectionComponent>,
            )
        } else if (item.type === 'array') {
            const errors = getFieldErrors(fieldErrors, item.id)
            const modeProps = renderFieldProps?.(item) ?? {}

            const ArrayComponent = components.array as React.ComponentType<Record<string, unknown>>
            const arrayValue = (values[String(item.id)] as unknown[] | undefined) ?? []
            const itemDef = item.item as ArrayItemDef
            const ItemComponent = componentFor(components, itemDef.type)

            const arrayProps: Record<string, unknown> = {
                field: item,
                value: values[String(item.id)],
                itemDef: item.item,
                errors,
                ...modeProps,
            }

            const arraySuggestion = suggestions?.[String(item.id)]
            if (arraySuggestion) arrayProps.suggestion = arraySuggestion

            elements.push(
                <ArrayComponent key={item.id} {...arrayProps}>
                    {ItemComponent
                        ? arrayValue.map((itemValue, index) => {
                              const synthetic = getArrayField(item, index)

                              // A static item holds no value: it gets the field and nothing else.
                              if (synthetic.type === 'static') {
                                  return (
                                      // biome-ignore lint/suspicious/noArrayIndexKey: index is unique in array
                                      <Fragment key={`${item.id}-${index}`}>
                                          <ItemComponent field={synthetic} />
                                      </Fragment>
                                  )
                              }

                              const itemErrors = getFieldErrors(fieldErrors, item.id, index)
                              const itemModeProps = renderArrayItemProps?.(item, index) ?? {}

                              const baseProps: Record<string, unknown> = {
                                  field: synthetic,
                                  value: itemValue,
                                  errors: itemErrors,
                                  ...itemModeProps,
                              }

                              withOptions(baseProps, itemDef)

                              return (
                                  // biome-ignore lint/suspicious/noArrayIndexKey: index is unique in array
                                  <Fragment key={`${item.id}-${index}`}>
                                      <ItemComponent {...baseProps} />
                                      {ErrorComponent && itemErrors.length > 0 && (
                                          <ErrorComponent errors={itemErrors} field={synthetic as FieldContentItem} />
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
        } else if (item.type === 'array_obj') {
            // Optional map key, like the other late additions: render nothing rather than crash.
            const ArrayObjComponent = components.array_obj as AnyComponent
            if (!ArrayObjComponent) continue

            const itemsDef = item.items ?? []
            const rows = (values[String(item.id)] as ArrayObjRow[] | undefined) ?? []

            // Row-level errors (a row that is not an object) have no cell to land
            // on, so they join the field-level ones.
            const errors = [
                ...getFieldErrors(fieldErrors, item.id),
                ...rows.flatMap((_row, index) => getArrayObjRowErrors(fieldErrors, item.id, index)),
            ]
            const modeProps = renderFieldProps?.(item) ?? {}

            const arrayProps: Record<string, unknown> = {
                field: item,
                value: values[String(item.id)],
                itemsDef,
                // Resolved here so every component does not repeat the default.
                kind: item.kind ?? 'list',
                errors,
                ...modeProps,
            }

            const arraySuggestion = suggestions?.[String(item.id)]
            if (arraySuggestion) arrayProps.suggestion = arraySuggestion

            // children[rowIndex][subFieldIndex], aligned with itemsDef so a
            // component can lay the rows out as a table.
            const children = rows.map((row, index) =>
                itemsDef.map((subField) => {
                    const key = `${item.id}-${index}-${subField.id}`
                    const SubComponent = componentFor(components, subField.type)
                    if (!SubComponent) return <Fragment key={key} />

                    const synthetic = getArrayObjField(subField)

                    if (subField.type === 'static') {
                        return (
                            <Fragment key={key}>
                                <SubComponent field={synthetic} />
                            </Fragment>
                        )
                    }

                    const cellErrors = getArrayObjItemErrors(fieldErrors, item.id, index, subField.id)
                    const cellModeProps = renderArrayObjItemProps?.(item, index, subField.id) ?? {}

                    const cellProps: Record<string, unknown> = {
                        field: synthetic,
                        value: row?.[String(subField.id)],
                        errors: cellErrors,
                        ...cellModeProps,
                    }

                    withOptions(cellProps, subField)

                    return (
                        <Fragment key={key}>
                            <SubComponent {...cellProps} />
                            {ErrorComponent && cellErrors.length > 0 && (
                                <ErrorComponent errors={cellErrors} field={synthetic as FieldContentItem} />
                            )}
                        </Fragment>
                    )
                }),
            )

            elements.push(
                <ArrayObjComponent key={item.id} {...arrayProps}>
                    {children}
                </ArrayObjComponent>,
            )

            if (ErrorComponent && errors.length > 0) {
                elements.push(<ErrorComponent key={`${item.id}-error`} errors={errors} field={item} />)
            }
        } else if (item.type === 'static') {
            // Static blocks hold no value: no errors, no suggestion, nothing to change.
            const StaticComponent = components.static as AnyComponent
            if (!StaticComponent) continue

            elements.push(<StaticComponent key={item.id} field={item} />)
        } else {
            const errors = getFieldErrors(fieldErrors, item.id)
            const modeProps = renderFieldProps?.(item) ?? {}

            const fieldProps: Record<string, unknown> = {
                field: item,
                value: values[String(item.id)],
                errors,
                ...modeProps,
            }

            const suggestion = suggestions?.[String(item.id)]
            if (suggestion) fieldProps.suggestion = suggestion

            withOptions(fieldProps, item as AnyFieldContentItem & { options?: unknown })

            const FieldComponent = componentFor(components, item.type)

            // Optional map keys (e.g. `multiselect`) may be absent; skip rather than crash.
            if (!FieldComponent) continue

            elements.push(<FieldComponent key={item.id} {...fieldProps} />)

            if (ErrorComponent && errors.length > 0)
                elements.push(<ErrorComponent key={`${item.id}-error`} errors={errors} field={item} />)
        }
    }

    if (elements.length === 0) return null

    return elements
}
