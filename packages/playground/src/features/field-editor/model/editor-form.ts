import type {
    ArrayItemDef,
    ArrayObjItemDef,
    ArrayObjKind,
    FieldType,
    SelectOption,
    TypeSpecificValidation,
} from '@bluprynt/forms-core'
import type { useFormik } from 'formik'

export type EditorFormValues = {
    kind: 'field' | 'section'
    // field-specific
    type: FieldType
    label: string
    /** Static blocks only: the displayed text. */
    text: string
    options: SelectOption[]
    /** `array` fields only: the single item definition. */
    item: ArrayItemDef | undefined
    /** `array_obj` fields only: the ordered sub-field definitions. */
    items: ArrayObjItemDef[] | undefined
    /** `array_obj` fields only: the layout hint. Named to avoid the `kind` discriminator above. */
    arrayKind: ArrayObjKind
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
