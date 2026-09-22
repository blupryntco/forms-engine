import type { FC } from 'react'

import type { ArrayItemDef, SelectOption, TypeSpecificValidation } from '@bluprynt/forms-core'

import { OptionsEditor } from './options-editor'
import { Label, TextInput } from './primitives'
import { ValidationEditor } from './validation-editor'

/**
 * The shape shared by an `array` item definition and an `array_obj` sub-field
 * definition, minus the sub-field's `id`. Both are unions over a value member
 * and a static member; this flat view keeps the form controls in one place, and
 * the two callers narrow it back on the way out.
 */
export type ItemDefLike = {
    type: ArrayItemDef['type']
    label?: string
    text?: string
    description?: string
    placeholder?: string
    answer_guidelines?: string
    reference_id?: string
    validation?: Record<string, unknown>
    options?: SelectOption[]
}

export const ITEM_TYPES: { value: ItemDefLike['type']; label: string }[] = [
    { value: 'string', label: 'Text' },
    { value: 'number', label: 'Number' },
    { value: 'boolean', label: 'Boolean' },
    { value: 'date', label: 'Date' },
    { value: 'select', label: 'Select' },
    { value: 'multiselect', label: 'Multi-select' },
    { value: 'file', label: 'File' },
    { value: 'static', label: 'Static text' },
    { value: 'blockchain', label: 'Blockchain' },
    { value: 'sustainability', label: 'Sustainability' },
]

/** Properties that no longer apply after a type change, cleared in one place. */
export const applyItemTypeChange = (def: ItemDefLike, type: ItemDefLike['type']): ItemDefLike => {
    const next: ItemDefLike = { ...def, type }

    next.validation = undefined
    if (type !== 'select' && type !== 'multiselect') next.options = undefined
    if (type === 'static') next.text = def.text ?? ''
    else next.text = undefined

    return next
}

/**
 * The controls for one item definition -- the type picker, the labels, the
 * authoring metadata, and the per-type options and validation editors.
 *
 * `prefix` labels the controls ("Item type" vs "Type"), which keeps the nested
 * `array` editor readable next to the field's own controls.
 */
export const ItemDefFields: FC<{
    def: ItemDefLike
    prefix?: string
    onChange: (patch: Partial<ItemDefLike>) => void
    onTypeChange: (type: ItemDefLike['type']) => void
}> = ({ def, prefix, onChange, onTypeChange }) => {
    const title = (text: string) => (prefix ? `${prefix} ${text}` : text.charAt(0).toUpperCase() + text.slice(1))
    const isStatic = def.type === 'static'

    return (
        <>
            <div>
                <Label>{title('type')}</Label>
                <select
                    value={def.type}
                    onChange={(e) => onTypeChange(e.target.value as ItemDefLike['type'])}
                    className="mt-1 w-full rounded border border-gray-200 bg-white px-2 py-1.5 text-sm outline-none focus:border-blue-400">
                    {ITEM_TYPES.map((t) => (
                        <option key={t.value} value={t.value}>
                            {t.label}
                        </option>
                    ))}
                </select>
            </div>

            {isStatic && (
                <div>
                    <Label>{title('text')}</Label>
                    <div className="mt-1">
                        <TextInput
                            value={def.text ?? ''}
                            placeholder="Text shown inside the form"
                            onChange={(v) => onChange({ text: v })}
                        />
                    </div>
                </div>
            )}

            <div>
                <Label>{isStatic ? title('heading (optional)') : title('label')}</Label>
                <div className="mt-1">
                    <TextInput
                        value={def.label ?? ''}
                        placeholder={isStatic ? 'Optional heading' : 'Label'}
                        onChange={(v) => onChange({ label: v })}
                    />
                </div>
            </div>

            <div>
                <Label>{title('description')}</Label>
                <div className="mt-1">
                    <TextInput
                        value={def.description ?? ''}
                        placeholder="Optional"
                        onChange={(v) => onChange({ description: v || undefined })}
                    />
                </div>
            </div>

            <div>
                <Label>{title('placeholder')}</Label>
                <div className="mt-1">
                    <TextInput
                        value={def.placeholder ?? ''}
                        placeholder="Optional"
                        onChange={(v) => onChange({ placeholder: v || undefined })}
                    />
                </div>
            </div>

            <div>
                <Label>{title('answer guidelines')}</Label>
                <div className="mt-1">
                    <TextInput
                        value={def.answer_guidelines ?? ''}
                        placeholder="Optional"
                        onChange={(v) => onChange({ answer_guidelines: v || undefined })}
                    />
                </div>
            </div>

            <div>
                <Label>{title('reference id')}</Label>
                <div className="mt-1">
                    <TextInput
                        value={def.reference_id ?? ''}
                        placeholder="Optional"
                        onChange={(v) => onChange({ reference_id: v || undefined })}
                    />
                </div>
            </div>

            {(def.type === 'select' || def.type === 'multiselect') && (
                <div>
                    <Label>{title('options')}</Label>
                    <div className="mt-1">
                        <OptionsEditor options={def.options ?? []} onChange={(opts) => onChange({ options: opts })} />
                    </div>
                </div>
            )}

            {!isStatic && (
                <div>
                    <Label>{title('validation')}</Label>
                    <div className="mt-1">
                        <ValidationEditor
                            type={def.type}
                            validation={def.validation as TypeSpecificValidation | undefined}
                            onChange={(v) => onChange({ validation: v as Record<string, unknown> | undefined })}
                        />
                    </div>
                </div>
            )}
        </>
    )
}
