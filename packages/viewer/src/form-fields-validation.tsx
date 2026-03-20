import { type ComponentType, type FC, type PropsWithChildren, useMemo } from 'react'

import type { FieldEntry, FieldValidationError } from '@bluprynt/forms-core'

import { useFormContext } from './form-context'

export type FieldValidationFieldEntry = {
    field: FieldEntry | undefined
    errors: FieldValidationError[]
}

type FormFieldsValidationProps = {
    container: ComponentType<PropsWithChildren>
    field: ComponentType<PropsWithChildren<FieldValidationFieldEntry>>
    error: ComponentType<FieldValidationError>
}

export const FormFieldsValidation: FC<FormFieldsValidationProps> = ({
    container: ContainerComponent,
    field: FieldComponent,
    error: ErrorComponent,
}) => {
    const { engine, data, fieldErrors, visibilityMap } = useFormContext()

    const groups = useMemo(() => {
        if (!engine || !data || fieldErrors.size === 0) return []

        const result: FieldValidationFieldEntry[] = []

        for (const [fieldId, errors] of fieldErrors) {
            if (visibilityMap.get(fieldId) === false) continue

            result.push({
                field: engine.getFieldDef(fieldId),
                errors,
            })
        }

        return result
    }, [engine, data, fieldErrors, visibilityMap])

    if (groups.length === 0) return null

    return (
        <ContainerComponent>
            {groups.map((group) => (
                <FieldComponent key={group.field?.id} {...group}>
                    {group.errors.map((error) => (
                        <ErrorComponent key={`${error.fieldId}-${error.rule}-${error.itemIndex ?? ''}`} {...error} />
                    ))}
                </FieldComponent>
            ))}
        </ContainerComponent>
    )
}
