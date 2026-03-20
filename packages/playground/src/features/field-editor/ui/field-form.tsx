import { type FC, useMemo } from 'react'

import type { Condition, FieldType, FormDefinition } from '@bluprynt/forms-core'

import type { EditorFormik } from '../model/editor-form'
import { ArrayItemEditor } from './array-item-editor'
import { ConditionalEditor, collectFields } from './conditional-editor'
import { OptionsEditor } from './options-editor'
import { Label, TextInput } from './primitives'
import { ValidationEditor } from './validation-editor'

const FIELD_TYPES: { value: FieldType; label: string }[] = [
    { value: 'string', label: 'Text' },
    { value: 'number', label: 'Number' },
    { value: 'boolean', label: 'Boolean' },
    { value: 'date', label: 'Date' },
    { value: 'select', label: 'Select' },
    { value: 'array', label: 'Array' },
    { value: 'file', label: 'File' },
]

export const FieldForm: FC<{
    formik: EditorFormik
    definition: FormDefinition
    itemId: number
}> = ({ formik, definition, itemId }) => {
    const fields = useMemo(() => collectFields(definition.content, itemId), [definition.content, itemId])

    const condition = useMemo<Condition | undefined>(() => {
        const text = formik.values.conditionText.trim()
        if (!text) return undefined
        try {
            return JSON.parse(text) as Condition
        } catch {
            return undefined
        }
    }, [formik.values.conditionText])

    const handleTypeChange = (newType: FieldType) => {
        formik.setFieldValue('type', newType)
        if (newType !== 'select') formik.setFieldValue('options', [])
        if (newType !== 'array') formik.setFieldValue('item', undefined)
        formik.setFieldValue('validation', undefined)
    }

    return (
        <div className="flex flex-col gap-4">
            <div>
                <Label>Type</Label>
                <select
                    name="type"
                    value={formik.values.type}
                    onChange={(e) => handleTypeChange(e.target.value as FieldType)}
                    className="mt-1 w-full rounded border border-gray-200 px-2 py-1.5 text-sm outline-none focus:border-blue-400">
                    {FIELD_TYPES.map((ft) => (
                        <option key={ft.value} value={ft.value}>
                            {ft.label}
                        </option>
                    ))}
                </select>
            </div>

            <div>
                <Label>Label</Label>
                <div className="mt-1">
                    <TextInput
                        value={formik.values.label}
                        placeholder="Field label"
                        onChange={(v) => formik.setFieldValue('label', v)}
                    />
                </div>
            </div>

            <div>
                <Label>Description</Label>
                <div className="mt-1">
                    <TextInput
                        value={formik.values.description}
                        placeholder="Optional description"
                        onChange={(v) => formik.setFieldValue('description', v)}
                    />
                </div>
            </div>

            {formik.values.type === 'select' && (
                <div>
                    <Label>Options</Label>
                    <div className="mt-1">
                        <OptionsEditor
                            options={formik.values.options}
                            onChange={(opts) => formik.setFieldValue('options', opts)}
                        />
                    </div>
                </div>
            )}

            {formik.values.type === 'array' && (
                <div>
                    <Label>Array item</Label>
                    <div className="mt-1">
                        <ArrayItemEditor
                            itemDef={formik.values.item}
                            onChange={(def) => formik.setFieldValue('item', def)}
                        />
                    </div>
                </div>
            )}

            <div>
                <Label>Validation</Label>
                <div className="mt-1">
                    <ValidationEditor
                        type={formik.values.type}
                        validation={formik.values.validation}
                        onChange={(v) => formik.setFieldValue('validation', v)}
                    />
                </div>
            </div>

            <div>
                <Label>Condition</Label>
                <div className="mt-1">
                    <ConditionalEditor
                        condition={condition}
                        fields={fields}
                        onChange={(c) => formik.setFieldValue('conditionText', c ? JSON.stringify(c, null, 2) : '')}
                    />
                </div>
            </div>
        </div>
    )
}
