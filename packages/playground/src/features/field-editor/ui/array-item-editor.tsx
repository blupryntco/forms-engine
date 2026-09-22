import type { FC } from 'react'

import type { ArrayItemDef } from '@bluprynt/forms-core'

import { applyItemTypeChange, ItemDefFields, type ItemDefLike } from './item-def-fields'

/** Strips the keys that do not belong to the chosen item type. */
export const toArrayItemDef = (def: ItemDefLike): ArrayItemDef =>
    def.type === 'static'
        ? {
              type: 'static',
              text: def.text ?? '',
              label: def.label || undefined,
              description: def.description,
              placeholder: def.placeholder,
              answer_guidelines: def.answer_guidelines,
              reference_id: def.reference_id,
          }
        : {
              type: def.type,
              label: def.label ?? '',
              description: def.description,
              placeholder: def.placeholder,
              answer_guidelines: def.answer_guidelines,
              reference_id: def.reference_id,
              validation: def.validation,
              options: def.options,
          }

export const ArrayItemEditor: FC<{
    itemDef: ArrayItemDef | undefined
    onChange: (itemDef: ArrayItemDef) => void
}> = ({ itemDef, onChange }) => {
    const def = (itemDef ?? { type: 'string', label: '' }) as ItemDefLike

    return (
        <div className="flex flex-col gap-3 rounded border border-gray-200 bg-gray-50 p-3">
            <ItemDefFields
                def={def}
                prefix="Item"
                onChange={(patch) => onChange(toArrayItemDef({ ...def, ...patch }))}
                onTypeChange={(type) => onChange(toArrayItemDef(applyItemTypeChange(def, type)))}
            />
        </div>
    )
}
