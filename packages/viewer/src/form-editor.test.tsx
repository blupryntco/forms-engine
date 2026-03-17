import { type FC, type ReactNode } from 'react'

import type {
    FieldContentItem,
    FieldValidationError,
    FormDefinition,
    FormDocument,
    FormValidationResult,
    FormValues,
    SectionContentItem,
} from '@bluprynt/forms-core'
import { render, screen } from '@testing-library/react'

import { ROOT } from './constants'
import { Form } from './form-context'
import { FormEditor } from './form-editor'
import type { EditorComponentMap } from './types'

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

const makeComponents = (withError = false): EditorComponentMap => ({
    string: MockString as EditorComponentMap['string'],
    number: MockNumber as EditorComponentMap['number'],
    boolean: MockBoolean as EditorComponentMap['boolean'],
    date: MockDate as EditorComponentMap['date'],
    select: MockSelect as EditorComponentMap['select'],
    array: MockArray as EditorComponentMap['array'],
    file: MockFile as EditorComponentMap['file'],
    section: MockSection as EditorComponentMap['section'],
    ...(withError ? { error: MockError as EditorComponentMap['error'] } : {}),
})

const baseDef = (content: FormDefinition['content']): FormDefinition => ({
    id: 'test-form',
    version: '1.0.0',
    title: 'Test Form',
    content,
})

const noop = jest.fn()

const doc = (values: FormValues = {}, submittedAt: string = '2025-06-15T00:00:00.000Z'): FormDocument => ({
    form: { id: 'test-form', version: '1.0.0', submittedAt },
    values,
})

/** Extract the last call props for a given mock component */
const lastCallProps = (mock: jest.Mock): Record<string, unknown> => {
    const calls = mock.mock.calls
    return calls[calls.length - 1][0] as Record<string, unknown>
}

const renderEditor = (
    formProps: {
        definition: FormDefinition
        data: FormDocument
        section?: typeof ROOT | number
    },
    editorProps: {
        components: EditorComponentMap
        onChange: (data: FormDocument, validation: FormValidationResult) => void
    },
) =>
    render(
        <Form {...formProps}>
            <FormEditor {...editorProps} />
        </Form>,
    )

beforeEach(() => {
    jest.clearAllMocks()
})

