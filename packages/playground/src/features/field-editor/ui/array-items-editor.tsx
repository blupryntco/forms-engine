import type { FC } from 'react'

import type { ArrayObjItemDef, FormDefinition } from '@bluprynt/forms-core'

import { Button } from '@/shared/ui/button'

import { applyItemTypeChange, ItemDefFields, type ItemDefLike } from './item-def-fields'
import { Label } from './primitives'

/** Strips the keys that do not belong to the chosen sub-field type. */
const toSubFieldDef = (id: number, def: ItemDefLike): ArrayObjItemDef =>
    def.type === 'static'
        ? {
              id,
              type: 'static',
              text: def.text ?? '',
              label: def.label || undefined,
              description: def.description,
              placeholder: def.placeholder,
              answer_guidelines: def.answer_guidelines,
              reference_id: def.reference_id,
          }
        : {
              id,
              type: def.type,
              label: def.label ?? '',
              description: def.description,
              placeholder: def.placeholder,
              answer_guidelines: def.answer_guidelines,
              reference_id: def.reference_id,
              validation: def.validation,
              options: def.options,
          }

/**
 * Allocates the next sub-field id.
 *
 * `FormDefinitionEditor.nextId()` only sees what is already saved, and this
 * editor holds unsaved sub-fields in form state, so both sources are scanned --
 * otherwise two additions before one save would collide.
 */
const nextSubFieldId = (definition: FormDefinition, pending: ArrayObjItemDef[]): number => {
    let max = 0

    const walk = (items: FormDefinition['content']): void => {
        for (const item of items) {
            if (item.id > max) max = item.id
            if (item.type === 'section') walk(item.content)
            else if (item.type === 'array_obj') {
                for (const sub of item.items ?? []) if (sub.id > max) max = sub.id
            }
        }
    }

    walk(definition.content)
    for (const sub of pending) if (sub.id > max) max = sub.id

    return max + 1
}

export const ArrayItemsEditor: FC<{
    items: ArrayObjItemDef[] | undefined
    definition: FormDefinition
    onChange: (items: ArrayObjItemDef[]) => void
}> = ({ items, definition, onChange }) => {
    const subFields = items ?? []

    const replace = (index: number, next: ArrayObjItemDef) =>
        onChange(subFields.map((field, i) => (i === index ? next : field)))

    const move = (from: number, to: number) => {
        if (to < 0 || to >= subFields.length) return
        const next = [...subFields]
        const [moved] = next.splice(from, 1)
        if (moved) next.splice(to, 0, moved)
        onChange(next)
    }

    return (
        <div className="flex flex-col gap-3">
            {subFields.length === 0 && (
                <p className="text-gray-500 text-sm italic">No sub-fields yet — every row would be empty.</p>
            )}

            {subFields.map((subField, index) => {
                const def = subField as ItemDefLike

                return (
                    <div
                        key={subField.id}
                        className="flex flex-col gap-3 rounded border border-gray-200 bg-gray-50 p-3">
                        <div className="flex items-center justify-between">
                            <Label>{`Sub-field ${index + 1} · id ${subField.id}`}</Label>
                            <div className="flex gap-1">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    disabled={index === 0}
                                    onClick={() => move(index, index - 1)}>
                                    ↑
                                </Button>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    disabled={index === subFields.length - 1}
                                    onClick={() => move(index, index + 1)}>
                                    ↓
                                </Button>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => onChange(subFields.filter((_, i) => i !== index))}>
                                    Remove
                                </Button>
                            </div>
                        </div>

                        <ItemDefFields
                            def={def}
                            onChange={(patch) => replace(index, toSubFieldDef(subField.id, { ...def, ...patch }))}
                            onTypeChange={(type) =>
                                replace(index, toSubFieldDef(subField.id, applyItemTypeChange(def, type)))
                            }
                        />
                    </div>
                )
            })}

            <div>
                <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                        onChange([
                            ...subFields,
                            { id: nextSubFieldId(definition, subFields), type: 'string', label: '' },
                        ])
                    }>
                    + Add sub-field
                </Button>
            </div>
        </div>
    )
}
