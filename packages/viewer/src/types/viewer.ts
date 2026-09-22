import type { ComponentType, ReactNode } from 'react'

import type {
    ArrayItemDef,
    ArrayObjItemDef,
    ArrayObjKind,
    ArrayObjRow,
    FileValue,
    SectionContentItem,
    SelectOption,
    StaticFieldContentItem,
    SustainabilityValue,
} from '@bluprynt/forms-core'

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

export type MultiselectViewProps = BaseViewFieldProps & {
    value: (string | number)[] | undefined
    options: SelectOption[]
}

/**
 * Props for a `static` block. Static blocks hold no value, so they receive
 * neither `value`, `errors` nor `suggestion` -- only the field itself, whose
 * `text` is the content to render and whose `label` is an optional heading.
 */
export type StaticViewProps = {
    field: StaticFieldContentItem
}

export type ArrayViewProps = BaseViewFieldProps & {
    value: unknown[] | undefined
    itemDef: ArrayItemDef
    children: ReactNode[]
}

/**
 * Props for an `array_obj` field -- a list of rows, each holding one value per
 * sub-field in {@link itemsDef}.
 *
 * `children` is indexed **twice**: `children[rowIndex][subFieldIndex]`, with
 * the inner index matching `itemsDef`. That is what lets a component lay the
 * rows out as a table rather than as opaque blocks.
 *
 * @property kind - The field's layout hint, already resolved: `'list'` when the
 *   definition omits it, so a component never needs to apply the default itself.
 *   It is a hint, not a contract -- honouring it is entirely up to the component.
 */
export type ArrayObjViewProps = BaseViewFieldProps & {
    value: ArrayObjRow[] | undefined
    itemsDef: ArrayObjItemDef[]
    kind: ArrayObjKind
    children: ReactNode[][]
}

export type FileViewProps = BaseViewFieldProps & {
    value: FileValue | undefined
}

/**
 * Props for a `blockchain` field. The value is an opaque CAIP address string --
 * the engine never checks its format, so the component is free to parse it.
 */
export type BlockchainViewProps = BaseViewFieldProps & {
    value: string | undefined
}

export type SustainabilityViewProps = BaseViewFieldProps & {
    value: SustainabilityValue | undefined
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
    /** Optional: fields of this type render nothing when no component is supplied. */
    array_obj?: ComponentType<ArrayObjViewProps>
    /** Optional: fields of this type render nothing when no component is supplied. */
    multiselect?: ComponentType<MultiselectViewProps>
    /** Optional: fields of this type render nothing when no component is supplied. */
    static?: ComponentType<StaticViewProps>
    /** Optional: fields of this type render nothing when no component is supplied. */
    blockchain?: ComponentType<BlockchainViewProps>
    /** Optional: fields of this type render nothing when no component is supplied. */
    sustainability?: ComponentType<SustainabilityViewProps>
    error?: ComponentType<ErrorProps>
}
