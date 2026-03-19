import type { ContentItemType, FieldContentItem, SectionContentItem } from '@bluprynt/forms-core'

import { isAddPlaceholder, isField, isSection, type TreeItem } from './types'

const makeItem = (
    type: ContentItemType | 'add-placeholder',
    item?: FieldContentItem | SectionContentItem,
): TreeItem => ({
    id: 1,
    type,
    parentId: null,
    depth: 0,
    index: 0,
    item: item as TreeItem['item'],
})

describe('isSection', () => {
    it('returns true for section type', () => {
        const item = makeItem('section', { id: 1, type: 'section', title: 'S', content: [] })
        expect(isSection(item)).toBe(true)
    })

    it.each<ContentItemType | 'add-placeholder'>([
        'string',
        'number',
        'boolean',
        'date',
        'select',
        'array',
        'file',
        'add-placeholder',
    ])('returns false for %s type', (type) => {
        expect(isSection(makeItem(type))).toBe(false)
    })
})

describe('isField', () => {
    it.each<ContentItemType>([
        'string',
        'number',
        'boolean',
        'date',
        'select',
        'array',
        'file',
    ])('returns true for %s type', (type) => {
        const item = makeItem(type, { id: 1, type, label: 'F' } as FieldContentItem)
        expect(isField(item)).toBe(true)
    })

    it('returns false for section type', () => {
        expect(isField(makeItem('section'))).toBe(false)
    })

    it('returns false for add-placeholder type', () => {
        expect(isField(makeItem('add-placeholder'))).toBe(false)
    })
})

describe('isAddPlaceholder', () => {
    it('returns true for add-placeholder type', () => {
        const item = makeItem('add-placeholder')
        item.item = undefined
        expect(isAddPlaceholder(item)).toBe(true)
    })

    it.each<ContentItemType>([
        'string',
        'number',
        'boolean',
        'date',
        'select',
        'array',
        'file',
        'section',
    ])('returns false for %s type', (type) => {
        expect(isAddPlaceholder(makeItem(type))).toBe(false)
    })
})

describe('type guards are mutually exclusive', () => {
    it.each<ContentItemType | 'add-placeholder'>([
        'string',
        'number',
        'boolean',
        'date',
        'select',
        'array',
        'file',
        'section',
        'add-placeholder',
    ])('exactly one guard matches for %s type', (type) => {
        const item = makeItem(type)
        const matches = [isSection(item), isField(item), isAddPlaceholder(item)].filter(Boolean)
        expect(matches).toHaveLength(1)
    })
})
