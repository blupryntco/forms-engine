import type { FC } from 'react'

import type { FileValidation } from '@bluprynt/forms-core'

import { Checkbox } from './primitives'

export const FileValidationEditor: FC<{
    validation: FileValidation
    onChange: (v: FileValidation | undefined) => void
}> = ({ validation, onChange }) => (
    <Checkbox
        label="Required"
        checked={validation.required ?? false}
        onChange={(c) => onChange(c ? { required: true } : undefined)}
    />
)
