import { type FC, Fragment } from 'react'

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
}) => {
    const engine = useFormEngine(definition)
    const visibilityMap = engine.getVisibilityMap(data)
    const errors = showValidation ? engine.validate(data).errors : []

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
