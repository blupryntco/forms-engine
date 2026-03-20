import type { FC } from 'react'

import type { SelectOption } from '@bluprynt/forms-core'

export const OptionsEditor: FC<{
    options: SelectOption[]
    onChange: (options: SelectOption[]) => void
}> = ({ options, onChange }) => {
    const handleAdd = () => {
        onChange([...options, { value: '', label: '' }])
    }

    const handleRemove = (index: number) => {
        onChange(options.filter((_, i) => i !== index))
    }

    const handleUpdate = (index: number, patch: Partial<SelectOption>) => {
        onChange(options.map((opt, i) => (i === index ? { ...opt, ...patch } : opt)))
    }

    return (
        <div className="flex flex-col gap-2">
            {options.map((opt, i) => (
                <div key={i} className="flex items-center gap-1">
                    <input
                        type="text"
                        value={opt.value}
                        placeholder="Value"
                        onChange={(e) => handleUpdate(i, { value: e.target.value })}
                        className="w-1/3 rounded border border-gray-200 px-2 py-1 text-xs outline-none focus:border-blue-400"
                    />
                    <input
                        type="text"
                        value={opt.label}
                        placeholder="Label"
                        onChange={(e) => handleUpdate(i, { label: e.target.value })}
                        className="min-w-0 flex-1 rounded border border-gray-200 px-2 py-1 text-xs outline-none focus:border-blue-400"
                    />
                    <button
                        type="button"
                        onClick={() => handleRemove(i)}
                        className="shrink-0 rounded p-1 text-gray-400 hover:bg-red-50 hover:text-red-500"
                        aria-label="Remove option">
                        &times;
                    </button>
                </div>
            ))}
            <button
                type="button"
                onClick={handleAdd}
                className="self-start rounded border border-dashed border-gray-300 px-2 py-1 text-xs text-gray-500 hover:border-gray-400 hover:text-gray-700">
                + Add option
            </button>
        </div>
    )
}
