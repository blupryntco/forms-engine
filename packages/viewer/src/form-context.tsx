import { createContext, type FC, type ReactNode, useContext, useMemo } from 'react'

import {
    DocumentError,
    DocumentValidationError,
    FieldValidationError,
    FormDefinition,
    FormDocument,
    FormEngine,
    FormValidationResult,
} from '@bluprynt/forms-core'

import type { ROOT } from './constants'

type FormContextValue = {
    definition: FormDefinition | undefined
    data: FormDocument | undefined
    engine: FormEngine | undefined
    visibilityMap: Map<number, boolean>
    validation: FormValidationResult | undefined
    documentErrors: readonly DocumentValidationError[] | undefined
    fieldErrors: Map<number, FieldValidationError[]>
    section: typeof ROOT | number | undefined
    showInlineValidation: boolean
}

const FormContext = createContext<FormContextValue | undefined>(undefined)

export const useFormContext = (): FormContextValue => {
    const context = useContext(FormContext)
    if (!context) throw new Error('useFormContext must be used within a <Form> provider')

    return context
}

type FormProps = {
    definition?: FormDefinition
    data?: FormDocument
    section?: typeof ROOT | number
    showInlineValidation?: boolean
    children: ReactNode
}

export const Form: FC<FormProps> = ({ definition, data, section, showInlineValidation = true, children }) => {
    const { engine, documentErrors: definitionErrors } = useMemo(() => {
        if (!definition) return {}

        try {
            return { engine: new FormEngine(definition) }
        } catch (error) {
            if (error instanceof DocumentError) return { documentErrors: error.errors }
            throw error
        }
    }, [definition])

    const { visibilityMap, validation, documentErrors, fieldErrors } = useMemo(() => {
        const visibilityMap = engine && data ? engine.getVisibilityMap(data) : new Map<number, boolean>()
        const validation =
            engine && data
                ? engine.validate(data)
                : ({
                      valid: true,
                      fieldErrors: new Map<number, FieldValidationError[]>(),
                  } satisfies FormValidationResult)

        return {
            visibilityMap,
            validation,
            documentErrors: [...(definitionErrors ?? []), ...(validation?.documentErrors ?? [])],
            fieldErrors: validation?.fieldErrors ?? new Map<number, FieldValidationError[]>(),
        } as const
    }, [engine, data, definitionErrors])

    const value: FormContextValue = {
        definition,
        data,
        engine,
        visibilityMap,
        validation,
        documentErrors,
        fieldErrors,
        section,
        showInlineValidation,
    } as const

    return <FormContext.Provider value={value}>{children}</FormContext.Provider>
}