describe('FormEditor', () => {
    describe('renders visible fields with correct editor props', () => {
        it('passes field, value, errors, and onChange to each field type', () => {
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

            renderEditor({ definition, data: doc(values) }, { components: makeComponents(), onChange: noop })

            expect(screen.getByTestId('string-1').textContent).toBe('Alice')
            expect(screen.getByTestId('number-2').textContent).toBe('42')
            expect(screen.getByTestId('boolean-3').textContent).toBe('true')
            expect(screen.getByTestId('date-4').textContent).toBe('2025-01-01')
            expect(screen.getByTestId('select-5').textContent).toBe('r')

            // Verify editor-specific props on string component
            expect(MockString).toHaveBeenCalledWith(
                expect.objectContaining({
                    field: definition.content[0],
                    value: 'Alice',
                    errors: [],
                    onChange: expect.any(Function),
                }),
                undefined,
            )

            // Verify select receives options
            expect(MockSelect).toHaveBeenCalledWith(
                expect.objectContaining({
                    options: [
                        { value: 'r', label: 'Red' },
                        { value: 'b', label: 'Blue' },
                    ],
                    onChange: expect.any(Function),
                }),
                undefined,
            )
        })
    })

    describe('field onChange triggers parent onChange', () => {
        it('calls parent onChange with updated values and validation result', () => {
            const definition = baseDef([
                { id: 1, type: 'string', label: 'Name' },
                { id: 2, type: 'number', label: 'Age' },
            ])
            const values = { '1': 'Alice', '2': 42 }
            const onChange = jest.fn()

            renderEditor({ definition, data: doc(values) }, { components: makeComponents(), onChange })

            // Extract the onChange handler passed to the string field
            const stringProps = lastCallProps(MockString as jest.Mock)
            const fieldOnChange = stringProps.onChange as (value: unknown) => void

            // Simulate the field calling onChange
            fieldOnChange('Bob')

            expect(onChange).toHaveBeenCalledTimes(1)
            const [newDoc, validation] = onChange.mock.calls[0] as [FormDocument, FormValidationResult]
            expect(newDoc.values).toEqual({ '1': 'Bob', '2': 42 })
            expect(validation).toHaveProperty('valid')
            expect(validation).toHaveProperty('fieldErrors')
        })

        it('calls parent onChange with validation errors when field becomes invalid', () => {
            const definition = baseDef([
                { id: 1, type: 'string', label: 'Name', validation: { required: true, minLength: 2 } },
            ])
            const values = { '1': 'Alice' }
            const onChange = jest.fn()

            renderEditor({ definition, data: doc(values) }, { components: makeComponents(), onChange })

            const stringProps = lastCallProps(MockString as jest.Mock)
            const fieldOnChange = stringProps.onChange as (value: unknown) => void

            // Set to empty string — should trigger required error
            fieldOnChange('')

            expect(onChange).toHaveBeenCalledTimes(1)
            const [, validation] = onChange.mock.calls[0] as [FormDocument, FormValidationResult]
            expect(validation.valid).toBe(false)
            expect(validation.fieldErrors.size).toBeGreaterThan(0)
            expect(validation.fieldErrors.get(1)?.[0]).toMatchObject({ fieldId: 1, rule: 'REQUIRED' })
        })
    })

    describe('array onAddItem', () => {
        it('appends undefined and triggers onChange with updated array', () => {
            const definition = baseDef([
                {
                    id: 1,
                    type: 'array',
                    label: 'Tags',
                    item: { type: 'string', label: 'Tag' },
                },
            ])
            const values = { '1': ['foo', 'bar'] }
            const onChange = jest.fn()

            renderEditor({ definition, data: doc(values) }, { components: makeComponents(), onChange })

            const arrayProps = lastCallProps(MockArray as jest.Mock)
            const onAddItem = arrayProps.onAddItem as () => void

            onAddItem()

            expect(onChange).toHaveBeenCalledTimes(1)
            const [newDoc, validation] = onChange.mock.calls[0] as [FormDocument, FormValidationResult]
            expect(newDoc.values['1']).toEqual(['foo', 'bar', undefined])
            expect(validation).toHaveProperty('valid')
        })

        it('creates array from empty when no prior value exists', () => {
            const definition = baseDef([
                {
                    id: 1,
                    type: 'array',
                    label: 'Tags',
                    item: { type: 'string', label: 'Tag' },
                },
            ])
            const values = {}
            const onChange = jest.fn()

            renderEditor({ definition, data: doc(values) }, { components: makeComponents(), onChange })

            const arrayProps = lastCallProps(MockArray as jest.Mock)
            const onAddItem = arrayProps.onAddItem as () => void

            onAddItem()

            expect(onChange).toHaveBeenCalledTimes(1)
            const [newDoc] = onChange.mock.calls[0] as [FormDocument]
            expect(newDoc.values['1']).toEqual([undefined])
        })
    })

    describe('array onRemoveItem', () => {
        it('removes item at the given index and triggers onChange', () => {
            const definition = baseDef([
                {
                    id: 1,
                    type: 'array',
                    label: 'Tags',
                    item: { type: 'string', label: 'Tag' },
                },
            ])
            const values = { '1': ['a', 'b', 'c'] }
            const onChange = jest.fn()

            renderEditor({ definition, data: doc(values) }, { components: makeComponents(), onChange })

            const arrayProps = lastCallProps(MockArray as jest.Mock)
            const onRemoveItem = arrayProps.onRemoveItem as (index: number) => void

            onRemoveItem(1)

            expect(onChange).toHaveBeenCalledTimes(1)
            const [newDoc] = onChange.mock.calls[0] as [FormDocument]
            expect(newDoc.values['1']).toEqual(['a', 'c'])
        })
    })

    describe('array onMoveItem', () => {
        it('reorders items and triggers onChange', () => {
            const definition = baseDef([
                {
                    id: 1,
                    type: 'array',
                    label: 'Tags',
                    item: { type: 'string', label: 'Tag' },
                },
            ])
            const values = { '1': ['a', 'b', 'c'] }
            const onChange = jest.fn()

            renderEditor({ definition, data: doc(values) }, { components: makeComponents(), onChange })

            const arrayProps = lastCallProps(MockArray as jest.Mock)
            const onMoveItem = arrayProps.onMoveItem as (from: number, to: number) => void

            // Move index 0 to index 2
            onMoveItem(0, 2)

            expect(onChange).toHaveBeenCalledTimes(1)
            const [newDoc] = onChange.mock.calls[0] as [FormDocument]
            expect(newDoc.values['1']).toEqual(['b', 'c', 'a'])
        })
    })

    describe('validation errors', () => {
        it('passes errors to fields and renders error component', () => {
            const definition = baseDef([{ id: 1, type: 'string', label: 'Name', validation: { required: true } }])
            const values = {}

            renderEditor({ definition, data: doc(values) }, { components: makeComponents(true), onChange: noop })

            const stringProps = lastCallProps(MockString as jest.Mock)
            const errors = stringProps.errors as FieldValidationError[]
            expect(errors.length).toBeGreaterThan(0)
            expect(errors[0]).toMatchObject({ fieldId: 1, rule: 'REQUIRED' })

            // Error component rendered
            expect(screen.getByTestId('error-1')).toBeTruthy()
        })

        it('does not render error component when not provided in map', () => {
            const definition = baseDef([{ id: 1, type: 'string', label: 'Name', validation: { required: true } }])
            const values = {}

            renderEditor({ definition, data: doc(values) }, { components: makeComponents(false), onChange: noop })

            const stringProps = lastCallProps(MockString as jest.Mock)
            const errors = stringProps.errors as FieldValidationError[]
            expect(errors.length).toBeGreaterThan(0)

            expect(screen.queryByTestId('error-1')).toBeNull()
        })

        it('onChange includes validation result', () => {
            const definition = baseDef([{ id: 1, type: 'string', label: 'Name', validation: { required: true } }])
            const values = {}
            const onChange = jest.fn()

            renderEditor({ definition, data: doc(values) }, { components: makeComponents(true), onChange })

            const stringProps = lastCallProps(MockString as jest.Mock)
            const fieldOnChange = stringProps.onChange as (value: unknown) => void
            fieldOnChange('')

            expect(onChange).toHaveBeenCalledTimes(1)
            const [, validation] = onChange.mock.calls[0] as [FormDocument, FormValidationResult]
            expect(validation.valid).toBe(false)
            expect(validation.fieldErrors.size).toBeGreaterThan(0)
        })
    })

    describe('section filter', () => {
        const sectionDef = () =>
            baseDef([
                { id: 1, type: 'string', label: 'Top' },
                {
                    id: 2,
                    type: 'section',
                    title: 'Sec',
                    content: [{ id: 3, type: 'number', label: 'Inner' }],
                },
                { id: 4, type: 'boolean', label: 'Another top' },
            ])

        it('renders all content when section filter is undefined', () => {
            renderEditor(
                { definition: sectionDef(), data: doc({ '1': 'a', '3': 10, '4': true }) },
                { components: makeComponents(), onChange: noop },
            )

            expect(screen.getByTestId('string-1')).toBeTruthy()
            expect(screen.getByTestId('section-2')).toBeTruthy()
            expect(screen.getByTestId('number-3')).toBeTruthy()
            expect(screen.getByTestId('boolean-4')).toBeTruthy()
        })

        it('renders only top-level non-section items when section is ROOT', () => {
            renderEditor(
                { definition: sectionDef(), data: doc({ '1': 'a', '3': 10, '4': true }), section: ROOT },
                { components: makeComponents(), onChange: noop },
            )

            expect(screen.getByTestId('string-1')).toBeTruthy()
            expect(screen.getByTestId('boolean-4')).toBeTruthy()
            expect(screen.queryByTestId('section-2')).toBeNull()
            expect(screen.queryByTestId('number-3')).toBeNull()
        })

        it('renders section wrapper and content when filtering by section id', () => {
            renderEditor(
                { definition: sectionDef(), data: doc({ '1': 'a', '3': 10 }), section: 2 },
                { components: makeComponents(), onChange: noop },
            )

            expect(screen.getByTestId('section-2')).toBeTruthy()
            expect(screen.getByTestId('number-3')).toBeTruthy()
            expect(screen.queryByTestId('string-1')).toBeNull()
        })
    })

    describe('controlled re-render', () => {
        it('updates field values when re-rendered with new values prop', () => {
            const definition = baseDef([{ id: 1, type: 'string', label: 'Name' }])
            const onChange = jest.fn()

            const { rerender } = renderEditor(
                { definition, data: doc({ '1': 'Alice' }) },
                { components: makeComponents(), onChange },
            )

            expect(screen.getByTestId('string-1').textContent).toBe('Alice')

            // Re-render with new values
            rerender(
                <Form definition={definition} data={doc({ '1': 'Bob' })}>
                    <FormEditor components={makeComponents()} onChange={onChange} />
                </Form>,
            )

            expect(screen.getByTestId('string-1').textContent).toBe('Bob')

            // Verify the mock was called with the new value
            const allCalls = (MockString as jest.Mock).mock.calls
            const lastCall = allCalls[allCalls.length - 1][0] as Record<string, unknown>
            expect(lastCall.value).toBe('Bob')
        })
    })

    describe('hidden fields excluded', () => {
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

            renderEditor({ definition, data: doc(values) }, { components: makeComponents(), onChange: noop })

            expect(screen.getByTestId('boolean-1')).toBeTruthy()
            expect(screen.queryByTestId('string-2')).toBeNull()
        })

        it('renders conditionally visible fields when condition is met', () => {
            const definition = baseDef([
                { id: 1, type: 'boolean', label: 'Toggle' },
                {
                    id: 2,
                    type: 'string',
                    label: 'Conditional',
                    condition: { field: 1, op: 'eq' as const, value: true },
                },
            ])
            const values = { '1': true }

            renderEditor({ definition, data: doc(values) }, { components: makeComponents(), onChange: noop })

            expect(screen.getByTestId('boolean-1')).toBeTruthy()
            expect(screen.getByTestId('string-2')).toBeTruthy()
        })

        it('does not render hidden sections and their children', () => {
            const definition = baseDef([
                { id: 1, type: 'boolean', label: 'Toggle' },
                {
                    id: 2,
                    type: 'section',
                    title: 'Hidden Section',
                    condition: { field: 1, op: 'eq' as const, value: true },
                    content: [{ id: 3, type: 'string', label: 'Inner' }],
                },
            ])
            const values = { '1': false }

            renderEditor({ definition, data: doc(values) }, { components: makeComponents(), onChange: noop })

            expect(screen.getByTestId('boolean-1')).toBeTruthy()
            expect(screen.queryByTestId('section-2')).toBeNull()
            expect(screen.queryByTestId('string-3')).toBeNull()
        })
    })

    describe('file field', () => {
        const fileValue = {
            name: 'doc.pdf',
            mimeType: 'application/pdf',
            size: 1024,
            url: 'https://example.com/doc.pdf',
        }

        it('renders file field editor with onChange prop', () => {
            const definition = baseDef([{ id: 1, type: 'file', label: 'Resume' }])
            const values = { '1': fileValue }

            renderEditor({ definition, data: doc(values) }, { components: makeComponents(), onChange: noop })

            expect(screen.getByTestId('file-1').textContent).toBe('doc.pdf')
            expect(MockFile).toHaveBeenCalledWith(
                expect.objectContaining({
                    field: definition.content[0],
                    value: fileValue,
                    errors: [],
                    onChange: expect.any(Function),
                }),
                undefined,
            )
        })

        it('onChange callback updates values with new file', () => {
            const definition = baseDef([{ id: 1, type: 'file', label: 'Resume' }])
            const onChange = jest.fn()

            renderEditor({ definition, data: doc({ '1': fileValue }) }, { components: makeComponents(), onChange })

            const fileProps = lastCallProps(MockFile as jest.Mock)
            const fieldOnChange = fileProps.onChange as (value: unknown) => void
            const newFile = {
                name: 'new.pdf',
                mimeType: 'application/pdf',
                size: 2048,
                url: 'https://example.com/new.pdf',
            }
            fieldOnChange(newFile)

            expect(onChange).toHaveBeenCalledTimes(1)
            const [newDoc] = onChange.mock.calls[0] as [FormDocument]
            expect(newDoc.values['1']).toEqual(newFile)
        })

        it('renders file items in array with add/remove', () => {
            const definition = baseDef([
                {
                    id: 1,
                    type: 'array',
                    label: 'Attachments',
                    item: { type: 'file', label: 'Attachment' },
                },
            ])
            const values = { '1': [fileValue] }
            const onChange = jest.fn()

            renderEditor({ definition, data: doc(values) }, { components: makeComponents(), onChange })

            expect(screen.getByTestId('array-1')).toBeTruthy()

            // Add item
            const arrayProps = lastCallProps(MockArray as jest.Mock)
            const onAddItem = arrayProps.onAddItem as () => void
            onAddItem()

            expect(onChange).toHaveBeenCalledTimes(1)
            const [newDoc] = onChange.mock.calls[0] as [FormDocument]
            expect(newDoc.values['1']).toEqual([fileValue, undefined])
        })
    })

    describe('array item onChange', () => {
        it('updates a specific array item and triggers parent onChange', () => {
            const definition = baseDef([
                {
                    id: 1,
                    type: 'array',
                    label: 'Tags',
                    item: { type: 'string', label: 'Tag' },
                },
            ])
            const values = { '1': ['foo', 'bar'] }
            const onChange = jest.fn()

            renderEditor({ definition, data: doc(values) }, { components: makeComponents(), onChange })

            // Array items are rendered as string components — find the call for the second item
            const stringCalls = (MockString as jest.Mock).mock.calls
            const secondItemCall = stringCalls.find((c: unknown[]) => (c[0] as Record<string, unknown>).value === 'bar')
            expect(secondItemCall).toBeDefined()

            const itemOnChange = (secondItemCall?.[0] as Record<string, unknown>).onChange as (value: unknown) => void
            itemOnChange('baz')

            expect(onChange).toHaveBeenCalledTimes(1)
            const [newDoc] = onChange.mock.calls[0] as [FormDocument]
            expect(newDoc.values['1']).toEqual(['foo', 'baz'])
        })
    })

    describe('submittedAt', () => {
        it('preserves submittedAt in onChange', () => {
            const definition = baseDef([{ id: 1, type: 'string', label: 'Name' }])
            const onChange = jest.fn()

            renderEditor(
                { definition, data: doc({ '1': 'Alice' }, '2026-01-15T10:00:00.000Z') },
                { components: makeComponents(), onChange },
            )

            const stringProps = lastCallProps(MockString as jest.Mock)
            const fieldOnChange = stringProps.onChange as (value: unknown) => void
            fieldOnChange('Bob')

            expect(onChange).toHaveBeenCalledTimes(1)
            const [newDoc] = onChange.mock.calls[0] as [FormDocument]
            expect(newDoc.form.submittedAt).toBe('2026-01-15T10:00:00.000Z')
        })
    })

    it('throws when rendered without a Form provider', () => {
        const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {})

        expect(() => render(<FormEditor components={makeComponents()} onChange={noop} />)).toThrow(
            'useFormContext must be used within a <Form> provider',
        )

        consoleSpy.mockRestore()
    })

    it('returns null when document errors exist (duplicate IDs)', () => {
        const definition = baseDef([
            { id: 1, type: 'string', label: 'Name' },
            { id: 1, type: 'number', label: 'Duplicate' },
        ])
        const values = { '1': 'Alice' }

        const { container } = renderEditor(
            { definition, data: doc(values) },
            { components: makeComponents(), onChange: noop },
        )

        expect(container.innerHTML).toBe('')
    })

    it('returns null when no definition provided', () => {
        const { container } = render(
            <Form data={doc({ '1': 'Alice' })}>
                <FormEditor components={makeComponents()} onChange={noop} />
            </Form>,
        )

        expect(container.innerHTML).toBe('')
    })

    it('returns null when no data provided', () => {
        const definition = baseDef([{ id: 1, type: 'string', label: 'Name' }])

        const { container } = render(
            <Form definition={definition}>
                <FormEditor components={makeComponents()} onChange={noop} />
            </Form>,
        )

        expect(container.innerHTML).toBe('')
    })
})
