import { createContext, type FC, type ReactNode, useContext, useMemo } from 'react'

import type {
    FieldValidationError,
    FormDefinition,
    FormDocument,
    FormEngine,
    FormValidationResult,
} from '@bluprynt/forms-core'

import type { ROOT } from './constants'
import { useFormEngine } from './use-form-engine'

type FormContextValue = {
    definition: FormDefinition
    data: FormDocument
    engine: FormEngine
    visibilityMap: Map<number, boolean>
    validation: FormValidationResult
    fieldErrors: Map<number, FieldValidationError[]>
    section: typeof ROOT | number | undefined
}

const FormContext = createContext<FormContextValue | undefined>(undefined)

export const useFormContext = (): FormContextValue => {
    const context = useContext(FormContext)
    if (!context) throw new Error('useFormContext must be used within a <Form> provider')

    return context
}

type FormProps = {
    definition: FormDefinition
    data: FormDocument
    section?: typeof ROOT | number
    children: ReactNode
}

export const Form: FC<FormProps> = ({ definition, data, section, children }) => {
    const engine = useFormEngine(definition)

    const visibilityMap = useMemo(() => engine.getVisibilityMap(data), [engine, data])
    const validation = useMemo(() => engine.validate(data), [engine, data])
    const fieldErrors = validation.fieldErrors

    const value: FormContextValue = {
        definition,
        data,
        engine,
        visibilityMap,
        validation,
        fieldErrors,
        section,
    }

    return <FormContext.Provider value={value}>{children}</FormContext.Provider>
}
