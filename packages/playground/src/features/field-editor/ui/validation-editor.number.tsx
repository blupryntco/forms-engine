import type { FC } from 'react'

import type { NumberValidation } from '@bluprynt/forms-core'

import { Checkbox, Label, NumberInput } from './primitives'

export const NumberValidationEditor: FC<{
    validation: NumberValidation
    onChange: (v: NumberValidation | undefined) => void
}> = ({ validation, onChange }) => {
    const update = (value: Partial<NumberValidation>) => {
        const updated = { ...validation, ...value }
        if (updated.min == null) delete updated.min
        if (updated.max == null) delete updated.max
        if (!updated.required) delete updated.required
        onChange(Object.keys(updated).length > 0 ? updated : undefined)
    }

    return (
        <div className="flex flex-col gap-2">
            <Checkbox
                label="Required"
                checked={validation.required ?? false}
                onChange={(c) => update({ required: c || undefined })}
            />
            <div className="grid grid-cols-2 gap-2">
                <div>
                    <Label>Min</Label>
                    <NumberInput value={validation.min} placeholder="—" onChange={(val) => update({ min: val })} />
                </div>
                <div>
                    <Label>Max</Label>
                    <NumberInput value={validation.max} placeholder="—" onChange={(val) => update({ max: val })} />
                </div>
            </div>
        </div>
    )
}
