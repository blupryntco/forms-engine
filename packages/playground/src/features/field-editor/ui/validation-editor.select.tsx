import type { FC } from 'react'

import type { SelectValidation } from '@bluprynt/forms-core'

import { Checkbox } from './primitives'

export const SelectValidationEditor: FC<{
    validation: SelectValidation
    onChange: (v: SelectValidation | undefined) => void
}> = ({ validation, onChange }) => (
    <Checkbox
        label="Required"
        checked={validation.required ?? false}
        onChange={(c) => onChange(c ? { required: true } : undefined)}
    />
)
