import type { FC } from 'react'

import type {
    ArrayValidation,
    BooleanValidation,
    DateValidation,
    FieldType,
    FileValidation,
    NumberValidation,
    SelectValidation,
    StringValidation,
    TypeSpecificValidation,
} from '@bluprynt/forms-core'

import { ArrayValidationEditor } from './validation-editor.array'
import { BooleanValidationEditor } from './validation-editor.boolean'
import { DateValidationEditor } from './validation-editor.date'
import { FileValidationEditor } from './validation-editor.file'
import { NumberValidationEditor } from './validation-editor.number'
import { SelectValidationEditor } from './validation-editor.select'
import { StringValidationEditor } from './validation-editor.string'

export const ValidationEditor: FC<{
    type: FieldType
    validation: TypeSpecificValidation | undefined
    onChange: (v: TypeSpecificValidation | undefined) => void
}> = ({ type, validation, onChange }) => {
    switch (type) {
        case 'string':
            return <StringValidationEditor validation={(validation ?? {}) as StringValidation} onChange={onChange} />
        case 'number':
            return <NumberValidationEditor validation={(validation ?? {}) as NumberValidation} onChange={onChange} />
        case 'boolean':
            return <BooleanValidationEditor validation={(validation ?? {}) as BooleanValidation} onChange={onChange} />
        case 'date':
            return <DateValidationEditor validation={(validation ?? {}) as DateValidation} onChange={onChange} />
        case 'select':
            return <SelectValidationEditor validation={(validation ?? {}) as SelectValidation} onChange={onChange} />
        case 'array':
            return <ArrayValidationEditor validation={(validation ?? {}) as ArrayValidation} onChange={onChange} />
        case 'file':
            return <FileValidationEditor validation={(validation ?? {}) as FileValidation} onChange={onChange} />
    }
}
