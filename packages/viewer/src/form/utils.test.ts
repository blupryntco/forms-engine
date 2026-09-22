import type { ContentItem, FieldContentItem, FieldValidationError } from '@bluprynt/forms-core'

import {
    findSection,
    getArrayField,
    getArrayObjField,
    getArrayObjItemErrors,
    getArrayObjRowErrors,
    getFieldErrors,
} from './utils'

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

describe('getArrayField — authoring metadata', () => {
    it('projects placeholder, answer_guidelines and reference_id from the item definition', () => {
        const arrayField: FieldContentItem = {
            id: 10,
            type: 'array',
            label: 'Tags',
            placeholder: 'array-level placeholder',
            item: {
                type: 'string',
                label: 'Tag',
                description: 'A single tag',
                placeholder: 'e.g. custody',
                answer_guidelines: 'One tag per entry',
                reference_id: 'KYI-7.2',
            },
        }

        expect(getArrayField(arrayField, 0)).toEqual(
            expect.objectContaining({
                id: 10,
                type: 'string',
                label: 'Tag',
                description: 'A single tag',
                placeholder: 'e.g. custody',
                answer_guidelines: 'One tag per entry',
                reference_id: 'KYI-7.2',
            }),
        )
    })

    it('leaves the metadata undefined when the item definition has none', () => {
        const arrayField: FieldContentItem = {
            id: 10,
            type: 'array',
            label: 'Tags',
            item: { type: 'string', label: 'Tag' },
        }
        const result = getArrayField(arrayField, 0)

        expect(result.placeholder).toBeUndefined()
        expect(result.answer_guidelines).toBeUndefined()
        expect(result.reference_id).toBeUndefined()
    })
})

describe('getArrayField with a static item', () => {
    it('projects a static item into a StaticFieldContentItem', () => {
        const arrayField: FieldContentItem = {
            id: 10,
            type: 'array',
            label: 'Notes',
            item: { type: 'static', text: 'Read the guidance', label: 'Note' },
        }

        expect(getArrayField(arrayField, 0)).toEqual(
            expect.objectContaining({ id: 10, type: 'static', text: 'Read the guidance', label: 'Note' }),
        )
    })
})

describe('getArrayObjField', () => {
    it('keeps the sub-field id and copies the metadata', () => {
        expect(
            getArrayObjField({
                id: 11,
                type: 'string',
                label: 'Name',
                description: 'As registered',
                placeholder: 'Acme Ltd',
                answer_guidelines: 'Use the registered name',
                reference_id: 'KYI-3.1',
                validation: { required: true },
            }),
        ).toEqual({
            id: 11,
            type: 'string',
            label: 'Name',
            description: 'As registered',
            placeholder: 'Acme Ltd',
            answer_guidelines: 'Use the registered name',
            reference_id: 'KYI-3.1',
            validation: { required: true },
            options: undefined,
        })
    })

    it('carries the options of a select sub-field', () => {
        const options = [{ value: 'ceo', label: 'CEO' }]
        expect(getArrayObjField({ id: 12, type: 'select', label: 'Role', options })).toEqual(
            expect.objectContaining({ options }),
        )
    })

    it('projects a static sub-field into a StaticFieldContentItem', () => {
        expect(getArrayObjField({ id: 13, type: 'static', text: 'Checked against filings' })).toEqual({
            id: 13,
            type: 'static',
            text: 'Checked against filings',
            label: undefined,
            description: undefined,
            placeholder: undefined,
            answer_guidelines: undefined,
            reference_id: undefined,
        })
    })
})

describe('getArrayObjItemErrors / getArrayObjRowErrors', () => {
    const fieldErrors = new Map<number, FieldValidationError[]>([
        [
            10,
            [
                { fieldId: 10, rule: 'MIN_ITEMS', message: 'Too few rows' },
                { fieldId: 10, rule: 'TYPE', message: 'Must be an object', itemIndex: 0 },
                { fieldId: 10, rule: 'REQUIRED', message: 'Name: Is required', itemIndex: 1, itemFieldId: 11 },
                { fieldId: 10, rule: 'MIN', message: 'Share: Too small', itemIndex: 1, itemFieldId: 12 },
            ],
        ],
    ])

    it('returns the errors of one cell', () => {
        expect(getArrayObjItemErrors(fieldErrors, 10, 1, 11)).toEqual([
            { fieldId: 10, rule: 'REQUIRED', message: 'Name: Is required', itemIndex: 1, itemFieldId: 11 },
        ])
    })

    it('returns an empty array for a cell with no errors', () => {
        expect(getArrayObjItemErrors(fieldErrors, 10, 0, 11)).toEqual([])
        expect(getArrayObjItemErrors(fieldErrors, 99, 0, 11)).toEqual([])
    })

    it('returns row-level errors without a sub-field', () => {
        expect(getArrayObjRowErrors(fieldErrors, 10, 0)).toEqual([
            { fieldId: 10, rule: 'TYPE', message: 'Must be an object', itemIndex: 0 },
        ])
        expect(getArrayObjRowErrors(fieldErrors, 10, 1)).toEqual([])
    })

    it('leaves field-level errors to getFieldErrors', () => {
        expect(getFieldErrors(fieldErrors, 10)).toEqual([{ fieldId: 10, rule: 'MIN_ITEMS', message: 'Too few rows' }])
    })
})
