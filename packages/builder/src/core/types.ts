import type { ContentItem, ContentItemType, FieldContentItem, SectionContentItem } from '@bluprynt/forms-core'

/**
 * A `ContentItem` without an `id` — used when adding new items (id is auto-generated).
 */
export type NewContentItem = Omit<FieldContentItem, 'id'> | Omit<SectionContentItem, 'id'>

/**
 * Flat representation of a content item within the sortable tree.
 * Carries depth, parent reference, and the original `ContentItem` for rendering and reconstruction.
 */
export type TreeItem = {
    id: number
    type: ContentItemType | 'add-placeholder'
    parentId: number | null
    depth: number
    index: number
    collapsed?: boolean
    item: ContentItem | undefined
    onChange?: (item: ContentItem) => void
}

/**
 * Type guard that narrows a `TreeItem` to a section (`type` is `'section'`, `item` is `SectionContentItem`).
 */
export const isSection = (item: TreeItem): item is TreeItem & { type: 'section'; item: SectionContentItem } =>
    item.type === 'section'

/**
 * Type guard that narrows a `TreeItem` to a field (`type` is not `'section'`, `item` is `FieldContentItem`).
 */
export const isField = (
    item: TreeItem,
): item is TreeItem & { type: Exclude<ContentItemType, 'section'>; item: FieldContentItem } =>
    item.type !== 'section' && item.type !== 'add-placeholder'

/**
 * Type guard that narrows a `TreeItem` to an "add" placeholder.
 */
export const isAddPlaceholder = (item: TreeItem): item is TreeItem & { type: 'add-placeholder'; item: undefined } =>
    item.type === 'add-placeholder'
