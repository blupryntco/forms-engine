import type { ContentItem, FieldContentItem, SectionContentItem } from '@bluprynt/forms-core'

import { flattenTree, getDescendants } from './tree'

const field = (id: number, type: FieldContentItem['type'] = 'string'): FieldContentItem => ({
    id,
    type,
    label: `Field ${id}`,
})

const section = (id: number, content: ContentItem[] = []): SectionContentItem => ({
    id,
    type: 'section',
    title: `Section ${id}`,
    content,
})

describe('flattenTree', () => {
    it('returns a single add-placeholder for empty tree', () => {
        const result = flattenTree([])
        expect(result).toHaveLength(1)
        expect(result[0]?.type).toBe('add-placeholder')
        expect(result[0]?.parentId).toBeNull()
        expect(result[0]?.depth).toBe(0)
    })

    it('flattens flat field list', () => {
        const result = flattenTree([field(1), field(2)])
        // 2 fields + 1 root placeholder
        expect(result).toHaveLength(3)
        expect(result[0]).toMatchObject({ id: 1, type: 'string', depth: 0, parentId: null, index: 0 })
        expect(result[1]).toMatchObject({ id: 2, type: 'string', depth: 0, parentId: null, index: 1 })
        expect(result[2]?.type).toBe('add-placeholder')
    })

    it('flattens section with children', () => {
        const items: ContentItem[] = [section(10, [field(11), field(12)])]
        const result = flattenTree(items)

        // section + 2 children + section placeholder + root placeholder = 5
        expect(result).toHaveLength(5)
        expect(result[0]).toMatchObject({ id: 10, type: 'section', depth: 0, parentId: null })
        expect(result[1]).toMatchObject({ id: 11, depth: 1, parentId: 10, index: 0 })
        expect(result[2]).toMatchObject({ id: 12, depth: 1, parentId: 10, index: 1 })
        // section's add-placeholder
        expect(result[3]).toMatchObject({ type: 'add-placeholder', depth: 1, parentId: 10 })
        // root add-placeholder
        expect(result[4]).toMatchObject({ type: 'add-placeholder', depth: 0, parentId: null })
    })

    it('handles nested sections (3 levels deep)', () => {
        const items: ContentItem[] = [section(1, [section(2, [section(3, [field(4)])])])]
        const result = flattenTree(items)

        expect(result.find((i) => i.id === 1)?.depth).toBe(0)
        expect(result.find((i) => i.id === 2)?.depth).toBe(1)
        expect(result.find((i) => i.id === 3)?.depth).toBe(2)
        expect(result.find((i) => i.id === 4)?.depth).toBe(3)
    })

    it('preserves original item reference', () => {
        const f = field(1)
        const result = flattenTree([f])
        expect(result[0]?.item).toBe(f)
    })

    it('sets item to undefined for add-placeholders', () => {
        const result = flattenTree([])
        expect(result[0]?.item).toBeUndefined()
    })

    it('assigns negative ids to add-placeholders', () => {
        const result = flattenTree([section(1, [field(2)])])
        const placeholders = result.filter((i) => i.type === 'add-placeholder')
        expect(placeholders.length).toBeGreaterThanOrEqual(2)
        for (const p of placeholders) {
            expect(p.id).toBeLessThan(0)
        }
    })

    it('generates unique placeholder ids within a single flatten', () => {
        const items: ContentItem[] = [section(1, [field(2)]), section(3, [field(4)])]
        const result = flattenTree(items)
        const placeholderIds = result.filter((i) => i.type === 'add-placeholder').map((i) => i.id)
        expect(new Set(placeholderIds).size).toBe(placeholderIds.length)
    })

    it('resets placeholder ids across separate calls', () => {
        const r1 = flattenTree([field(1)])
        const r2 = flattenTree([field(2)])
        const p1 = r1.find((i) => i.type === 'add-placeholder')?.id
        const p2 = r2.find((i) => i.type === 'add-placeholder')?.id
        expect(p1).toBe(p2)
    })

    it('sets correct index for items within a section', () => {
        const items: ContentItem[] = [section(10, [field(11), field(12), field(13)])]
        const result = flattenTree(items)
        const children = result.filter((i) => i.parentId === 10 && i.type !== 'add-placeholder')
        expect(children.map((c) => c.index)).toEqual([0, 1, 2])
    })
})

describe('getDescendants', () => {
    it('returns empty set when parent has no children', () => {
        const items = flattenTree([field(1), field(2)])
        expect(getDescendants(items, 1).size).toBe(0)
    })

    it('returns direct children', () => {
        const items = flattenTree([section(1, [field(2), field(3)])])
        const desc = getDescendants(items, 1)
        expect(desc.has(2)).toBe(true)
        expect(desc.has(3)).toBe(true)
    })

    it('includes transitive descendants', () => {
        const items = flattenTree([section(1, [section(2, [field(3)])])])
        const desc = getDescendants(items, 1)
        expect(desc.has(2)).toBe(true)
        expect(desc.has(3)).toBe(true)
    })

    it('includes add-placeholder children', () => {
        const items = flattenTree([section(1, [field(2)])])
        const desc = getDescendants(items, 1)
        const hasPlaceholder = [...desc].some((id) => id < 0)
        expect(hasPlaceholder).toBe(true)
    })

    it('handles multiple branches', () => {
        const items = flattenTree([section(1, [section(2, [field(3)]), section(4, [field(5)])])])
        const desc = getDescendants(items, 1)
        expect(desc.has(2)).toBe(true)
        expect(desc.has(3)).toBe(true)
        expect(desc.has(4)).toBe(true)
        expect(desc.has(5)).toBe(true)
    })

    it('does not include the parent itself', () => {
        const items = flattenTree([section(1, [field(2)])])
        expect(getDescendants(items, 1).has(1)).toBe(false)
    })
})
