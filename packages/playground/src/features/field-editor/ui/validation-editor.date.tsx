import type { FC } from 'react'

import type { DateValidation } from '@bluprynt/forms-core'

import { Checkbox, Label, TextInput } from './primitives'

export const DateValidationEditor: FC<{
    validation: DateValidation
    onChange: (v: DateValidation | undefined) => void
}> = ({ validation, onChange }) => {
    const update = (value: Partial<DateValidation>) => {
        const updated = { ...validation, ...value }
        if (!updated.minDate) delete updated.minDate
        if (!updated.maxDate) delete updated.maxDate
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
                    <Label>Min date</Label>
                    <TextInput
                        value={validation.minDate ?? ''}
                        placeholder="e.g. 2024-01-01"
                        onChange={(val) => update({ minDate: val || undefined })}
                    />
                </div>
                <div>
                    <Label>Max date</Label>
                    <TextInput
                        value={validation.maxDate ?? ''}
                        placeholder="e.g. +7d"
                        onChange={(val) => update({ maxDate: val || undefined })}
                    />
                </div>
            </div>
        </div>
    )
}
