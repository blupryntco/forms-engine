import type { FC, ReactNode } from 'react'

import type { FieldRenderProps } from '@bluprynt/forms-builder'
import type {
    ArrayValidation,
    DateValidation,
    FieldContentItem,
    FieldType,
    NumberValidation,
    StringValidation,
    TypeSpecificValidation,
} from '@bluprynt/forms-core'
import { useSetAtom } from 'jotai'
import { Calendar, CheckSquare, ChevronDown, GripVertical, Hash, List, Paperclip, Pencil, Type, X } from 'lucide-react'

import { editorModeAtom, selectedItemIdAtom } from '@/features/field-editor'
import { Badge } from '@/shared/ui/badge'

const INDENTATION = 40

const TYPE_ICONS: Record<FieldType, FC<{ className?: string }>> = {
    string: Type,
    number: Hash,
    boolean: CheckSquare,
    date: Calendar,
    select: ChevronDown,
    array: List,
    file: Paperclip,
}

const TYPE_LABELS: Record<FieldType, string> = {
    string: 'Text',
    number: 'Number',
    boolean: 'Boolean',
    date: 'Date',
    select: 'Select',
    array: 'Array',
    file: 'File',
}

const getValidationBadges = (type: FieldType, validation: TypeSpecificValidation | undefined): ReactNode[] => {
    if (!validation) return []

    const badges: ReactNode[] = []

    if ('required' in validation && validation.required) {
        badges.push(
            <Badge key="required" variant="secondary">
                required
            </Badge>,
        )
    }

    switch (type) {
        case 'string': {
            const v = validation as StringValidation
            if (v.minLength != null)
                badges.push(
                    <Badge key="minLen" variant="outline">
                        min len {v.minLength}
                    </Badge>,
                )
            if (v.maxLength != null)
                badges.push(
                    <Badge key="maxLen" variant="outline">
                        max len {v.maxLength}
                    </Badge>,
                )
            if (v.pattern)
                badges.push(
                    <Badge key="pattern" variant="outline">
                        pattern
                    </Badge>,
                )
            break
        }
        case 'number': {
            const v = validation as NumberValidation
            if (v.min != null)
                badges.push(
                    <Badge key="min" variant="outline">
                        ≥ {v.min}
                    </Badge>,
                )
            if (v.max != null)
                badges.push(
                    <Badge key="max" variant="outline">
                        ≤ {v.max}
                    </Badge>,
                )
            break
        }
        case 'date': {
            const v = validation as DateValidation
            if (v.minDate)
                badges.push(
                    <Badge key="minDate" variant="outline">
                        from {v.minDate}
                    </Badge>,
                )
            if (v.maxDate)
                badges.push(
                    <Badge key="maxDate" variant="outline">
                        to {v.maxDate}
                    </Badge>,
                )
            break
        }
        case 'array': {
            const v = validation as ArrayValidation
            if (v.minItems != null)
                badges.push(
                    <Badge key="minItems" variant="outline">
                        min {v.minItems} items
                    </Badge>,
                )
            if (v.maxItems != null)
                badges.push(
                    <Badge key="maxItems" variant="outline">
                        max {v.maxItems} items
                    </Badge>,
                )
            break
        }
        case 'boolean':
        case 'select':
        case 'file':
            break
    }

    return badges
}

export const BuilderItem: FC<FieldRenderProps> = ({
    ref,
    handleRef,
    id,
    isDragging,
    isSelected,
    type,
    depth,
    item,
    onRemove,
    onChange,
    onAdd: _onAdd,
}) => {
    const setSelectedItemId = useSetAtom(selectedItemIdAtom)
    const setEditorMode = useSetAtom(editorModeAtom)
    const Icon = TYPE_ICONS[type]
    const badges = getValidationBadges(type, item.validation)

    return (
        <li
            ref={ref}
            className={`group flex flex-col gap-0.5 rounded-lg border bg-white px-3 py-2 ${isSelected ? 'border-blue-500' : 'border-gray-200'} ${isDragging ? 'opacity-40' : ''}`}
            style={{ marginLeft: depth * INDENTATION }}>
            <div className="flex items-center gap-2">
                <div ref={handleRef} className="flex cursor-grab items-center text-gray-400 hover:text-gray-600">
                    <GripVertical size={14} />
                </div>

                <span className="flex shrink-0 flex-col items-center gap-0.5 rounded bg-gray-100 px-1.5 py-1 text-gray-500 w-12 overflow-hidden">
                    <Icon className="h-3.5 w-3.5" />
                    <span className="text-[8px] uppercase leading-none tracking-tighter truncate">
                        {TYPE_LABELS[type]}
                    </span>
                </span>

                <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                    <div className="flex items-center gap-2">
                        <input
                            type="text"
                            value={item.label}
                            placeholder="Field label"
                            onChange={(e) => onChange({ ...(item as FieldContentItem), label: e.target.value })}
                            className="min-w-0 flex-1 truncate border-none bg-transparent text-sm outline-none focus:ring-0"
                        />
                    </div>
                    <input
                        type="text"
                        value={item.description ?? ''}
                        placeholder="Description"
                        onChange={(e) =>
                            onChange({ ...(item as FieldContentItem), description: e.target.value || undefined })
                        }
                        className="min-w-0 border-none bg-transparent text-xs text-gray-400 outline-none placeholder:text-gray-300 focus:ring-0"
                    />
                </div>

                <div className="flex shrink-0 items-center gap-1 opacity-40 transition-opacity group-hover:opacity-100">
                    <button
                        type="button"
                        className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                        onClick={() => {
                            setEditorMode('edit')
                            setSelectedItemId(id)
                        }}
                        aria-label="Edit field">
                        <Pencil size={14} />
                    </button>
                    {onRemove && (
                        <button
                            type="button"
                            className="rounded p-1 text-gray-400 hover:bg-red-50 hover:text-red-500"
                            onClick={onRemove}
                            aria-label="Remove field">
                            <X size={14} />
                        </button>
                    )}
                </div>
            </div>
            <div className="pl-19">
                {badges.length > 0 && <div className="flex flex-wrap gap-1 pt-0.5">{badges}</div>}
            </div>
        </li>
    )
}
