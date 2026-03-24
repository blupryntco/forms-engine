import type { FC, ReactNode } from 'react'

import type {
    FieldContentItem,
    FieldValidationError,
    FormDefinition,
    FormDocument,
    FormValues,
    SectionContentItem,
} from '@bluprynt/forms-core'
import { render, screen } from '@testing-library/react'

import { DEFAULT, ROOT } from './constants'
import { Form } from './form-context'
import { FormViewer } from './form-viewer'
import type { ViewerComponentMap } from './types'

const MockString: FC<Record<string, unknown>> = jest.fn((props) => (
    <div data-testid={`string-${(props.field as FieldContentItem).id}`}>{String(props.value ?? '')}</div>
))

const MockNumber: FC<Record<string, unknown>> = jest.fn((props) => (
    <div data-testid={`number-${(props.field as FieldContentItem).id}`}>{String(props.value ?? '')}</div>
))

const MockBoolean: FC<Record<string, unknown>> = jest.fn((props) => (
    <div data-testid={`boolean-${(props.field as FieldContentItem).id}`}>{String(props.value ?? '')}</div>
))

const MockDate: FC<Record<string, unknown>> = jest.fn((props) => (
    <div data-testid={`date-${(props.field as FieldContentItem).id}`}>{String(props.value ?? '')}</div>
))

const MockSelect: FC<Record<string, unknown>> = jest.fn((props) => (
    <div data-testid={`select-${(props.field as FieldContentItem).id}`}>{String(props.value ?? '')}</div>
))

const MockArray: FC<Record<string, unknown>> = jest.fn((props) => (
    <div data-testid={`array-${(props.field as FieldContentItem).id}`}>{props.children as ReactNode}</div>
))

const MockFile: FC<Record<string, unknown>> = jest.fn((props) => (
    <div data-testid={`file-${(props.field as FieldContentItem).id}`}>
        {(props.value as { name?: string })?.name ?? ''}
    </div>
))

const MockSection: FC<Record<string, unknown>> = jest.fn((props) => (
    <div data-testid={`section-${(props.section as SectionContentItem).id}`}>{props.children as ReactNode}</div>
))

const MockError: FC<Record<string, unknown>> = jest.fn((props) => (
    <div data-testid={`error-${(props.field as FieldContentItem).id}`}>
        {(props.errors as FieldValidationError[]).map((e) => e.message).join(', ')}
    </div>
))

const makeComponents = (withError = false): ViewerComponentMap => ({
    string: MockString as ViewerComponentMap['string'],
    number: MockNumber as ViewerComponentMap['number'],
    boolean: MockBoolean as ViewerComponentMap['boolean'],
    date: MockDate as ViewerComponentMap['date'],
    select: MockSelect as ViewerComponentMap['select'],
    array: MockArray as ViewerComponentMap['array'],
    file: MockFile as ViewerComponentMap['file'],
    section: MockSection as ViewerComponentMap['section'],
    ...(withError ? { error: MockError as ViewerComponentMap['error'] } : {}),
})

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

const renderViewer = (
    formProps: {
        definition: FormDefinition
        data: FormDocument
        section?: typeof ROOT | typeof DEFAULT | number
    },
    components: ViewerComponentMap,
) =>
    render(
        <Form {...formProps}>
            <FormViewer components={components} />
        </Form>,
    )

beforeEach(() => {
    jest.clearAllMocks()
})

