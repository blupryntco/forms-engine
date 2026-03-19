import { getDragDepth, getProjection } from './projection'
import type { TreeItem } from './types'

const item = (overrides: Partial<TreeItem> & { id: number }): TreeItem => ({
    type: 'string',
    parentId: null,
    depth: 0,
    index: 0,
    item: undefined,
    ...overrides,
})

describe('getDragDepth', () => {
    it('returns 0 for zero offset', () => {
        expect(getDragDepth(0, 40)).toBe(0)
    })

    it('returns exact depth for exact multiples', () => {
        expect(getDragDepth(80, 40)).toBe(2)
    })

    it('rounds to nearest depth', () => {
        expect(getDragDepth(50, 40)).toBe(1)
        expect(getDragDepth(19, 40)).toBe(0)
        expect(getDragDepth(21, 40)).toBe(1)
    })

    it('returns negative depth for negative offset', () => {
        expect(getDragDepth(-40, 40)).toBe(-1)
    })
})

describe('getProjection', () => {
    it('returns zero fallback when target not found', () => {
        const items = [item({ id: 1 })]
        const result = getProjection(items, 999, 0, 3)
        expect(result).toEqual({ depth: 0, maxDepth: 0, minDepth: 0, parentId: null })
    })

    it('clamps depth to maxDepth from field previousItem', () => {
        // previousItem is field at depth 1, so maxDepth = 1
        const items = [item({ id: 1, depth: 1, type: 'string' }), item({ id: 2, depth: 0 })]
        const result = getProjection(items, 2, 5, 3)
        expect(result.depth).toBe(1)
        expect(result.maxDepth).toBe(1)
    })

    it('allows nesting inside section previousItem', () => {
        // previousItem is section at depth 0, target at depth 0
        // maxDepth = min(target.depth+1, prev.depth+1) = min(1, 1) = 1
        const items = [item({ id: 1, depth: 0, type: 'section' }), item({ id: 2, depth: 0 })]
        const result = getProjection(items, 2, 1, 3)
        expect(result.depth).toBe(1)
    })

    it('enforces minDepth from nextItem', () => {
        // nextItem at depth 2 forces minDepth = 2
        const items = [item({ id: 1, depth: 2, type: 'section' }), item({ id: 2, depth: 2 }), item({ id: 3, depth: 2 })]
        const result = getProjection(items, 2, 0, 3)
        expect(result.depth).toBe(2)
        expect(result.minDepth).toBe(2)
    })

    it('enforces maxAllowedDepth', () => {
        const items = [item({ id: 1, depth: 0, type: 'section' }), item({ id: 2, depth: 0 })]
        // maxDepth allows 1, but maxAllowedDepth is 0
        const result = getProjection(items, 2, 1, 0)
        expect(result.depth).toBe(0)
    })

    it('returns null parentId at depth 0', () => {
        const items = [item({ id: 1, depth: 0 })]
        const result = getProjection(items, 1, 0, 3)
        expect(result.parentId).toBeNull()
    })

    it('returns previousItem parentId when same depth', () => {
        const items = [item({ id: 1, depth: 1, parentId: 10, type: 'string' }), item({ id: 2, depth: 1 })]
        const result = getProjection(items, 2, 1, 3)
        expect(result.parentId).toBe(10)
    })

    it('returns previousItem id as parent when nesting into section', () => {
        const items = [item({ id: 10, depth: 0, type: 'section' }), item({ id: 2, depth: 0 })]
        const result = getProjection(items, 2, 1, 3)
        expect(result.parentId).toBe(10)
    })

    it('returns previousItem parentId when trying to nest under field', () => {
        // depth > previousItem.depth but previousItem is a field
        const items = [
            item({ id: 10, depth: 0, type: 'section' }),
            item({ id: 11, depth: 1, parentId: 10, type: 'string' }),
            item({ id: 2, depth: 1 }),
        ]
        // projectedDepth=2, maxDepth = prev(field@1).depth = 1, so depth clamped to 1
        // same depth as prev => parentId = prev.parentId = 10
        const result = getProjection(items, 2, 2, 3)
        expect(result.parentId).toBe(10)
    })

    it('walks back ancestors when depth < previousItem depth', () => {
        const items = [
            item({ id: 100, depth: 0, type: 'section', parentId: null }),
            item({ id: 101, depth: 1, parentId: 100, type: 'section' }),
            item({ id: 102, depth: 2, parentId: 101, type: 'string' }),
            item({ id: 2, depth: 0 }),
        ]
        // target is id:2, projectedDepth=0, previous is id:102 at depth 2
        // maxDepth = prev.depth = 2, minDepth = nextItem? undefined => 0
        // depth = 0 (requested)
        const result = getProjection(items, 2, 0, 3)
        expect(result.depth).toBe(0)
        expect(result.parentId).toBeNull()
    })

    it('returns maxDepth 0 when no previousItem', () => {
        const items = [item({ id: 1, depth: 0 })]
        const result = getProjection(items, 1, 2, 3)
        expect(result.maxDepth).toBe(0)
        expect(result.depth).toBe(0)
    })

    it('returns minDepth 0 when no nextItem', () => {
        const items = [item({ id: 1, depth: 0 })]
        const result = getProjection(items, 1, 0, 3)
        expect(result.minDepth).toBe(0)
    })
})
