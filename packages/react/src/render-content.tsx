import { createElement, type ReactNode } from 'react'

import type {
    ArrayItemDef,
    ContentItem,
    FieldContentItem,
    FieldType,
    FieldValidationError,
    FormValues,
    SectionContentItem,
} from '@bluprynt/forms-core'

import type { ROOT } from './constants'
import type { EditorComponentMap, ViewerComponentMap } from './types'

// ── Helper types ──

type RenderContentContext = {
    items: ContentItem[]
    visibilityMap: Map<number, boolean>
    values: FormValues
    errors: FieldValidationError[]
    components: ViewerComponentMap | EditorComponentMap
    sectionFilter?: typeof ROOT | number
    includeSectionHeader?: boolean
    renderFieldProps: (field: FieldContentItem) => Record<string, unknown>
    renderArrayItemProps: (arrayField: FieldContentItem, index: number) => Record<string, unknown>
}

// ── Helpers ──

export const filterErrorsForField = (
    errors: FieldValidationError[],
    fieldId: number,
    itemIndex?: number,
): FieldValidationError[] =>
    errors.filter(
        (e) => e.fieldId === fieldId && (itemIndex === undefined ? e.itemIndex == null : e.itemIndex === itemIndex),
    )

export const findSection = (items: ContentItem[], sectionId: number): SectionContentItem | undefined => {
    for (const item of items) {
        if (item.type === 'section') {
            if (item.id === sectionId) return item
            const found = findSection(item.content, sectionId)
            if (found) return found
        }
    }
    return undefined
}

export const syntheticFieldDef = (arrayField: FieldContentItem, index: number): FieldContentItem => {
    const itemDef = arrayField.item as ArrayItemDef
    return {
        id: arrayField.id,
        type: itemDef.type as FieldType,
        label: itemDef.label,
        description: itemDef.description,
        validation: itemDef.validation as FieldContentItem['validation'],
        options: itemDef.options,
    }
}

// ── Array item rendering ──

const renderArrayItems = (arrayField: FieldContentItem, ctx: RenderContentContext): ReactNode => {
    const arrayValue = (ctx.values[String(arrayField.id)] as unknown[] | undefined) ?? []
    const Component = ctx.components[
        (arrayField.item as ArrayItemDef).type as keyof Omit<ViewerComponentMap, 'array' | 'section' | 'error'>
    ] as React.ComponentType<Record<string, unknown>>

    if (!Component) return null

    return arrayValue.map((itemValue, index) => {
        const itemErrors = filterErrorsForField(ctx.errors, arrayField.id, index)
        const synthetic = syntheticFieldDef(arrayField, index)
        const modeProps = ctx.renderArrayItemProps(arrayField, index)

        const baseProps: Record<string, unknown> = {
            field: synthetic,
            value: itemValue,
            errors: itemErrors,
            ...modeProps,
        }

        if ((arrayField.item as ArrayItemDef).type === 'select') {
            baseProps.options = (arrayField.item as ArrayItemDef).options ?? []
        }

        return createElement(Component, {
            key: `${arrayField.id}-${index}`,
            ...baseProps,
        })
    })
}

// ── Content item rendering (no filter) ──

const renderItems = (items: ContentItem[], ctx: RenderContentContext): ReactNode => {
    const elements: ReactNode[] = []

    for (const item of items) {
        if (!ctx.visibilityMap.get(item.id)) continue

        if (item.type === 'section') {
            const childContent = renderItems(item.content, ctx)
            elements.push(
                createElement(ctx.components.section as React.ComponentType<Record<string, unknown>>, {
                    key: item.id,
                    section: item,
                    children: childContent,
                }),
            )
        } else if (item.type === 'array') {
            const fieldErrors = filterErrorsForField(ctx.errors, item.id)
            const itemElements = renderArrayItems(item, ctx)
            const modeProps = ctx.renderFieldProps(item)

            elements.push(
                createElement(ctx.components.array as React.ComponentType<Record<string, unknown>>, {
                    key: item.id,
                    field: item,
                    value: ctx.values[String(item.id)],
                    itemDef: item.item,
                    errors: fieldErrors,
                    children: itemElements,
                    ...modeProps,
                }),
            )

            if (ctx.components.error && fieldErrors.length > 0) {
                elements.push(
                    createElement(ctx.components.error as React.ComponentType<Record<string, unknown>>, {
                        key: `${item.id}-error`,
                        errors: fieldErrors,
                        field: item,
                    }),
                )
            }
        } else {
            const fieldErrors = filterErrorsForField(ctx.errors, item.id)
            const modeProps = ctx.renderFieldProps(item)

            const fieldProps: Record<string, unknown> = {
                key: item.id,
                field: item,
                value: ctx.values[String(item.id)],
                errors: fieldErrors,
                ...modeProps,
            }

            if (item.type === 'select') {
                fieldProps.options = (item as FieldContentItem).options ?? []
            }

            elements.push(
                createElement(
                    ctx.components[
                        item.type as keyof Omit<ViewerComponentMap, 'array' | 'section' | 'error'>
                    ] as React.ComponentType<Record<string, unknown>>,
                    fieldProps,
                ),
            )

            if (ctx.components.error && fieldErrors.length > 0) {
                elements.push(
                    createElement(ctx.components.error as React.ComponentType<Record<string, unknown>>, {
                        key: `${item.id}-error`,
                        errors: fieldErrors,
                        field: item,
                    }),
                )
            }
        }
    }

    return elements.length === 0 ? null : elements
}

// ── Main export ──

export const renderContent = (ctx: RenderContentContext): ReactNode => {
    const { items, sectionFilter, includeSectionHeader = true } = ctx

    // No filter — render all
    if (sectionFilter === undefined) {
        return renderItems(items, ctx)
    }

    // ROOT — render only top-level non-section items
    if (typeof sectionFilter === 'symbol') {
        const nonSectionItems = items.filter((item) => item.type !== 'section')
        return renderItems(nonSectionItems, ctx)
    }

    // Numeric section id — find and render that section
    const section = findSection(items, sectionFilter)
    if (!section || !ctx.visibilityMap.get(section.id)) return null

    if (includeSectionHeader) {
        const childContent = renderItems(section.content, ctx)
        return createElement(ctx.components.section as React.ComponentType<Record<string, unknown>>, {
            key: section.id,
            section,
            children: childContent,
        })
    }

    return renderItems(section.content, ctx)
}

export type { RenderContentContext }
