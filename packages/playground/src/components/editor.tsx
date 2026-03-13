'use client'

import type {
    ArrayEditProps,
    BooleanEditProps,
    DateEditProps,
    EditorComponentMap,
    ErrorProps,
    FileEditProps,
    NumberEditProps,
    SectionEditProps,
    SelectEditProps,
    StringEditProps,
} from '@bluprynt/forms-viewer'

// ── Field label ──

const FieldLabel = ({ label, description }: { label: string; description?: string }) => (
    <div className="mb-1">
        <span className="text-sm font-medium text-gray-700">{label}</span>
        {description && <p className="text-xs text-gray-500">{description}</p>}
    </div>
)

// ── String ──

const StringEdit = ({ field, value, errors, onChange }: StringEditProps) => {
    const hasError = errors.length > 0
    return (
        <div className="mb-4">
            <FieldLabel label={field.label} description={field.description} />
            <input
                type="text"
                value={value ?? ''}
                onChange={(e) => onChange(e.target.value || undefined)}
                className={`w-full rounded-md border px-3 py-2 text-sm outline-none transition-colors ${
                    hasError
                        ? 'border-red-400 focus:border-red-500 focus:ring-1 focus:ring-red-500'
                        : 'border-gray-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500'
                }`}
            />
        </div>
    )
}

// ── Number ──

const NumberEdit = ({ field, value, errors, onChange }: NumberEditProps) => {
    const hasError = errors.length > 0
    return (
        <div className="mb-4">
            <FieldLabel label={field.label} description={field.description} />
            <input
                type="number"
                value={value !== undefined ? String(value) : ''}
                onChange={(e) => {
                    const raw = e.target.value
                    onChange(raw === '' ? undefined : Number(raw))
                }}
                className={`w-full rounded-md border px-3 py-2 text-sm outline-none transition-colors ${
                    hasError
                        ? 'border-red-400 focus:border-red-500 focus:ring-1 focus:ring-red-500'
                        : 'border-gray-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500'
                }`}
            />
        </div>
    )
}

// ── Boolean ──

const BooleanEdit = ({ field, value, errors, onChange }: BooleanEditProps) => {
    const hasError = errors.length > 0
    return (
        <div className="mb-4">
            <FieldLabel label={field.label} description={field.description} />
            <label
                className={`flex cursor-pointer items-center gap-2 rounded-md border px-3 py-2 text-sm ${
                    hasError ? 'border-red-400' : 'border-gray-300'
                }`}>
                <input
                    type="checkbox"
                    checked={value ?? false}
                    onChange={(e) => onChange(e.target.checked)}
                    className="h-4 w-4 rounded border-gray-300 text-blue-600"
                />
                <span className="text-gray-700">{value ? 'Yes' : 'No'}</span>
            </label>
        </div>
    )
}

// ── Date ──

const DateEdit = ({ field, value, errors, onChange }: DateEditProps) => {
    const hasError = errors.length > 0
    return (
        <div className="mb-4">
            <FieldLabel label={field.label} description={field.description} />
            <input
                type="date"
                value={value ?? ''}
                onChange={(e) => onChange(e.target.value || undefined)}
                className={`w-full rounded-md border px-3 py-2 text-sm outline-none transition-colors ${
                    hasError
                        ? 'border-red-400 focus:border-red-500 focus:ring-1 focus:ring-red-500'
                        : 'border-gray-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500'
                }`}
            />
        </div>
    )
}

// ── Select ──

const SelectEdit = ({ field, value, options, errors, onChange }: SelectEditProps) => {
    const hasError = errors.length > 0
    return (
        <div className="mb-4">
            <FieldLabel label={field.label} description={field.description} />
            <select
                value={value !== undefined ? String(value) : ''}
                onChange={(e) => {
                    const raw = e.target.value
                    if (raw === '') {
                        onChange(undefined)
                        return
                    }
                    const opt = options.find((o) => String(o.value) === raw)
                    onChange(opt ? opt.value : raw)
                }}
                className={`w-full rounded-md border px-3 py-2 text-sm outline-none transition-colors ${
                    hasError
                        ? 'border-red-400 focus:border-red-500 focus:ring-1 focus:ring-red-500'
                        : 'border-gray-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500'
                }`}>
                <option value="">— Select —</option>
                {options.map((opt) => (
                    <option key={String(opt.value)} value={String(opt.value)}>
                        {opt.label}
                    </option>
                ))}
            </select>
        </div>
    )
}

