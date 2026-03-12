import { type FC, Fragment, useEffect } from 'react'

import { renderContent } from './render-content'
import type { FormViewerProps } from './types'
import { useFormEngine } from './use-form-engine'

export const FormViewer: FC<FormViewerProps> = ({
    definition,
    data,
    components,
    section,
    includeSectionHeader = true,
    showValidation = false,
    onDocumentError,
}) => {
    const engine = useFormEngine(definition)
    const visibilityMap = engine.getVisibilityMap(data)
    const validation = engine.validate(data)
    const errors = showValidation ? validation.errors : []

    useEffect(() => {
        if (onDocumentError && validation.documentErrors && validation.documentErrors.length > 0) {
            onDocumentError(validation.documentErrors)
        }
    }, [onDocumentError, validation.documentErrors])

    return (
        <Fragment>
            {renderContent({
                items: definition.content,
                visibilityMap,
                values: data.values,
                errors,
                components,
                sectionFilter: section,
                includeSectionHeader,
                renderFieldProps: () => ({}),
                renderArrayItemProps: () => ({}),
            })}
        </Fragment>
    )
}
