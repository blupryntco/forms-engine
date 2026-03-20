import type { ContentItem, FieldContentItem, FieldValidationError } from '@bluprynt/forms-core'

import { findSection, getArrayField, getFieldErrors } from './utils'

describe('getFieldErrors', () => {
    const fieldErrors = new Map<number, FieldValidationError[]>([
        [
            1,
            [
                { fieldId: 1, rule: 'REQUIRED', message: 'Value is required' },
                { fieldId: 1, rule: 'MIN_LENGTH', message: 'Too short', itemIndex: 0 },
                { fieldId: 1, rule: 'MIN_LENGTH', message: 'Too short', itemIndex: 1 },
            ],
        ],
        [2, [{ fieldId: 2, rule: 'REQUIRED', message: 'Value is required' }]],
    ])

    it('filters field-level errors (no itemIndex)', () => {
        const result = getFieldErrors(fieldErrors, 1)
        expect(result).toEqual([{ fieldId: 1, rule: 'REQUIRED', message: 'Value is required' }])
    })

    it('filters item-level errors by itemIndex', () => {
        const result = getFieldErrors(fieldErrors, 1, 0)
        expect(result).toEqual([{ fieldId: 1, rule: 'MIN_LENGTH', message: 'Too short', itemIndex: 0 }])
    })

    it('returns empty array for unknown field', () => {
        const result = getFieldErrors(fieldErrors, 999)
        expect(result).toEqual([])
    })
})

describe('findSection', () => {
    const items: ContentItem[] = [
        { id: 1, type: 'string', label: 'Name' },
        {
            id: 2,
            type: 'section',
            title: 'Outer',
            content: [
                { id: 3, type: 'string', label: 'Inner field' },
                {
                    id: 4,
                    type: 'section',
                    title: 'Nested',
                    content: [{ id: 5, type: 'number', label: 'Deep' }],
                },
            ],
        },
    ]

    it('finds a top-level section', () => {
        expect(findSection(items, 2)?.id).toBe(2)
    })

    it('finds a nested section', () => {
        expect(findSection(items, 4)?.id).toBe(4)
    })

    it('returns undefined for non-existent id', () => {
        expect(findSection(items, 99)).toBeUndefined()
    })

    it('returns undefined for field ids (not sections)', () => {
        expect(findSection(items, 1)).toBeUndefined()
    })
})

describe('getArrayField', () => {
    it('creates a synthetic FieldContentItem from array field + item def', () => {
        const arrayField: FieldContentItem = {
            id: 10,
            type: 'array',
            label: 'Tags',
            item: { type: 'string', label: 'Tag' },
        }
        const result = getArrayField(arrayField, 2)
        expect(result).toEqual({
            id: 10,
            type: 'string',
            label: 'Tag',
            description: undefined,
            validation: undefined,
            options: undefined,
        })
    })
})
