import type { FC } from 'react'

import type { StringValidation } from '@bluprynt/forms-core'

import { Checkbox, Label, NumberInput, TextInput } from './primitives'

export const StringValidationEditor: FC<{
    validation: StringValidation
    onChange: (v: StringValidation | undefined) => void
}> = ({ validation, onChange }) => {
    const update = (value: Partial<StringValidation>) => {
        const updated = { ...validation, ...value }
        if (updated.minLength == null) delete updated.minLength
        if (updated.maxLength == null) delete updated.maxLength
        if (!updated.pattern) delete updated.pattern
        if (!updated.patternMessage) delete updated.patternMessage
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
                    <Label>Min length</Label>
                    <NumberInput
                        value={validation.minLength}
                        placeholder="—"
                        onChange={(val) => update({ minLength: val })}
                    />
                </div>
                <div>
                    <Label>Max length</Label>
                    <NumberInput
                        value={validation.maxLength}
                        placeholder="—"
                        onChange={(val) => update({ maxLength: val })}
                    />
                </div>
            </div>
            <div>
                <Label>Pattern (regex)</Label>
                <TextInput
                    value={validation.pattern ?? ''}
                    placeholder="e.g. ^[a-z]+$"
                    onChange={(val) => update({ pattern: val || undefined })}
                />
            </div>
            {validation.pattern && (
                <div>
                    <Label>Pattern message</Label>
                    <TextInput
                        value={validation.patternMessage ?? ''}
                        placeholder="Error message"
                        onChange={(val) => update({ patternMessage: val || undefined })}
                    />
                </div>
            )}
        </div>
    )
}
