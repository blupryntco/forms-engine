/**
 * @jest-environment jsdom
 */

import { createElement, type FC, type ReactNode } from 'react'

import type {
    ContentItem,
    FieldContentItem,
    FieldValidationError,
    FormValues,
    SectionContentItem,
} from '@bluprynt/forms-core'
import { render, screen } from '@testing-library/react'

import { ROOT } from './constants'
import {
    filterErrorsForField,
    findSection,
    type RenderContentContext,
    renderContent,
    syntheticFieldDef,
} from './render-content'
import type { ViewerComponentMap } from './types'

// ── Stub components ──

const StubString: FC<Record<string, unknown>> = jest.fn((props) =>
    createElement(
        'div',
        { 'data-testid': `string-${(props.field as FieldContentItem).id}` },
        String(props.value ?? ''),
    ),
)

const StubNumber: FC<Record<string, unknown>> = jest.fn((props) =>
    createElement(
        'div',
        { 'data-testid': `number-${(props.field as FieldContentItem).id}` },
        String(props.value ?? ''),
    ),
)

const StubBoolean: FC<Record<string, unknown>> = jest.fn((props) =>
    createElement(
        'div',
        { 'data-testid': `boolean-${(props.field as FieldContentItem).id}` },
        String(props.value ?? ''),
    ),
)

const StubDate: FC<Record<string, unknown>> = jest.fn((props) =>
    createElement('div', { 'data-testid': `date-${(props.field as FieldContentItem).id}` }, String(props.value ?? '')),
)

const StubSelect: FC<Record<string, unknown>> = jest.fn((props) =>
    createElement(
        'div',
        { 'data-testid': `select-${(props.field as FieldContentItem).id}` },
        String(props.value ?? ''),
    ),
)

const StubArray: FC<Record<string, unknown>> = jest.fn((props) =>
    createElement(
        'div',
        { 'data-testid': `array-${(props.field as FieldContentItem).id}` },
        props.children as ReactNode,
    ),
)

const StubFile: FC<Record<string, unknown>> = jest.fn((props) =>
    createElement(
        'div',
        { 'data-testid': `file-${(props.field as FieldContentItem).id}` },
        (props.value as { name?: string })?.name ?? '',
    ),
)

const StubSection: FC<Record<string, unknown>> = jest.fn((props) =>
    createElement(
        'div',
        { 'data-testid': `section-${(props.section as SectionContentItem).id}` },
        props.children as ReactNode,
    ),
)

const StubError: FC<Record<string, unknown>> = jest.fn((props) =>
    createElement(
        'div',
        { 'data-testid': `error-${(props.field as FieldContentItem).id}` },
        (props.errors as FieldValidationError[]).map((e) => e.message).join(', '),
    ),
)

const noopFieldProps = () => ({})
const noopArrayItemProps = () => ({})

const makeComponents = (withError = false): ViewerComponentMap => ({
    string: StubString as unknown as ViewerComponentMap['string'],
    number: StubNumber as unknown as ViewerComponentMap['number'],
    boolean: StubBoolean as unknown as ViewerComponentMap['boolean'],
    date: StubDate as unknown as ViewerComponentMap['date'],
    select: StubSelect as unknown as ViewerComponentMap['select'],
    array: StubArray as unknown as ViewerComponentMap['array'],
    file: StubFile as unknown as ViewerComponentMap['file'],
    section: StubSection as unknown as ViewerComponentMap['section'],
    ...(withError ? { error: StubError as unknown as ViewerComponentMap['error'] } : {}),
})

const allVisible = (...ids: number[]): Map<number, boolean> => new Map(ids.map((id) => [id, true]))

const makeCtx = (overrides: Partial<RenderContentContext>): RenderContentContext => ({
    items: [],
    visibilityMap: new Map(),
    values: {},
    errors: [],
    components: makeComponents(),
    renderFieldProps: noopFieldProps,
    renderArrayItemProps: noopArrayItemProps,
    ...overrides,
})

// Wrapper for rendering the ReactNode returned by renderContent
const Wrapper: FC<{ ctx: RenderContentContext }> = ({ ctx }) =>
    createElement('div', { 'data-testid': 'root' }, renderContent(ctx))

beforeEach(() => {
    jest.clearAllMocks()
})

// ── Helper tests ──

