/**
 * @jest-environment jsdom
 */

import { createElement, type FC, type ReactNode } from 'react'

import type {
    FieldContentItem,
    FieldValidationError,
    FormDefinition,
    FormDocument,
    FormValues,
    SectionContentItem,
} from '@bluprynt/forms-core'
import { render, screen } from '@testing-library/react'

import { ROOT } from './constants'
import { Form } from './form-context'
import { FormViewer } from './form-viewer'
import type { ViewerComponentMap } from './types'

// ── Mock components ──

const MockString: FC<Record<string, unknown>> = jest.fn((props) =>
    createElement(
        'div',
        { 'data-testid': `string-${(props.field as FieldContentItem).id}` },
        String(props.value ?? ''),
    ),
)

const MockNumber: FC<Record<string, unknown>> = jest.fn((props) =>
    createElement(
        'div',
        { 'data-testid': `number-${(props.field as FieldContentItem).id}` },
        String(props.value ?? ''),
    ),
)

const MockBoolean: FC<Record<string, unknown>> = jest.fn((props) =>
    createElement(
        'div',
        { 'data-testid': `boolean-${(props.field as FieldContentItem).id}` },
        String(props.value ?? ''),
    ),
)

const MockDate: FC<Record<string, unknown>> = jest.fn((props) =>
    createElement('div', { 'data-testid': `date-${(props.field as FieldContentItem).id}` }, String(props.value ?? '')),
)

const MockSelect: FC<Record<string, unknown>> = jest.fn((props) =>
    createElement(
        'div',
        { 'data-testid': `select-${(props.field as FieldContentItem).id}` },
        String(props.value ?? ''),
    ),
)

const MockArray: FC<Record<string, unknown>> = jest.fn((props) =>
    createElement(
        'div',
        { 'data-testid': `array-${(props.field as FieldContentItem).id}` },
        props.children as ReactNode,
    ),
)

const MockFile: FC<Record<string, unknown>> = jest.fn((props) =>
    createElement(
        'div',
        { 'data-testid': `file-${(props.field as FieldContentItem).id}` },
        (props.value as { name?: string })?.name ?? '',
    ),
)

const MockSection: FC<Record<string, unknown>> = jest.fn((props) =>
    createElement(
        'div',
        { 'data-testid': `section-${(props.section as SectionContentItem).id}` },
        props.children as ReactNode,
    ),
)

const MockError: FC<Record<string, unknown>> = jest.fn((props) =>
    createElement(
        'div',
        { 'data-testid': `error-${(props.field as FieldContentItem).id}` },
        (props.errors as FieldValidationError[]).map((e) => e.message).join(', '),
    ),
)

const makeComponents = (withError = false): ViewerComponentMap => ({
    string: MockString as unknown as ViewerComponentMap['string'],
    number: MockNumber as unknown as ViewerComponentMap['number'],
    boolean: MockBoolean as unknown as ViewerComponentMap['boolean'],
    date: MockDate as unknown as ViewerComponentMap['date'],
    select: MockSelect as unknown as ViewerComponentMap['select'],
    array: MockArray as unknown as ViewerComponentMap['array'],
    file: MockFile as unknown as ViewerComponentMap['file'],
    section: MockSection as unknown as ViewerComponentMap['section'],
    ...(withError ? { error: MockError as unknown as ViewerComponentMap['error'] } : {}),
})

// ── Helpers ──

const baseDef = (content: FormDefinition['content']): FormDefinition => ({
    id: 'test-form',
    version: '1.0.0',
    title: 'Test Form',
    content,
})

const doc = (values: FormValues = {}, submittedAt: string = '2025-06-15T00:00:00.000Z'): FormDocument => ({
    form: { id: 'test-form', version: '1.0.0', submittedAt },
    values,
})

/** Helper: wrap FormViewer in Form provider */
const renderViewer = (
    formProps: {
        definition: FormDefinition
        data: FormDocument
        section?: typeof ROOT | number
    },
    components: ViewerComponentMap,
) => render(createElement(Form, formProps, createElement(FormViewer, { components })))

beforeEach(() => {
    jest.clearAllMocks()
})

// ── Tests ──

