import type { FC } from 'react'

import type { ArrayValidation } from '@bluprynt/forms-core'

import { Label, NumberInput } from './primitives'

export const ArrayValidationEditor: FC<{
    validation: ArrayValidation
    onChange: (v: ArrayValidation | undefined) => void
}> = ({ validation, onChange }) => {
    const update = (value: Partial<ArrayValidation>) => {
        const updated = { ...validation, ...value }
        if (updated.minItems == null) delete updated.minItems
        if (updated.maxItems == null) delete updated.maxItems
        onChange(Object.keys(updated).length > 0 ? updated : undefined)
    }

    return (
        <div className="grid grid-cols-2 gap-2">
            <div>
                <Label>Min items</Label>
                <NumberInput
                    value={validation.minItems}
                    placeholder="—"
                    onChange={(val) => update({ minItems: val })}
                />
            </div>
            <div>
                <Label>Max items</Label>
                <NumberInput
                    value={validation.maxItems}
                    placeholder="—"
                    onChange={(val) => update({ maxItems: val })}
                />
            </div>
        </div>
    )
}
