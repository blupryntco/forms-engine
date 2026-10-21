import type { FC } from 'react'

import type {
    ContentItem,
    FieldContentItem,
    FieldValidationError,
    FormSuggestions,
    FormValues,
} from '@bluprynt/forms-core'

import { DEFAULT, ROOT } from '../constants'
import type {
    EditorArrayItemProps,
    EditorArrayObjItemProps,
    EditorComponentMap,
    EditorFieldProps,
    ViewerComponentMap,
} from '../types'
import { FormItems } from './form-items'
import { findSection, hasVisibleValueItem } from './utils'

type FormContentBaseProps = {
    items: ContentItem[]
    visibilityMap: Map<number, boolean>
    values: FormValues
    suggestions?: FormSuggestions
    fieldErrors: Map<number, FieldValidationError[]>
    section?: typeof ROOT | typeof DEFAULT | number
    showInlineValidation: boolean
}

type FormContentViewerProps = FormContentBaseProps & {
    mode: 'viewer'
    components: ViewerComponentMap
}

type FormContentEditorProps = FormContentBaseProps & {
    mode: 'editor'
    components: EditorComponentMap
    renderFieldProps: (field: FieldContentItem) => EditorFieldProps
    renderArrayItemProps: (arrayField: FieldContentItem, index: number) => EditorArrayItemProps
    renderArrayObjItemProps: (
        arrayField: FieldContentItem,
        index: number,
        subFieldId: number,
    ) => EditorArrayObjItemProps
}

export type FormContentProps = FormContentViewerProps | FormContentEditorProps

export const FormContent: FC<FormContentProps> = (props) => {
    const { items, visibilityMap, values, suggestions, fieldErrors, section, showInlineValidation } = props

    const sharedProps =
        props.mode === 'editor'
            ? {
                  visibilityMap,
                  values,
                  suggestions,
                  fieldErrors,
                  components: props.components,
                  showInlineValidation,
                  renderFieldProps: props.renderFieldProps,
                  renderArrayItemProps: props.renderArrayItemProps,
                  renderArrayObjItemProps: props.renderArrayObjItemProps,
              }
            : {
                  visibilityMap,
                  values,
                  suggestions,
                  fieldErrors,
                  components: props.components,
                  showInlineValidation,
              }

    const selectedSection = section === DEFAULT ? resolveDefaultSection(items, visibilityMap) : section

    if (selectedSection === undefined) return <FormItems items={items} {...sharedProps} />

    if (selectedSection === ROOT) {
        const nonSectionItems = items.filter((item) => item.type !== 'section')
        return <FormItems items={nonSectionItems} {...sharedProps} />
    }

    const foundSection = findSection(items, selectedSection)
    if (!foundSection || !visibilityMap.get(foundSection.id)) return null

    const Section = props.components.section
    return (
        <Section key={foundSection.id} section={foundSection}>
            <FormItems items={foundSection.content} {...sharedProps} />
        </Section>
    )
}

const resolveDefaultSection = (
    items: ContentItem[],
    visibilityMap: Map<number, boolean>,
): typeof ROOT | number | undefined => {
    if (hasVisibleValueItem(items, visibilityMap)) return ROOT

    const firstVisibleSection = items.find((item) => item.type === 'section' && visibilityMap.get(item.id) !== false)

    return firstVisibleSection?.id
}
