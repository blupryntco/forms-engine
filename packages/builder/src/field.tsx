import type { FC } from 'react'

import type { ContentItem, FieldContentItem, FieldType } from '@bluprynt/forms-core'
import { useSortable } from '@dnd-kit/react/sortable'

import { SORTABLE_CONFIG } from './core/constants'
import type { NewContentItem } from './core/types'

export type FieldRenderProps = {
    ref: (element: Element | null) => void
    handleRef: (element: Element | null) => void
    id: number
    depth: number
    index: number
    parentId: number | null
    type: FieldType
    item: FieldContentItem
    isDragging: boolean
    isSelected: boolean
    onAdd: (item: NewContentItem) => number
    onRemove: () => void
    onChange: (item: ContentItem) => void
}

type FieldProps = {
    id: number
    depth: number
    index: number
    parentId: number | null
    type: FieldType
    item: FieldContentItem
    isSelected: boolean
    component: FC<FieldRenderProps>
    onAdd: (item: NewContentItem) => number
    onRemove: () => void
    onChange: (item: ContentItem) => void
}

export const Field: FC<FieldProps> = ({
    id,
    depth,
    index,
    parentId,
    type,
    item,
    isSelected,
    component: Component,
    onAdd,
    onRemove,
    onChange,
}) => {
    const { ref, handleRef, isDragSource } = useSortable({
        ...SORTABLE_CONFIG,
        id,
        index,
        data: { depth, parentId },
    })

    return (
        <Component
            ref={ref}
            handleRef={handleRef}
            id={id}
            depth={depth}
            index={index}
            parentId={parentId}
            type={type}
            item={item}
            isDragging={isDragSource}
            isSelected={isSelected}
            onAdd={onAdd}
            onRemove={onRemove}
            onChange={onChange}
        />
    )
}
