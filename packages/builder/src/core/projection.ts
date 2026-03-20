import type { TreeItem } from './types'

/**
 * Converts a horizontal pixel offset into a depth level based on indentation width.
 */
export const getDragDepth = (offset: number, indentationWidth: number): number => Math.round(offset / indentationWidth)

/**
 * Returns the maximum allowed nesting depth when dragging above a target item.
 * Only sections can accept nested children.
 */
const getMaxDepth = (targetItem: TreeItem, previousItem: TreeItem | undefined): number => {
    if (!previousItem) return 0
    if (previousItem.type !== 'section') {
        return previousItem.depth
    }
    return Math.min(targetItem.depth + 1, previousItem.depth + 1)
}

/**
 * Returns the minimum depth based on the next sibling item.
 * If there is no next item, the minimum depth is 0 (root level).
 */
const getMinDepth = (nextItem: TreeItem | undefined): number => (nextItem ? nextItem.depth : 0)

/**
 * Calculates the projected depth and parent for a dragged item relative to a target position.
 * Clamps depth between min/max bounds and enforces `maxAllowedDepth`.
 */
export const getProjection = (
    items: TreeItem[],
    targetId: number,
    projectedDepth: number,
    maxAllowedDepth: number,
): { depth: number; maxDepth: number; minDepth: number; parentId: number | null } => {
    const targetItemIndex = items.findIndex(({ id }) => id === targetId)
    const previousItem = items[targetItemIndex - 1]
    const targetItem = items[targetItemIndex]
    const nextItem = items[targetItemIndex + 1]
    if (!targetItem) return { depth: 0, maxDepth: 0, minDepth: 0, parentId: null }

    const maxDepth = getMaxDepth(targetItem, previousItem)
    const minDepth = getMinDepth(nextItem)
    let depth = projectedDepth

    if (depth >= maxDepth) {
        depth = maxDepth
    } else if (depth < minDepth) {
        depth = minDepth
    }

    if (depth > maxAllowedDepth) {
        depth = maxAllowedDepth
    }

    const getParentId = (): number | null => {
        if (depth === 0 || !previousItem) {
            return null
        }

        if (depth === previousItem.depth) {
            return previousItem.parentId
        }

        if (depth > previousItem.depth) {
            if (previousItem.type !== 'section') {
                return previousItem.parentId
            }
            return previousItem.id
        }

        const newParent = items
            .slice(0, targetItemIndex)
            .reverse()
            .find((item) => item.depth === depth)?.parentId

        return newParent ?? null
    }

    return { depth, maxDepth, minDepth, parentId: getParentId() }
}
