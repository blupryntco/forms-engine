import { type FC } from 'react'

import type { ContentItem, SectionContentItem } from '@bluprynt/forms-core'
import { useSortable } from '@dnd-kit/react/sortable'

import { SORTABLE_CONFIG } from './core/constants'
import type { NewContentItem } from './core/types'

export type SectionRenderProps = {
    ref: (element: Element | null) => void
    handleRef: (element: Element | null) => void
    id: number
    depth: number
    index: number
    parentId: number | null
    item: SectionContentItem
    isDragging: boolean
    isSelected: boolean
    onAdd: (item: NewContentItem) => number
    onRemove: () => void
    onChange: (item: ContentItem) => void
}

type SectionProps = {
    id: number
    depth: number
    index: number
    parentId: number | null
    item: SectionContentItem
    isSelected: boolean
    component: FC<SectionRenderProps>
    onAdd: (item: NewContentItem) => number
    onRemove: () => void
    onChange: (item: ContentItem) => void
}

export const Section: FC<SectionProps> = ({
    id,
    depth,
    index,
    parentId,
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
            item={item}
            isDragging={isDragSource}
            isSelected={isSelected}
            onAdd={onAdd}
            onRemove={onRemove}
            onChange={onChange}
        />
    )
}
