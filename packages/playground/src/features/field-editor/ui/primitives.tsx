import type { FC } from 'react'

export const Label: FC<{ children: string }> = ({ children }) => (
    // biome-ignore lint/a11y/noLabelWithoutControl: we don't need an input for this label
    <label className="text-xs font-medium text-gray-500 uppercase">{children}</label>
)

export const TextInput: FC<{
    value: string
    placeholder?: string
    onChange: (value: string) => void
}> = ({ value, placeholder, onChange }) => (
    <input
        type="text"
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded border border-gray-200 px-2 py-1.5 text-sm outline-none focus:border-blue-400"
    />
)

export const NumberInput: FC<{
    value: number | undefined
    placeholder?: string
    onChange: (value: number | undefined) => void
}> = ({ value, placeholder, onChange }) => (
    <input
        type="number"
        value={value ?? ''}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value === '' ? undefined : Number(e.target.value))}
        className="w-full rounded border border-gray-200 px-2 py-1.5 text-sm outline-none focus:border-blue-400"
    />
)

export const Checkbox: FC<{
    label: string
    checked: boolean
    onChange: (checked: boolean) => void
}> = ({ label, checked, onChange }) => (
    <label className="flex items-center gap-2 text-sm text-gray-700">
        <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
        {label}
    </label>
)
