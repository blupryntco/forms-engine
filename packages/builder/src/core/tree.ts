import type { ContentItem } from '@bluprynt/forms-core'

import type { TreeItem } from './types'

let placeholderIdCounter = -1000

/**
 * Resets the placeholder id counter. Call before each full flatten to ensure stable ids per flatten pass.
 */
const resetPlaceholderIds = () => {
    placeholderIdCounter = -1000
}

const nextPlaceholderId = () => --placeholderIdCounter

/**
 * Flattens a nested content tree into a flat list of items with depth and parent info.
 * Each item preserves its position metadata for rendering in a sortable tree.
 * Appends an "add-placeholder" at the end of each section and at the root level.
 */
export const flattenTree = (items: ContentItem[], parentId: number | null = null, depth = 0): TreeItem[] => {
    if (parentId === null) resetPlaceholderIds()

    const result = items.reduce<TreeItem[]>((result, current, index) => {
        const isSection = current.type === 'section'

        result.push({
            id: current.id,
            type: current.type,
            parentId,
            depth,
            index,
            item: current,
        })

        if (isSection) {
            const children = (current as { content: ContentItem[] }).content
            result.push(...flattenTree(children, current.id, depth + 1))
        }

        return result
    }, [])

    result.push({
        id: nextPlaceholderId(),
        type: 'add-placeholder',
        parentId,
        depth,
        index: items.length,
        item: undefined,
    })

    return result
}

/**
 * Collects all transitive descendant ids for a given parent from a flat item list.
 */
export const getDescendants = (items: TreeItem[], parentId: number): Set<number> => {
    const directChildren = items.filter((item) => item.parentId === parentId)

    return directChildren.reduce((result, child) => {
        result.add(child.id)
        for (const descendant of getDescendants(items, child.id)) {
            result.add(descendant)
        }
        return result
    }, new Set<number>())
}
