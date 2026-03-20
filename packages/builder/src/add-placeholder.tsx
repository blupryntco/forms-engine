import type { FC } from 'react'

import type { ContentItem } from '@bluprynt/forms-core'

import type { NewContentItem } from './core/types'

export type AddPlaceholderRenderProps = {
    depth: number
    parentId: number | null
    onAdd: (item: NewContentItem) => number
    onChange: (id: number, item: ContentItem) => void
}

type AddPlaceholderProps = {
    depth: number
    parentId: number | null
    component: FC<AddPlaceholderRenderProps>
    onAdd: (item: NewContentItem) => number
    onChange: (id: number, item: ContentItem) => void
}

export const AddPlaceholder: FC<AddPlaceholderProps> = ({ depth, parentId, component: Component, onAdd, onChange }) => (
    <Component depth={depth} parentId={parentId} onAdd={onAdd} onChange={onChange} />
)
