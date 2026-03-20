import type { FC } from 'react'

import type { AddPlaceholderRenderProps } from '@bluprynt/forms-builder'
import { useSetAtom } from 'jotai'

import { editorModeAtom, selectedItemIdAtom } from '@/features/field-editor'
import { Button } from '@/shared/ui/button'
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuGroup,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/shared/ui/dropdown'

const INDENTATION = 40

const FIELD_TYPES = [
    { type: 'string', label: 'String' },
    { type: 'number', label: 'Number' },
    { type: 'boolean', label: 'Boolean' },
    { type: 'date', label: 'Date' },
    { type: 'select', label: 'Select' },
    { type: 'array', label: 'Array' },
    { type: 'file', label: 'File' },
] as const

export const BuilderAddPlaceholder: FC<AddPlaceholderRenderProps> = ({ depth, onAdd }) => {
    const setSelectedItemId = useSetAtom(selectedItemIdAtom)
    const setEditorMode = useSetAtom(editorModeAtom)

    const handleAdd = (type: string) => {
        const id = onAdd(
            type === 'section'
                ? { type: 'section', title: '', content: [] }
                : { type: type as (typeof FIELD_TYPES)[number]['type'], label: '' },
        )
        setEditorMode('add')
        setSelectedItemId(id)
    }

    return (
        <li
            className="flex items-center gap-2 rounded-lg border border-dashed border-gray-300 px-3 py-2 text-gray-400 transition-colors hover:border-gray-400 hover:text-gray-600"
            style={{ marginLeft: depth * INDENTATION }}>
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button
                        variant="ghost"
                        size="sm"
                        className="flex w-full items-center gap-2 text-sm text-inherit cursor-pointer">
                        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded text-xs">+</span>
                        <span>Add field</span>
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start">
                    <DropdownMenuGroup>
                        <DropdownMenuLabel>Field types</DropdownMenuLabel>
                        {FIELD_TYPES.map(({ type, label }) => (
                            <DropdownMenuItem key={type} onSelect={() => handleAdd(type)}>
                                {label}
                            </DropdownMenuItem>
                        ))}
                    </DropdownMenuGroup>
                    <DropdownMenuSeparator />
                    <DropdownMenuGroup>
                        <DropdownMenuItem onSelect={() => handleAdd('section')}>Section</DropdownMenuItem>
                    </DropdownMenuGroup>
                </DropdownMenuContent>
            </DropdownMenu>
        </li>
    )
}
