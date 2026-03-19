import type { FC } from 'react'

import type { SectionRenderProps } from '@bluprynt/forms-builder'
import type { SectionContentItem } from '@bluprynt/forms-core'
import { useSetAtom } from 'jotai'
import { FolderOpen, GripVertical, Pencil, X } from 'lucide-react'

import { editorModeAtom, selectedItemIdAtom } from '@/features/field-editor'

const INDENTATION = 40

export const BuilderSection: FC<SectionRenderProps> = ({
    ref,
    handleRef,
    id,
    isDragging,
    isSelected,
    depth,
    item,
    onRemove,
    onChange,
}) => {
    const setSelectedItemId = useSetAtom(selectedItemIdAtom)
    const setEditorMode = useSetAtom(editorModeAtom)

    return (
        <li
            ref={ref}
            className={`group flex items-center gap-2 rounded-lg border bg-white px-3 py-3 ${isSelected ? 'border-blue-500' : 'border-gray-200'} ${isDragging ? 'opacity-40' : ''}`}
            style={{ marginLeft: depth * INDENTATION }}>
            <div ref={handleRef} className="flex cursor-grab items-center text-gray-400 hover:text-gray-600">
                <GripVertical size={14} />
            </div>

            <span className="flex shrink-0 flex-col items-center gap-0.5 rounded bg-gray-100 px-1.5 py-1 text-gray-500 w-12 overflow-hidden">
                <FolderOpen className="h-3.5 w-3.5" />
                <span className="text-[8px] uppercase leading-none tracking-wide">Section</span>
            </span>

            <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                <div className="flex items-center gap-2">
                    <input
                        type="text"
                        value={item.title}
                        placeholder="Section title"
                        onChange={(e) => onChange({ ...(item as SectionContentItem), title: e.target.value })}
                        className="min-w-0 flex-1 truncate border-none bg-transparent text-sm font-medium outline-none focus:ring-0"
                    />
                </div>
                <input
                    type="text"
                    value={item.description ?? ''}
                    placeholder="Description"
                    onChange={(e) =>
                        onChange({ ...(item as SectionContentItem), description: e.target.value || undefined })
                    }
                    className="min-w-0 border-none bg-transparent text-xs text-gray-400 outline-none placeholder:text-gray-300 focus:ring-0"
                />
            </div>

            <div className="flex shrink-0 items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                <button
                    type="button"
                    className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                    onClick={() => {
                        setEditorMode('edit')
                        setSelectedItemId(id)
                    }}
                    aria-label="Edit section">
                    <Pencil size={14} />
                </button>
                {onRemove && (
                    <button
                        type="button"
                        className="rounded p-1 text-gray-400 hover:bg-red-50 hover:text-red-500"
                        onClick={onRemove}
                        aria-label="Remove section">
                        <X size={14} />
                    </button>
                )}
            </div>
        </li>
    )
}
