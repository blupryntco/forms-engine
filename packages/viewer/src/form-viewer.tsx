import type { FC } from 'react'

import { FormContent } from './form'
import { useFormContext } from './form-context'
import type { ViewerComponentMap } from './types'

type FormViewerProps = {
    components: ViewerComponentMap
}

export const FormViewer: FC<FormViewerProps> = ({ components }) => {
    const { definition, data, visibilityMap, fieldErrors, section } = useFormContext()

    return (
        <FormContent
            mode="viewer"
            items={definition.content}
            visibilityMap={visibilityMap}
            values={data.values}
            fieldErrors={fieldErrors}
            components={components}
            section={section}
        />
    )
}