describe('filterErrorsForField', () => {
    const errors: FieldValidationError[] = [
        { fieldId: 1, rule: 'required', message: 'Required' },
        { fieldId: 1, rule: 'minLength', message: 'Too short', itemIndex: 0 },
        { fieldId: 1, rule: 'minLength', message: 'Too short', itemIndex: 1 },
        { fieldId: 2, rule: 'required', message: 'Required' },
    ]

    it('filters field-level errors (no itemIndex)', () => {
        const result = filterErrorsForField(errors, 1)
        expect(result).toEqual([{ fieldId: 1, rule: 'required', message: 'Required' }])
    })

    it('filters item-level errors by itemIndex', () => {
        const result = filterErrorsForField(errors, 1, 0)
        expect(result).toEqual([{ fieldId: 1, rule: 'minLength', message: 'Too short', itemIndex: 0 }])
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

describe('syntheticFieldDef', () => {
    it('creates a synthetic FieldContentItem from array field + item def', () => {
        const arrayField: FieldContentItem = {
            id: 10,
            type: 'array',
            label: 'Tags',
            item: { type: 'string', label: 'Tag' },
        }
        const result = syntheticFieldDef(arrayField, 2)
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

// ── renderContent tests ──

describe('renderContent', () => {
    // 1. Basic rendering
    it('renders fields of each type in order with correct props', () => {
        const items: ContentItem[] = [
            { id: 1, type: 'string', label: 'Name' },
            { id: 2, type: 'number', label: 'Age' },
            { id: 3, type: 'boolean', label: 'Active' },
            { id: 4, type: 'date', label: 'DOB' },
            {
                id: 5,
                type: 'select',
                label: 'Color',
                options: [
                    { value: 'r', label: 'Red' },
                    { value: 'b', label: 'Blue' },
                ],
            },
        ]
        const values: FormValues = { '1': 'Alice', '2': 42, '3': true, '4': '2025-01-01', '5': 'r' }

        const ctx = makeCtx({
            items,
            visibilityMap: allVisible(1, 2, 3, 4, 5),
            values,
        })

        render(createElement(Wrapper, { ctx }))

        expect(screen.getByTestId('string-1').textContent).toBe('Alice')
        expect(screen.getByTestId('number-2').textContent).toBe('42')
        expect(screen.getByTestId('boolean-3').textContent).toBe('true')
        expect(screen.getByTestId('date-4').textContent).toBe('2025-01-01')
        expect(screen.getByTestId('select-5').textContent).toBe('r')

        // Verify field/value/errors props on string component
        expect(StubString).toHaveBeenCalledWith(
            expect.objectContaining({
                field: items[0],
                value: 'Alice',
                errors: [],
            }),
            undefined,
        )
    })

    // 2. Visibility filtering
    it('does not render hidden items', () => {
        const items: ContentItem[] = [
            { id: 1, type: 'string', label: 'Visible' },
            { id: 2, type: 'string', label: 'Hidden' },
        ]
        const vis = new Map<number, boolean>([
            [1, true],
            [2, false],
        ])

        const ctx = makeCtx({ items, visibilityMap: vis, values: { '1': 'yes' } })
        render(createElement(Wrapper, { ctx }))

        expect(screen.getByTestId('string-1')).toBeTruthy()
        expect(screen.queryByTestId('string-2')).toBeNull()
    })

    // 3. Section filter: undefined — all rendered
    it('renders all top-level fields and sections when sectionFilter is undefined', () => {
        const items: ContentItem[] = [
            { id: 1, type: 'string', label: 'Top field' },
            {
                id: 2,
                type: 'section',
                title: 'Sec',
                content: [{ id: 3, type: 'string', label: 'Inner' }],
            },
        ]

        const ctx = makeCtx({
            items,
            visibilityMap: allVisible(1, 2, 3),
            values: { '1': 'a', '3': 'b' },
            sectionFilter: undefined,
        })

        render(createElement(Wrapper, { ctx }))

        expect(screen.getByTestId('string-1')).toBeTruthy()
        expect(screen.getByTestId('section-2')).toBeTruthy()
        expect(screen.getByTestId('string-3')).toBeTruthy()
    })

    // 4. Section filter: ROOT — only non-section items
    it('renders only top-level non-section items when sectionFilter is ROOT', () => {
        const items: ContentItem[] = [
            { id: 1, type: 'string', label: 'Top field' },
            {
                id: 2,
                type: 'section',
                title: 'Sec',
                content: [{ id: 3, type: 'string', label: 'Inner' }],
            },
            { id: 4, type: 'number', label: 'Another top' },
        ]

        const ctx = makeCtx({
            items,
            visibilityMap: allVisible(1, 2, 3, 4),
            values: { '1': 'a', '3': 'b', '4': 7 },
            sectionFilter: ROOT,
        })

        render(createElement(Wrapper, { ctx }))

        expect(screen.getByTestId('string-1')).toBeTruthy()
        expect(screen.getByTestId('number-4')).toBeTruthy()
        expect(screen.queryByTestId('section-2')).toBeNull()
        expect(screen.queryByTestId('string-3')).toBeNull()
    })

    // 5. Section filter: numeric id — only matching section's content
    it('renders only the matching section when sectionFilter is a numeric id', () => {
        const items: ContentItem[] = [
            { id: 1, type: 'string', label: 'Top field' },
            {
                id: 2,
                type: 'section',
                title: 'Target',
                content: [{ id: 3, type: 'string', label: 'Inner' }],
            },
        ]

        const ctx = makeCtx({
            items,
            visibilityMap: allVisible(1, 2, 3),
            values: { '1': 'a', '3': 'b' },
            sectionFilter: 2,
            includeSectionHeader: true,
        })

        render(createElement(Wrapper, { ctx }))

        expect(screen.getByTestId('section-2')).toBeTruthy()
        expect(screen.getByTestId('string-3')).toBeTruthy()
        expect(screen.queryByTestId('string-1')).toBeNull()
    })

    // 6. Section filter: non-existent id — renders nothing
    it('renders nothing when sectionFilter references a non-existent section', () => {
        const items: ContentItem[] = [
            { id: 1, type: 'string', label: 'Field' },
            {
                id: 2,
                type: 'section',
                title: 'Sec',
                content: [{ id: 3, type: 'string', label: 'Inner' }],
            },
        ]

        const ctx = makeCtx({
            items,
            visibilityMap: allVisible(1, 2, 3),
            values: {},
            sectionFilter: 999,
        })

        const { container } = render(createElement(Wrapper, { ctx }))
        expect(container.querySelector('[data-testid="root"]')?.children.length).toBe(0)
    })

    // 7. Section filter: hidden section — renders nothing
    it('renders nothing when the filtered section is hidden', () => {
        const items: ContentItem[] = [
            {
                id: 2,
                type: 'section',
                title: 'Hidden Sec',
                content: [{ id: 3, type: 'string', label: 'Inner' }],
            },
        ]
        const vis = new Map<number, boolean>([
            [2, false],
            [3, true],
        ])

        const ctx = makeCtx({
            items,
            visibilityMap: vis,
            values: {},
            sectionFilter: 2,
        })

        const { container } = render(createElement(Wrapper, { ctx }))
        expect(container.querySelector('[data-testid="root"]')?.children.length).toBe(0)
    })

    // 8. includeSectionHeader=true — section wrapper present
    it('renders section wrapper when includeSectionHeader is true', () => {
        const items: ContentItem[] = [
            {
                id: 2,
                type: 'section',
                title: 'Sec',
                content: [{ id: 3, type: 'string', label: 'Inner' }],
            },
        ]

        const ctx = makeCtx({
            items,
            visibilityMap: allVisible(2, 3),
            values: { '3': 'val' },
            sectionFilter: 2,
            includeSectionHeader: true,
        })

        render(createElement(Wrapper, { ctx }))

        expect(screen.getByTestId('section-2')).toBeTruthy()
        expect(screen.getByTestId('string-3')).toBeTruthy()
    })

    // 9. includeSectionHeader=false — no section wrapper
    it('renders only inner content when includeSectionHeader is false', () => {
        const items: ContentItem[] = [
            {
                id: 2,
                type: 'section',
                title: 'Sec',
                content: [{ id: 3, type: 'string', label: 'Inner' }],
            },
        ]

        const ctx = makeCtx({
            items,
            visibilityMap: allVisible(2, 3),
            values: { '3': 'val' },
            sectionFilter: 2,
            includeSectionHeader: false,
        })

        render(createElement(Wrapper, { ctx }))

        expect(screen.queryByTestId('section-2')).toBeNull()
        expect(screen.getByTestId('string-3')).toBeTruthy()
    })

    // 10. Nested sections
    it('renders nested sections recursively with children', () => {
        const items: ContentItem[] = [
            {
                id: 10,
                type: 'section',
                title: 'Outer',
                content: [
                    { id: 11, type: 'string', label: 'Outer field' },
                    {
                        id: 12,
                        type: 'section',
                        title: 'Inner',
                        content: [{ id: 13, type: 'number', label: 'Deep field' }],
                    },
                ],
            },
        ]

        const ctx = makeCtx({
            items,
            visibilityMap: allVisible(10, 11, 12, 13),
            values: { '11': 'hello', '13': 99 },
        })

        render(createElement(Wrapper, { ctx }))

        expect(screen.getByTestId('section-10')).toBeTruthy()
        expect(screen.getByTestId('string-11')).toBeTruthy()
        expect(screen.getByTestId('section-12')).toBeTruthy()
        expect(screen.getByTestId('number-13')).toBeTruthy()

        // Inner section is child of outer section
        const outer = screen.getByTestId('section-10')
        expect(outer.contains(screen.getByTestId('section-12'))).toBe(true)
    })

    // 11. Array item delegation
    it('renders array items as typed components passed as children', () => {
        const arrayField: FieldContentItem = {
            id: 20,
            type: 'array',
            label: 'Tags',
            item: { type: 'string', label: 'Tag' },
        }
        const items: ContentItem[] = [arrayField]
        const values: FormValues = { '20': ['foo', 'bar'] }
        const errors: FieldValidationError[] = [
            { fieldId: 20, rule: 'minLength', message: 'Too short', itemIndex: 1 },
            { fieldId: 20, rule: 'minItems', message: 'Not enough items' },
        ]

        const ctx = makeCtx({
            items,
            visibilityMap: allVisible(20),
            values,
            errors,
        })

        render(createElement(Wrapper, { ctx }))

        // Array wrapper rendered
        expect(screen.getByTestId('array-20')).toBeTruthy()

        // Array items rendered as string components inside the array wrapper
        const arrayEl = screen.getByTestId('array-20')
        const itemEls = arrayEl.querySelectorAll('[data-testid^="string-"]')
        expect(itemEls).toHaveLength(2)

        // Verify array component received field-level errors (no itemIndex)
        expect(StubArray).toHaveBeenCalledWith(
            expect.objectContaining({
                errors: [{ fieldId: 20, rule: 'minItems', message: 'Not enough items' }],
            }),
            undefined,
        )
    })

    // 12. Error component rendering
    it('renders error component after invalid fields when provided', () => {
        const items: ContentItem[] = [{ id: 1, type: 'string', label: 'Name' }]
        const errors: FieldValidationError[] = [{ fieldId: 1, rule: 'required', message: 'Value is required' }]

        const ctx = makeCtx({
            items,
            visibilityMap: allVisible(1),
            values: {},
            errors,
            components: makeComponents(true),
        })

        render(createElement(Wrapper, { ctx }))

        expect(screen.getByTestId('string-1')).toBeTruthy()
        expect(screen.getByTestId('error-1')).toBeTruthy()
        expect(screen.getByTestId('error-1').textContent).toBe('Value is required')
    })

    // 13a. Error component NOT rendered when not provided
    it('does not render error component when not in component map', () => {
        const items: ContentItem[] = [{ id: 1, type: 'string', label: 'Name' }]
        const errors: FieldValidationError[] = [{ fieldId: 1, rule: 'required', message: 'Value is required' }]

        const ctx = makeCtx({
            items,
            visibilityMap: allVisible(1),
            values: {},
            errors,
            components: makeComponents(false),
        })

        render(createElement(Wrapper, { ctx }))

        expect(screen.getByTestId('string-1')).toBeTruthy()
        expect(screen.queryByTestId('error-1')).toBeNull()
    })

    // 13b. Error component NOT rendered when field has no errors
    it('does not render error component when field has no errors', () => {
        const items: ContentItem[] = [{ id: 1, type: 'string', label: 'Name' }]

        const ctx = makeCtx({
            items,
            visibilityMap: allVisible(1),
            values: { '1': 'Alice' },
            errors: [],
            components: makeComponents(true),
        })

        render(createElement(Wrapper, { ctx }))

        expect(screen.getByTestId('string-1')).toBeTruthy()
        expect(screen.queryByTestId('error-1')).toBeNull()
    })

    // 12 (array variant). Error component rendered after array with field-level errors
    it('renders error component after array fields with errors', () => {
        const items: ContentItem[] = [
            {
                id: 30,
                type: 'array',
                label: 'Items',
                item: { type: 'string', label: 'Item' },
            },
        ]
        const errors: FieldValidationError[] = [{ fieldId: 30, rule: 'minItems', message: 'Need more items' }]

        const ctx = makeCtx({
            items,
            visibilityMap: allVisible(30),
            values: { '30': [] },
            errors,
            components: makeComponents(true),
        })

        render(createElement(Wrapper, { ctx }))

        expect(screen.getByTestId('array-30')).toBeTruthy()
        expect(screen.getByTestId('error-30')).toBeTruthy()
        expect(screen.getByTestId('error-30').textContent).toBe('Need more items')
    })

    // 14. Select fields receive options prop
    it('passes options prop to select field components', () => {
        const selectField: FieldContentItem = {
            id: 5,
            type: 'select',
            label: 'Color',
            options: [
                { value: 'r', label: 'Red' },
                { value: 'g', label: 'Green' },
            ],
        }
        const items: ContentItem[] = [selectField]

        const ctx = makeCtx({
            items,
            visibilityMap: allVisible(5),
            values: { '5': 'r' },
        })

        render(createElement(Wrapper, { ctx }))

        expect(StubSelect).toHaveBeenCalledWith(
            expect.objectContaining({
                options: [
                    { value: 'r', label: 'Red' },
                    { value: 'g', label: 'Green' },
                ],
            }),
            undefined,
        )
    })

    // 15. React keys — stable keys present on all elements
    it('assigns stable keys to all rendered elements', () => {
        const items: ContentItem[] = [
            { id: 1, type: 'string', label: 'A' },
            { id: 2, type: 'number', label: 'B' },
            {
                id: 3,
                type: 'section',
                title: 'Sec',
                content: [{ id: 4, type: 'boolean', label: 'C' }],
            },
        ]

        const ctx = makeCtx({
            items,
            visibilityMap: allVisible(1, 2, 3, 4),
            values: {},
        })

        // Verify no React key warnings during rendering
        const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {})

        render(createElement(Wrapper, { ctx }))

        const keyWarnings = consoleSpy.mock.calls.filter(
            (call) => typeof call[0] === 'string' && call[0].includes('key'),
        )
        expect(keyWarnings).toHaveLength(0)

        consoleSpy.mockRestore()
    })

    // Additional: array items with select type receive options
    it('passes options to array items of select type', () => {
        const arrayField: FieldContentItem = {
            id: 40,
            type: 'array',
            label: 'Choices',
            item: {
                type: 'select',
                label: 'Choice',
                options: [
                    { value: 1, label: 'One' },
                    { value: 2, label: 'Two' },
                ],
            },
        }
        const items: ContentItem[] = [arrayField]

        const ctx = makeCtx({
            items,
            visibilityMap: allVisible(40),
            values: { '40': [1] },
        })

        render(createElement(Wrapper, { ctx }))

        expect(StubSelect).toHaveBeenCalledWith(
            expect.objectContaining({
                options: [
                    { value: 1, label: 'One' },
                    { value: 2, label: 'Two' },
                ],
            }),
            undefined,
        )
    })

    // 16. File field rendering
    it('renders file field with correct props', () => {
        const fileValue = {
            name: 'doc.pdf',
            mimeType: 'application/pdf',
            size: 1024,
            url: 'https://example.com/doc.pdf',
        }
        const items: ContentItem[] = [{ id: 1, type: 'file', label: 'Resume' }]

        const ctx = makeCtx({
            items,
            visibilityMap: allVisible(1),
            values: { '1': fileValue },
        })

        render(createElement(Wrapper, { ctx }))

        expect(screen.getByTestId('file-1').textContent).toBe('doc.pdf')
        expect(StubFile).toHaveBeenCalledWith(
            expect.objectContaining({
                field: items[0],
                value: fileValue,
                errors: [],
            }),
            undefined,
        )
    })

    it('renders file items in array correctly', () => {
        const fileValue = {
            name: 'doc.pdf',
            mimeType: 'application/pdf',
            size: 1024,
            url: 'https://example.com/doc.pdf',
        }
        const arrayField: FieldContentItem = {
            id: 50,
            type: 'array',
            label: 'Attachments',
            item: { type: 'file', label: 'Attachment' },
        }
        const items: ContentItem[] = [arrayField]

        const ctx = makeCtx({
            items,
            visibilityMap: allVisible(50),
            values: { '50': [fileValue] },
        })

        render(createElement(Wrapper, { ctx }))

        expect(screen.getByTestId('array-50')).toBeTruthy()
        const arrayEl = screen.getByTestId('array-50')
        const fileEls = arrayEl.querySelectorAll('[data-testid^="file-"]')
        expect(fileEls).toHaveLength(1)
    })

    // Renders nothing for empty items array
    it('renders nothing when items is empty', () => {
        const ctx = makeCtx({ items: [], visibilityMap: new Map() })
        const { container } = render(createElement(Wrapper, { ctx }))
        expect(container.querySelector('[data-testid="root"]')?.children.length).toBe(0)
    })
})
