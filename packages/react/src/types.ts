import type { ComponentType, ReactNode } from 'react'

import type {
    ArrayItemDef,
    DocumentValidationError,
    FieldContentItem,
    FieldValidationError,
    FileValue,
    FormDefinition,
    FormDocument,
    FormValidationResult,
    SectionContentItem,
    SelectOption,
} from '@bluprynt/forms-core'

import type { ROOT } from './constants'

// ── Base field props ──

export type BaseViewFieldProps = {
    field: FieldContentItem
    errors: FieldValidationError[]
}

export type BaseEditFieldProps = BaseViewFieldProps & {
    onChange: (value: unknown) => void
}

// ── Viewer field props ──

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
    children: ReactNode
}

export type FileViewProps = BaseViewFieldProps & {
    value: FileValue | undefined
}

export type SectionViewProps = {
    section: SectionContentItem
    children: ReactNode
}

export type ErrorProps = {
    errors: FieldValidationError[]
    field: FieldContentItem
}

// ── Editor field props ──

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
    children: ReactNode
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

// ── Component maps ──

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

// ── Top-level component props ──

export type FormViewerProps = {
    definition: FormDefinition
    data: FormDocument
    components: ViewerComponentMap
    section?: ROOT | number
    includeSectionHeader?: boolean
    showValidation?: boolean
    onDocumentError?: (errors: DocumentValidationError[]) => void
}

export type FormEditorProps = {
    definition: FormDefinition
    data: FormDocument
    components: EditorComponentMap
    onChange: (data: FormDocument, validation: FormValidationResult) => void
    section?: ROOT | number
    includeSectionHeader?: boolean
    showValidation?: boolean
    onDocumentError?: (errors: DocumentValidationError[]) => void
}
