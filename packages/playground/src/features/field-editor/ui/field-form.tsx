import { type FC, useMemo } from 'react'

import type { Condition, FieldType, FormDefinition } from '@bluprynt/forms-core'

import type { EditorFormik } from '../model/editor-form'
import { ArrayItemEditor } from './array-item-editor'
import { ArrayItemsEditor } from './array-items-editor'
import { ConditionalEditor, collectFields } from './conditional-editor'
import { MetadataFields } from './metadata-fields'
import { OptionsEditor } from './options-editor'
import { Label, TextInput } from './primitives'
import { ValidationEditor } from './validation-editor'

const FIELD_TYPES: { value: FieldType; label: string }[] = [
    { value: 'string', label: 'Text' },
    { value: 'number', label: 'Number' },
    { value: 'boolean', label: 'Boolean' },
    { value: 'date', label: 'Date' },
    { value: 'select', label: 'Select' },
    { value: 'multiselect', label: 'Multi-select' },
    { value: 'array', label: 'Array' },
    { value: 'array_obj', label: 'Array of rows' },
    { value: 'file', label: 'File' },
    { value: 'static', label: 'Static text' },
    { value: 'blockchain', label: 'Blockchain' },
    { value: 'sustainability', label: 'Sustainability' },
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
        if (newType !== 'select' && newType !== 'multiselect') formik.setFieldValue('options', [])
        if (newType !== 'array') formik.setFieldValue('item', undefined)
        if (newType !== 'array_obj') formik.setFieldValue('items', undefined)
        if (newType !== 'static') formik.setFieldValue('text', '')
        formik.setFieldValue('validation', undefined)
    }

    const isStatic = formik.values.type === 'static'

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

            {isStatic && (
                <div>
                    <Label>Text</Label>
                    <div className="mt-1">
                        <textarea
                            value={formik.values.text}
                            placeholder="Text shown inside the form"
                            onChange={(e) => formik.setFieldValue('text', e.target.value)}
                            rows={4}
                            className="w-full rounded border border-gray-200 px-2 py-1.5 text-sm outline-none focus:border-blue-400"
                        />
                    </div>
                </div>
            )}

            <div>
                <Label>{isStatic ? 'Heading (optional)' : 'Label'}</Label>
                <div className="mt-1">
                    <TextInput
                        value={formik.values.label}
                        placeholder={isStatic ? 'Optional heading' : 'Field label'}
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

            <MetadataFields formik={formik} />

            {(formik.values.type === 'select' || formik.values.type === 'multiselect') && (
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

            {formik.values.type === 'array_obj' && (
                <div>
                    <Label>Row layout</Label>
                    <select
                        value={formik.values.arrayKind}
                        onChange={(e) => formik.setFieldValue('arrayKind', e.target.value)}
                        className="mt-1 w-full rounded border border-gray-200 px-2 py-1.5 text-sm outline-none focus:border-blue-400">
                        <option value="list">List — one stacked block per row</option>
                        <option value="table">Table — one shared header, one column per sub-field</option>
                    </select>
                </div>
            )}

            {formik.values.type === 'array_obj' && (
                <div>
                    <Label>Row sub-fields</Label>
                    <div className="mt-1">
                        <ArrayItemsEditor
                            items={formik.values.items}
                            definition={definition}
                            onChange={(items) => formik.setFieldValue('items', items)}
                        />
                    </div>
                </div>
            )}

            {!isStatic && (
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
            )}

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
