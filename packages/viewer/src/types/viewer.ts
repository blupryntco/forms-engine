import type { ComponentType, ReactNode } from 'react'

import type { ArrayItemDef, FileValue, SectionContentItem, SelectOption } from '@bluprynt/forms-core'

import type { BaseViewFieldProps, ErrorProps } from './base'

export type StringViewProps = BaseViewFieldProps & {
    value: string | undefined
}

export type NumberViewProps = BaseViewFieldProps & {
    value: number | undefined
}

export type BooleanViewProps = BaseViewFieldProps & {
    value: boolean | undefined
}

export type DateViewProps = BaseViewFieldProps & {
    value: string | undefined
}

export type SelectViewProps = BaseViewFieldProps & {
    value: string | number | undefined
    options: SelectOption[]
}

export type ArrayViewProps = BaseViewFieldProps & {
    value: unknown[] | undefined
    itemDef: ArrayItemDef
    children: ReactNode[]
}

export type FileViewProps = BaseViewFieldProps & {
    value: FileValue | undefined
}

export type SectionViewProps = {
    section: SectionContentItem
    children: ReactNode
}

export type ViewerComponentMap = {
    string: ComponentType<StringViewProps>
    number: ComponentType<NumberViewProps>
    boolean: ComponentType<BooleanViewProps>
    date: ComponentType<DateViewProps>
    select: ComponentType<SelectViewProps>
    array: ComponentType<ArrayViewProps>
    file: ComponentType<FileViewProps>
    section: ComponentType<SectionViewProps>
    error?: ComponentType<ErrorProps>
}
