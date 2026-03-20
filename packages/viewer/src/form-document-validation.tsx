import type { ComponentType, FC, PropsWithChildren } from 'react'

import type { DocumentValidationError } from '@bluprynt/forms-core'

import { useFormContext } from './form-context'

type FormDocumentValidationProps = {
    container: ComponentType<PropsWithChildren>
    error: ComponentType<DocumentValidationError>
}

export const FormDocumentValidation: FC<FormDocumentValidationProps> = ({
    container: ContainerComponent,
    error: ErrorComponent,
}) => {
    const { documentErrors } = useFormContext()

    if (!documentErrors?.length) return null

    return (
        <ContainerComponent>
            {documentErrors.map((error, index) => (
                <ErrorComponent
                    // biome-ignore lint/suspicious/noArrayIndexKey: index is unique in array
                    key={`error-${error.code}-${error.itemId ?? ''}-${index}`}
                    {...error}
                />
            ))}
        </ContainerComponent>
    )
}
