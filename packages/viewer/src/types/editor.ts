import type { ComponentType, ReactNode } from 'react'

import type { ArrayItemDef, FileValue, SectionContentItem, SelectOption } from '@bluprynt/forms-core'

import type { BaseEditFieldProps, ErrorProps } from './base'

export type StringEditProps = BaseEditFieldProps & {
    value: string | undefined
    onChange: (value: string | undefined) => void
}

export type NumberEditProps = BaseEditFieldProps & {
    value: number | undefined
    onChange: (value: number | undefined) => void
}

export type BooleanEditProps = BaseEditFieldProps & {
    value: boolean | undefined
    onChange: (value: boolean | undefined) => void
}

export type DateEditProps = BaseEditFieldProps & {
    value: string | undefined
    onChange: (value: string | undefined) => void
}

export type SelectEditProps = BaseEditFieldProps & {
    value: string | number | undefined
    options: SelectOption[]
    onChange: (value: string | number | undefined) => void
}

export type ArrayEditProps = BaseEditFieldProps & {
    value: unknown[] | undefined
    itemDef: ArrayItemDef
    children: ReactNode[]
    onAddItem: () => void
    onRemoveItem: (index: number) => void
    onMoveItem: (fromIndex: number, toIndex: number) => void
}

export type FileEditProps = BaseEditFieldProps & {
    value: FileValue | undefined
    onChange: (value: FileValue | undefined) => void
}

export type SectionEditProps = {
    section: SectionContentItem
    children: ReactNode
}

export type EditorComponentMap = {
    string: ComponentType<StringEditProps>
    number: ComponentType<NumberEditProps>
    boolean: ComponentType<BooleanEditProps>
    date: ComponentType<DateEditProps>
    select: ComponentType<SelectEditProps>
    array: ComponentType<ArrayEditProps>
    file: ComponentType<FileEditProps>
    section: ComponentType<SectionEditProps>
    error?: ComponentType<ErrorProps>
}

export type EditorFieldProps = {
    onChange: (value: unknown) => void
    onAddItem?: () => void
    onRemoveItem?: (index: number) => void
    onMoveItem?: (fromIndex: number, toIndex: number) => void
}

export type EditorArrayItemProps = {
    onChange: (value: unknown) => void
}
