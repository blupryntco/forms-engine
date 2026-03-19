import type { FC } from 'react'

import type { BooleanValidation } from '@bluprynt/forms-core'

import { Checkbox } from './primitives'

export const BooleanValidationEditor: FC<{
    validation: BooleanValidation
    onChange: (v: BooleanValidation | undefined) => void
}> = ({ validation, onChange }) => (
    <Checkbox
        label="Required"
        checked={validation.required ?? false}
        onChange={(c) => onChange(c ? { required: true } : undefined)}
    />
)