describe('FormViewer', () => {
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

    it('does not crash when no error component provided', () => {
        const definition = baseDef([{ id: 1, type: 'string', label: 'Name', validation: { required: true } }])
        const values = {}

        renderViewer({ definition, data: doc(values) }, makeComponents(false))

        const stringCalls = (MockString as jest.Mock).mock.calls
        const lastCallProps = stringCalls[stringCalls.length - 1][0]
        expect(lastCallProps.errors.length).toBeGreaterThan(0)
        expect(screen.queryByTestId('error-1')).toBeNull()
    })

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

    it('renders nothing when section filter references a non-existent section', () => {
        const definition = baseDef([{ id: 1, type: 'string', label: 'Field' }])
        const values = { '1': 'a' }

        const { container } = renderViewer({ definition, data: doc(values), section: 999 }, makeComponents())

        expect(container.children[0]?.children.length ?? 0).toBe(0)
    })

    it('renders first visible root fields when section filter is DEFAULT with root fields', () => {
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

        renderViewer({ definition, data: doc(values), section: DEFAULT }, makeComponents())

        expect(screen.getByTestId('string-1')).toBeTruthy()
        expect(screen.getByTestId('boolean-4')).toBeTruthy()
        expect(screen.queryByTestId('section-2')).toBeNull()
        expect(screen.queryByTestId('number-3')).toBeNull()
    })

    it('renders first visible section when DEFAULT and no root fields', () => {
        const definition = baseDef([
            {
                id: 10,
                type: 'section',
                title: 'First',
                content: [{ id: 1, type: 'string', label: 'A' }],
            },
            {
                id: 20,
                type: 'section',
                title: 'Second',
                content: [{ id: 2, type: 'number', label: 'B' }],
            },
        ])
        const values = { '1': 'x', '2': 5 }

        renderViewer({ definition, data: doc(values), section: DEFAULT }, makeComponents())

        expect(screen.getByTestId('section-10')).toBeTruthy()
        expect(screen.getByTestId('string-1')).toBeTruthy()
        expect(screen.queryByTestId('section-20')).toBeNull()
    })

    it('skips hidden first section with DEFAULT and renders next visible', () => {
        const definition = baseDef([
            { id: 1, type: 'boolean', label: 'Toggle' },
            {
                id: 10,
                type: 'section',
                title: 'Hidden',
                condition: { field: 1, op: 'eq' as const, value: true },
                content: [{ id: 2, type: 'string', label: 'A' }],
            },
            {
                id: 20,
                type: 'section',
                title: 'Visible',
                content: [{ id: 3, type: 'number', label: 'B' }],
            },
        ])
        const values = { '1': false, '2': 'x', '3': 5 }

        renderViewer({ definition, data: doc(values), section: DEFAULT }, makeComponents())

        // Root fields visible (boolean-1), so DEFAULT should show root fields
        expect(screen.getByTestId('boolean-1')).toBeTruthy()
        expect(screen.queryByTestId('section-10')).toBeNull()
        expect(screen.queryByTestId('section-20')).toBeNull()
    })

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
        const secondErrors = (secondItemProps?.[0] as Record<string, unknown>).errors as FieldValidationError[]
        expect(secondErrors.length).toBeGreaterThan(0)
        expect(secondErrors[0]).toMatchObject({ rule: 'MIN_LENGTH' })
    })

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

    it('throws when rendered without a Form provider', () => {
        const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {})

        expect(() => render(<FormViewer components={makeComponents()} />)).toThrow(
            'useFormContext must be used within a <Form> provider',
        )

        consoleSpy.mockRestore()
    })
    // 20. Document errors cause null return
    it('returns null when document errors exist (duplicate IDs)', () => {
        const definition = baseDef([
            { id: 1, type: 'string', label: 'Name' },
            { id: 1, type: 'number', label: 'Duplicate' },
        ])
        const values = { '1': 'Alice' }

        const { container } = renderViewer({ definition, data: doc(values) }, makeComponents())

        expect(container.innerHTML).toBe('')
    })

    // 21. Returns null when no definition provided
    it('returns null when no definition provided', () => {
        const { container } = render(
            <Form data={doc({ '1': 'Alice' })}>
                <FormViewer components={makeComponents()} />
            </Form>,
        )

        expect(container.innerHTML).toBe('')
    })

    // 22. Returns null when no data provided
    it('returns null when no data provided', () => {
        const definition = baseDef([{ id: 1, type: 'string', label: 'Name' }])

        const { container } = render(
            <Form definition={definition}>
                <FormViewer components={makeComponents()} />
            </Form>,
        )

        expect(container.innerHTML).toBe('')
    })
})
