'use client'

import type {
    ArrayViewProps,
    BooleanViewProps,
    DateViewProps,
    ErrorProps,
    FileViewProps,
    NumberViewProps,
    SectionViewProps,
    SelectViewProps,
    StringViewProps,
    ViewerComponentMap,
} from '@bluprynt/forms-react'

// ── Field label ──

const FieldLabel = ({ label, description }: { label: string; description?: string }) => (
    <div className="mb-1">
        <span className="text-sm font-medium text-gray-700">{label}</span>
        {description && <p className="text-xs text-gray-500">{description}</p>}
    </div>
)

// ── String ──

const StringView = ({ field, value }: StringViewProps) => (
    <div className="mb-4">
        <FieldLabel label={field.label} description={field.description} />
        <div className="rounded-md border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-900">
            {value ?? <span className="text-gray-400 italic">—</span>}
        </div>
    </div>
)

// ── Number ──

const NumberView = ({ field, value }: NumberViewProps) => (
    <div className="mb-4">
        <FieldLabel label={field.label} description={field.description} />
        <div className="rounded-md border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-900">
            {value !== undefined ? String(value) : <span className="text-gray-400 italic">—</span>}
        </div>
    </div>
)

// ── Boolean ──

const BooleanView = ({ field, value }: BooleanViewProps) => (
    <div className="mb-4">
        <FieldLabel label={field.label} description={field.description} />
        <div className="rounded-md border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-900">
            {value !== undefined ? value ? 'Yes' : 'No' : <span className="text-gray-400 italic">—</span>}
        </div>
    </div>
)

// ── Date ──

const DateView = ({ field, value }: DateViewProps) => (
    <div className="mb-4">
        <FieldLabel label={field.label} description={field.description} />
        <div className="rounded-md border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-900">
            {value ?? <span className="text-gray-400 italic">—</span>}
        </div>
    </div>
)

// ── Select ──

const SelectView = ({ field, value, options }: SelectViewProps) => {
    const selected = options.find((o) => o.value === value)
    return (
        <div className="mb-4">
            <FieldLabel label={field.label} description={field.description} />
            <div className="rounded-md border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-900">
                {selected ? selected.label : <span className="text-gray-400 italic">—</span>}
            </div>
        </div>
    )
}

// ── Array ──

const ArrayView = ({ field, value, children }: ArrayViewProps) => (
    <div className="mb-4">
        <FieldLabel label={field.label} description={field.description} />
        {value && value.length > 0 ? (
            <div className="space-y-2 rounded-md border border-gray-200 bg-gray-50 p-3">{children}</div>
        ) : (
            <div className="rounded-md border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-400 italic">
                No items
            </div>
        )}
    </div>
)

// ── File ──

const FileView = ({ field, value }: FileViewProps) => (
    <div className="mb-4">
        <FieldLabel label={field.label} description={field.description} />
        <div className="rounded-md border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-900">
            {value ? (
                <div>
                    <a
                        href={value.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:underline">
                        {value.name}
                    </a>
                    <p className="text-xs text-gray-500">
                        {value.mimeType} · {value.size.toLocaleString()} bytes
                    </p>
                </div>
            ) : (
                <span className="text-gray-400 italic">—</span>
            )}
        </div>
    </div>
)

// ── Section ──

const SectionView = ({ section, children }: SectionViewProps) => (
    <div className="mb-6 rounded-lg border border-gray-300 bg-white p-4">
        <h3 className="mb-1 text-base font-semibold text-gray-800">{section.title}</h3>
        {section.description && <p className="mb-3 text-sm text-gray-500">{section.description}</p>}
        <div>{children}</div>
    </div>
)

// ── Error ──

const ErrorView = ({ errors }: ErrorProps) => (
    <div className="-mt-3 mb-4">
        {errors.map((err, i) => (
            <p key={i} className="text-xs text-red-600">
                {err.message}
            </p>
        ))}
    </div>
)

// ── Exported map ──

export const viewerComponents: ViewerComponentMap = {
    string: StringView,
    number: NumberView,
    boolean: BooleanView,
    date: DateView,
    select: SelectView,
    array: ArrayView,
    file: FileView,
    section: SectionView,
    error: ErrorView,
}
