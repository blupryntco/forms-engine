import type { ArrayItemDef, FieldType, SelectOption, TypeSpecificValidation } from '@bluprynt/forms-core'
import type { useFormik } from 'formik'

export type EditorFormValues = {
    kind: 'field' | 'section'
    // field-specific
    type: FieldType
    label: string
    /** Static blocks only: the displayed text. */
    text: string
    options: SelectOption[]
    item: ArrayItemDef | undefined
    validation: TypeSpecificValidation | undefined
    // section-specific
    title: string
    // common
    description: string
    placeholder: string
    answerGuidelines: string
    referenceId: string
    conditionText: string
}

export type EditorFormik = ReturnType<typeof useFormik<EditorFormValues>>