// ── Array ──

const ArrayEdit = ({ field, value, children, errors, onAddItem, onRemoveItem }: ArrayEditProps) => {
    const hasError = errors.length > 0
    const items = value ?? []
    return (
        <div className="mb-4">
            <FieldLabel label={field.label} description={field.description} />
            <div className={`rounded-md border p-3 ${hasError ? 'border-red-400' : 'border-gray-300'}`}>
                {items.length > 0 ? (
                    <div className="space-y-2">
                        {Array.from({ length: items.length }, (_, i) => (
                            <div key={i} className="flex items-start gap-2">
                                <div className="min-w-0 flex-1">{(children as React.ReactNode[])?.[i] ?? null}</div>
                                <button
                                    type="button"
                                    onClick={() => onRemoveItem(i)}
                                    className="mt-1 shrink-0 rounded px-2 py-1 text-xs text-red-600 hover:bg-red-50">
                                    Remove
                                </button>
                            </div>
                        ))}
                    </div>
                ) : (
                    <p className="text-sm text-gray-400 italic">No items</p>
                )}
                <button
                    type="button"
                    onClick={onAddItem}
                    className="mt-3 rounded-md bg-blue-50 px-3 py-1.5 text-xs font-medium text-blue-700 hover:bg-blue-100">
                    + Add item
                </button>
            </div>
        </div>
    )
}

// ── File ──

const FileEdit = ({ field, value, errors, onChange }: FileEditProps) => {
    const hasError = errors.length > 0
    return (
        <div className="mb-4">
            <FieldLabel label={field.label} description={field.description} />
            {value ? (
                <div
                    className={`flex items-center justify-between rounded-md border px-3 py-2 text-sm ${
                        hasError ? 'border-red-400' : 'border-gray-300'
                    }`}>
                    <span className="truncate text-gray-900">{value.name}</span>
                    <button
                        type="button"
                        onClick={() => onChange(undefined)}
                        className="shrink-0 rounded px-2 py-1 text-xs text-red-600 hover:bg-red-50">
                        Remove
                    </button>
                </div>
            ) : (
                <label
                    className={`flex cursor-pointer flex-col items-center justify-center rounded-md border-2 border-dashed px-3 py-4 text-sm transition-colors ${
                        hasError ? 'border-red-400 hover:border-red-500' : 'border-gray-300 hover:border-blue-400'
                    }`}>
                    <span className="text-gray-500">Click to select a file</span>
                    <input
                        type="file"
                        className="hidden"
                        onChange={(e) => {
                            const file = e.target.files?.[0]
                            if (!file) return
                            onChange({
                                name: file.name,
                                mimeType: file.type,
                                size: file.size,
                                url: `https://storage.example.com/files/${crypto.randomUUID()}/${file.name}`,
                            })
                        }}
                    />
                </label>
            )}
        </div>
    )
}

// ── Section ──

const SectionEdit = ({ section, children }: SectionEditProps) => (
    <div className="mb-6 rounded-lg border border-gray-300 bg-white p-4">
        <h3 className="mb-1 text-base font-semibold text-gray-800">{section.title}</h3>
        {section.description && <p className="mb-3 text-sm text-gray-500">{section.description}</p>}
        <div>{children}</div>
    </div>
)

// ── Error ──

const ErrorEdit = ({ errors }: ErrorProps) => (
    <div className="-mt-3 mb-4">
        {errors.map((err, i) => (
            <p key={i} className="text-xs text-red-600">
                {err.message}
            </p>
        ))}
    </div>
)

// ── Exported map ──

export const editorComponents: EditorComponentMap = {
    string: StringEdit,
    number: NumberEdit,
    boolean: BooleanEdit,
    date: DateEdit,
    select: SelectEdit,
    array: ArrayEdit,
    file: FileEdit,
    section: SectionEdit,
    error: ErrorEdit,
}
