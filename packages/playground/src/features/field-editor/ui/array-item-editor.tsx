import type { FC } from 'react'

import type { ArrayItemDef, TypeSpecificValidation } from '@bluprynt/forms-core'

import { OptionsEditor } from './options-editor'
import { Label, TextInput } from './primitives'
import { ValidationEditor } from './validation-editor'

const ARRAY_ITEM_TYPES: { value: ArrayItemDef['type']; label: string }[] = [
    { value: 'string', label: 'Text' },
    { value: 'number', label: 'Number' },
    { value: 'boolean', label: 'Boolean' },
    { value: 'date', label: 'Date' },
    { value: 'select', label: 'Select' },
    { value: 'file', label: 'File' },
]

export const ArrayItemEditor: FC<{
    itemDef: ArrayItemDef | undefined
    onChange: (itemDef: ArrayItemDef) => void
}> = ({ itemDef, onChange }) => {
    const def: ArrayItemDef = itemDef ?? { type: 'string', label: '' }

    const update = (patch: Partial<ArrayItemDef>) => {
        const next = { ...def, ...patch }
        if (patch.type && patch.type !== def.type) {
            delete next.validation
            if (patch.type !== 'select') delete next.options
        }
        onChange(next)
    }

    return (
        <div className="flex flex-col gap-3 rounded border border-gray-200 bg-gray-50 p-3">
            <div>
                <Label>Item type</Label>
                <select
                    value={def.type}
                    onChange={(e) => update({ type: e.target.value as ArrayItemDef['type'] })}
                    className="mt-1 w-full rounded border border-gray-200 bg-white px-2 py-1.5 text-sm outline-none focus:border-blue-400">
                    {ARRAY_ITEM_TYPES.map((t) => (
                        <option key={t.value} value={t.value}>
                            {t.label}
                        </option>
                    ))}
                </select>
            </div>
            <div>
                <Label>Item label</Label>
                <div className="mt-1">
                    <TextInput value={def.label} placeholder="Item label" onChange={(v) => update({ label: v })} />
                </div>
            </div>
            <div>
                <Label>Item description</Label>
                <div className="mt-1">
                    <TextInput
                        value={def.description ?? ''}
                        placeholder="Optional"
                        onChange={(v) => update({ description: v || undefined })}
                    />
                </div>
            </div>
            {def.type === 'select' && (
                <div>
                    <Label>Item options</Label>
                    <div className="mt-1">
                        <OptionsEditor options={def.options ?? []} onChange={(opts) => update({ options: opts })} />
                    </div>
                </div>
            )}
            <div>
                <Label>Item validation</Label>
                <div className="mt-1">
                    <ValidationEditor
                        type={def.type}
                        validation={def.validation as TypeSpecificValidation | undefined}
                        onChange={(v) => update({ validation: v as Record<string, unknown> | undefined })}
                    />
                </div>
            </div>
        </div>
    )
}