describe('FormViewer', () => {
    // 1. Renders all visible scalar fields with correct viewer props
    it('renders all visible scalar fields with correct viewer props', () => {
        const definition = baseDef([
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
        ])
        const values = { '1': 'Alice', '2': 42, '3': true, '4': '2025-01-01', '5': 'r' }

        renderViewer({ definition, data: doc(values) }, makeComponents())

        expect(screen.getByTestId('string-1').textContent).toBe('Alice')
        expect(screen.getByTestId('number-2').textContent).toBe('42')
        expect(screen.getByTestId('boolean-3').textContent).toBe('true')
        expect(screen.getByTestId('date-4').textContent).toBe('2025-01-01')
        expect(screen.getByTestId('select-5').textContent).toBe('r')

        // Verify field, value, errors on string component
        expect(MockString).toHaveBeenCalledWith(
            expect.objectContaining({
                field: definition.content[0],
                value: 'Alice',
                errors: [],
            }),
            undefined,
        )
    })

    // 2. Sections rendered with section and children props
    it('renders sections with section and children props', () => {
        const definition = baseDef([
            {
                id: 10,
                type: 'section',
                title: 'Personal',
                content: [{ id: 11, type: 'string', label: 'Name' }],
            },
        ])
        const values = { '11': 'Bob' }

        renderViewer({ definition, data: doc(values) }, makeComponents())

        expect(screen.getByTestId('section-10')).toBeTruthy()
        expect(screen.getByTestId('string-11')).toBeTruthy()

        expect(MockSection).toHaveBeenCalledWith(
            expect.objectContaining({
                section: definition.content[0],
            }),
            undefined,
        )
    })

    // 3. Hidden fields (condition false) not rendered
    it('does not render fields hidden by conditions', () => {
        const definition = baseDef([
            { id: 1, type: 'boolean', label: 'Toggle' },
            {
                id: 2,
                type: 'string',
                label: 'Conditional',
                condition: { field: 1, op: 'eq' as const, value: true },
            },
        ])
        const values = { '1': false }

        renderViewer({ definition, data: doc(values) }, makeComponents())

        expect(screen.getByTestId('boolean-1')).toBeTruthy()
        expect(screen.queryByTestId('string-2')).toBeNull()
    })

    // 4. Validation errors passed to fields + error component rendered
    it('passes validation errors to fields and renders error component', () => {
        const definition = baseDef([{ id: 1, type: 'string', label: 'Name', validation: { required: true } }])
        const values = {}

        renderViewer({ definition, data: doc(values) }, makeComponents(true))

        const stringCalls = (MockString as jest.Mock).mock.calls
        const lastCallProps = stringCalls[stringCalls.length - 1][0]
        expect(lastCallProps.errors.length).toBeGreaterThan(0)
        expect(lastCallProps.errors[0]).toMatchObject({
            fieldId: 1,
            rule: 'REQUIRED',
        })

        expect(screen.getByTestId('error-1')).toBeTruthy()
    })

    // 5. No crash when error component not in map
    it('does not crash when no error component provided', () => {
        const definition = baseDef([{ id: 1, type: 'string', label: 'Name', validation: { required: true } }])
        const values = {}

        renderViewer({ definition, data: doc(values) }, makeComponents(false))

        const stringCalls = (MockString as jest.Mock).mock.calls
        const lastCallProps = stringCalls[stringCalls.length - 1][0]
        expect(lastCallProps.errors.length).toBeGreaterThan(0)
        expect(screen.queryByTestId('error-1')).toBeNull()
    })

    // 7. Section filter undefined: all content rendered
    it('renders all content when section filter is undefined', () => {
        const definition = baseDef([
            { id: 1, type: 'string', label: 'Top' },
            {
                id: 2,
                type: 'section',
                title: 'Sec',
                content: [{ id: 3, type: 'number', label: 'Inner' }],
            },
        ])
        const values = { '1': 'a', '3': 10 }

        renderViewer({ definition, data: doc(values) }, makeComponents())

        expect(screen.getByTestId('string-1')).toBeTruthy()
        expect(screen.getByTestId('section-2')).toBeTruthy()
        expect(screen.getByTestId('number-3')).toBeTruthy()
    })

    // 8. Section filter ROOT: only top-level non-section items
    it('renders only top-level non-section items when section filter is ROOT', () => {
        const definition = baseDef([
            { id: 1, type: 'string', label: 'Top' },
            {
                id: 2,
                type: 'section',
                title: 'Sec',
                content: [{ id: 3, type: 'number', label: 'Inner' }],
            },
            { id: 4, type: 'boolean', label: 'Another top' },
        ])
        const values = { '1': 'a', '3': 10, '4': true }

        renderViewer({ definition, data: doc(values), section: ROOT }, makeComponents())

        expect(screen.getByTestId('string-1')).toBeTruthy()
        expect(screen.getByTestId('boolean-4')).toBeTruthy()
        expect(screen.queryByTestId('section-2')).toBeNull()
        expect(screen.queryByTestId('number-3')).toBeNull()
    })

    // 9. Section filter specific id: section wrapper + content
    it('renders section wrapper and content when filtering by section id', () => {
        const definition = baseDef([
            { id: 1, type: 'string', label: 'Top' },
            {
                id: 2,
                type: 'section',
                title: 'Target',
                content: [{ id: 3, type: 'string', label: 'Inner' }],
            },
        ])
        const values = { '1': 'a', '3': 'b' }

        renderViewer({ definition, data: doc(values), section: 2 }, makeComponents())

        expect(screen.getByTestId('section-2')).toBeTruthy()
        expect(screen.getByTestId('string-3')).toBeTruthy()
        expect(screen.queryByTestId('string-1')).toBeNull()
    })

    // 10. Section filter non-existent id: nothing rendered
    it('renders nothing when section filter references a non-existent section', () => {
        const definition = baseDef([{ id: 1, type: 'string', label: 'Field' }])
        const values = { '1': 'a' }

        const { container } = renderViewer({ definition, data: doc(values), section: 999 }, makeComponents())

        expect(container.children[0]?.children.length ?? 0).toBe(0)
    })

    // 12. Section filter hidden section: nothing rendered
    it('renders nothing when the filtered section is hidden by condition', () => {
        const definition = baseDef([
            { id: 1, type: 'boolean', label: 'Toggle' },
            {
                id: 2,
                type: 'section',
                title: 'Conditional Sec',
                condition: { field: 1, op: 'eq' as const, value: true },
                content: [{ id: 3, type: 'string', label: 'Inner' }],
            },
        ])
        const values = { '1': false }

        renderViewer({ definition, data: doc(values), section: 2 }, makeComponents())

        expect(screen.queryByTestId('section-2')).toBeNull()
        expect(screen.queryByTestId('string-3')).toBeNull()
    })

    // 13. Select fields receive options prop
    it('passes options prop to select field components', () => {
        const options = [
            { value: 'a', label: 'Alpha' },
            { value: 'b', label: 'Beta' },
        ]
        const definition = baseDef([{ id: 1, type: 'select', label: 'Pick', options }])
        const values = { '1': 'a' }

        renderViewer({ definition, data: doc(values) }, makeComponents())

        expect(MockSelect).toHaveBeenCalledWith(expect.objectContaining({ options }), undefined)
    })

    // 14. Array fields: items rendered as typed components, passed as children
    it('renders array items as typed components passed as children to array component', () => {
        const definition = baseDef([
            {
                id: 1,
                type: 'array',
                label: 'Tags',
                item: { type: 'string', label: 'Tag' },
            },
        ])
        const values = { '1': ['foo', 'bar', 'baz'] }

        renderViewer({ definition, data: doc(values) }, makeComponents())

        // Array wrapper rendered
        expect(screen.getByTestId('array-1')).toBeTruthy()

        // Items rendered as string components inside the array
        const arrayEl = screen.getByTestId('array-1')
        const itemEls = arrayEl.querySelectorAll('[data-testid^="string-"]')
        expect(itemEls).toHaveLength(3)

        // Array component received correct props
        expect(MockArray).toHaveBeenCalledWith(
            expect.objectContaining({
                field: definition.content[0],
                value: ['foo', 'bar', 'baz'],
                errors: [],
                itemDef: { type: 'string', label: 'Tag' },
            }),
            undefined,
        )
    })

    // 14b. Array with validation errors — item-level errors routed correctly
    it('routes item-level array validation errors to the correct items', () => {
        const definition = baseDef([
            {
                id: 1,
                type: 'array',
                label: 'Names',
                item: {
                    type: 'string',
                    label: 'Name',
                    validation: { required: true, minLength: 2 },
                },
                validation: { minItems: 1 },
            },
        ])
        // First item is valid, second item is too short
        const values = { '1': ['Alice', 'A'] }

        renderViewer({ definition, data: doc(values) }, makeComponents(true))

        // There should be item-level string component calls — check the second item got errors
        const stringCalls = (MockString as jest.Mock).mock.calls
        // Second string item (index 1) should have minLength error
        const secondItemProps = stringCalls.find(
            (call: unknown[]) => (call[0] as Record<string, unknown>).value === 'A',
        )
        expect(secondItemProps).toBeDefined()
        const secondErrors = (secondItemProps![0] as Record<string, unknown>).errors as FieldValidationError[]
        expect(secondErrors.length).toBeGreaterThan(0)
        expect(secondErrors[0]).toMatchObject({ rule: 'MIN_LENGTH' })
    })

    // 15. Array with select items: each item receives options
    it('passes options to array items of select type', () => {
        const itemOptions = [
            { value: 1, label: 'One' },
            { value: 2, label: 'Two' },
        ]
        const definition = baseDef([
            {
                id: 1,
                type: 'array',
                label: 'Choices',
                item: { type: 'select', label: 'Choice', options: itemOptions },
            },
        ])
        const values = { '1': [1, 2] }

        renderViewer({ definition, data: doc(values) }, makeComponents())

        expect(MockSelect).toHaveBeenCalledWith(expect.objectContaining({ options: itemOptions }), undefined)
    })

    // 16. File field rendering
    it('renders file field with value', () => {
        const fileValue = {
            name: 'doc.pdf',
            mimeType: 'application/pdf',
            size: 1024,
            url: 'https://example.com/doc.pdf',
        }
        const definition = baseDef([{ id: 1, type: 'file', label: 'Resume' }])
        const values = { '1': fileValue }

        renderViewer({ definition, data: doc(values) }, makeComponents())

        expect(screen.getByTestId('file-1').textContent).toBe('doc.pdf')
        expect(MockFile).toHaveBeenCalledWith(
            expect.objectContaining({
                field: definition.content[0],
                value: fileValue,
                errors: [],
            }),
            undefined,
        )
    })

    it('renders file field without value', () => {
        const definition = baseDef([{ id: 1, type: 'file', label: 'Resume' }])

        renderViewer({ definition, data: doc({}) }, makeComponents())

        expect(screen.getByTestId('file-1')).toBeTruthy()
        expect(MockFile).toHaveBeenCalledWith(expect.objectContaining({ value: undefined }), undefined)
    })

    it('file field respects visibility conditions', () => {
        const definition = baseDef([
            { id: 1, type: 'boolean', label: 'Toggle' },
            {
                id: 2,
                type: 'file',
                label: 'Resume',
                condition: { field: 1, op: 'eq' as const, value: true },
            },
        ])

        renderViewer({ definition, data: doc({ '1': false }) }, makeComponents())
        expect(screen.queryByTestId('file-2')).toBeNull()
    })

    // 17. No HTML wrapper — renders fragment directly
    it('renders a fragment with no wrapping HTML element', () => {
        const definition = baseDef([
            { id: 1, type: 'string', label: 'Name' },
            { id: 2, type: 'number', label: 'Age' },
        ])
        const values = { '1': 'Alice', '2': 30 }

        const { container } = renderViewer({ definition, data: doc(values) }, makeComponents())

        // FormViewer renders a Fragment; children are directly under the container
        // (no intermediate wrapper div from FormViewer itself)
        const fieldElements = container.querySelectorAll('[data-testid]')
        expect(fieldElements.length).toBe(2)

        // The first child of the container should be a field element directly
        expect(container.firstElementChild?.getAttribute('data-testid')).toBe('string-1')
    })

    // 18. submittedAt
    describe('submittedAt', () => {
        it('renders with submittedAt set', () => {
            const definition = baseDef([{ id: 1, type: 'string', label: 'Name' }])

            renderViewer(
                {
                    definition,
                    data: doc({ '1': 'Alice' }, '2026-01-15T10:00:00.000Z'),
                },
                makeComponents(),
            )

            expect(screen.getByTestId('string-1').textContent).toBe('Alice')
        })
    })

    // 19. useFormContext throws outside Form provider
    it('throws when rendered without a Form provider', () => {
        const definition = baseDef([{ id: 1, type: 'string', label: 'Name' }])
        const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {})

        expect(() => render(createElement(FormViewer, { components: makeComponents() }))).toThrow(
            'useFormContext must be used within a <Form> provider',
        )

        consoleSpy.mockRestore()
    })
})
