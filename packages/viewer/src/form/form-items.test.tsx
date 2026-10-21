import { type FC, type ReactNode } from 'react'

import {
    type ContentItem,
    type FieldContentItem,
    type FieldValidationError,
    FormEngine,
    type FormValues,
    type SectionContentItem,
    type StaticFieldContentItem,
    type SustainabilityValue,
} from '@bluprynt/forms-core'
import { render, screen } from '@testing-library/react'

import type { EditorArrayItemProps, EditorFieldProps, ViewerComponentMap } from '../types'
import { FormItems } from './form-items'

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

const MockArrayObj: FC<Record<string, unknown>> = jest.fn((props) => {
    const rows = (props.children as ReactNode[][]) ?? []
    return (
        <div data-testid={`array-obj-${(props.field as FieldContentItem).id}`} data-rows={rows.length}>
            {rows.map((cells, index) => (
                // biome-ignore lint/suspicious/noArrayIndexKey: index is unique in the row list
                <div key={index} data-testid={`row-${index}`} data-cells={cells.length}>
                    {cells}
                </div>
            ))}
        </div>
    )
})

const MockFile: FC<Record<string, unknown>> = jest.fn((props) => (
    <div data-testid={`file-${(props.field as FieldContentItem).id}`}>{String(props.value ?? '')}</div>
))

const MockMultiselect: FC<Record<string, unknown>> = jest.fn((props) => (
    <div data-testid={`multiselect-${(props.field as FieldContentItem).id}`}>
        {((props.value as (string | number)[] | undefined) ?? []).join(',')}
    </div>
))

const MockStatic: FC<Record<string, unknown>> = jest.fn((props) => (
    <div data-testid={`static-${(props.field as StaticFieldContentItem).id}`}>
        {(props.field as StaticFieldContentItem).text}
    </div>
))

const MockBlockchain: FC<Record<string, unknown>> = jest.fn((props) => (
    <div data-testid={`blockchain-${(props.field as FieldContentItem).id}`}>{String(props.value ?? '')}</div>
))

const MockSustainability: FC<Record<string, unknown>> = jest.fn((props) => (
    <div data-testid={`sustainability-${(props.field as FieldContentItem).id}`}>
        {(props.value as SustainabilityValue | undefined)?.address ?? ''}
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

/** The same map plus every optional key, for the newer field types. */
const makeComponentsWithNewTypes = (withError = false): ViewerComponentMap => ({
    ...makeComponents(withError),
    array_obj: MockArrayObj as ViewerComponentMap['array_obj'],
    multiselect: MockMultiselect as ViewerComponentMap['multiselect'],
    static: MockStatic as ViewerComponentMap['static'],
    blockchain: MockBlockchain as ViewerComponentMap['blockchain'],
    sustainability: MockSustainability as ViewerComponentMap['sustainability'],
})

// ── Helpers ──

const lastCallProps = (mock: jest.Mock): Record<string, unknown> => {
    const calls = mock.mock.calls
    return calls[calls.length - 1][0] as Record<string, unknown>
}

beforeEach(() => {
    jest.clearAllMocks()
})

// ── Tests ──

describe('FormItems', () => {
    describe('renders fields by type', () => {
        it('renders string, number, boolean, date, select, file fields', () => {
            const items: ContentItem[] = [
                { id: 1, type: 'string', label: 'Name' } as ContentItem,
                { id: 2, type: 'number', label: 'Age' } as ContentItem,
                { id: 3, type: 'boolean', label: 'Active' } as ContentItem,
                { id: 4, type: 'date', label: 'DOB' } as ContentItem,
                {
                    id: 5,
                    type: 'select',
                    label: 'Color',
                    options: [
                        { value: 'r', label: 'Red' },
                        { value: 'b', label: 'Blue' },
                    ],
                } as ContentItem,
                { id: 6, type: 'file', label: 'Resume' } as ContentItem,
            ]

            const visibilityMap = new Map(items.map((i) => [i.id, true]))
            const values: FormValues = { '1': 'Alice', '2': 42, '3': true, '4': '2025-01-01', '5': 'r', '6': undefined }

            render(
                <FormItems
                    items={items}
                    visibilityMap={visibilityMap}
                    values={values}
                    fieldErrors={new Map()}
                    components={makeComponents()}
                    showInlineValidation={false}
                />,
            )

            expect(screen.getByTestId('string-1').textContent).toBe('Alice')
            expect(screen.getByTestId('number-2').textContent).toBe('42')
            expect(screen.getByTestId('boolean-3').textContent).toBe('true')
            expect(screen.getByTestId('date-4').textContent).toBe('2025-01-01')
            expect(screen.getByTestId('select-5').textContent).toBe('r')
            expect(screen.getByTestId('file-6')).toBeTruthy()
        })
    })

    describe('visibility filtering', () => {
        it('skips items not in visibility map', () => {
            const items: ContentItem[] = [
                { id: 1, type: 'string', label: 'Visible' } as ContentItem,
                { id: 2, type: 'string', label: 'Hidden' } as ContentItem,
            ]

            const visibilityMap = new Map<number, boolean>([
                [1, true],
                [2, false],
            ])

            render(
                <FormItems
                    items={items}
                    visibilityMap={visibilityMap}
                    values={{ '1': 'v', '2': 'h' }}
                    fieldErrors={new Map()}
                    components={makeComponents()}
                    showInlineValidation={false}
                />,
            )

            expect(screen.getByTestId('string-1')).toBeTruthy()
            expect(screen.queryByTestId('string-2')).toBeNull()
        })

        it('returns null when all items are hidden', () => {
            const items: ContentItem[] = [{ id: 1, type: 'string', label: 'Hidden' } as ContentItem]
            const visibilityMap = new Map<number, boolean>([[1, false]])

            const { container } = render(
                <FormItems
                    items={items}
                    visibilityMap={visibilityMap}
                    values={{}}
                    fieldErrors={new Map()}
                    components={makeComponents()}
                    showInlineValidation={false}
                />,
            )

            expect(container.innerHTML).toBe('')
        })

        it('returns null for empty items array', () => {
            const { container } = render(
                <FormItems
                    items={[]}
                    visibilityMap={new Map()}
                    values={{}}
                    fieldErrors={new Map()}
                    components={makeComponents()}
                    showInlineValidation={false}
                />,
            )

            expect(container.innerHTML).toBe('')
        })
    })

    describe('sections', () => {
        it('renders section component with nested content', () => {
            const items: ContentItem[] = [
                {
                    id: 1,
                    type: 'section',
                    title: 'Details',
                    content: [{ id: 2, type: 'string', label: 'Name' } as ContentItem],
                } as ContentItem,
            ]

            const visibilityMap = new Map<number, boolean>([
                [1, true],
                [2, true],
            ])

            render(
                <FormItems
                    items={items}
                    visibilityMap={visibilityMap}
                    values={{ '2': 'Alice' }}
                    fieldErrors={new Map()}
                    components={makeComponents()}
                    showInlineValidation={false}
                />,
            )

            expect(screen.getByTestId('section-1')).toBeTruthy()
            expect(screen.getByTestId('string-2')).toBeTruthy()
            expect(screen.getByTestId('string-2').textContent).toBe('Alice')
        })

        it('passes section item to SectionComponent', () => {
            const sectionItem = {
                id: 1,
                type: 'section',
                title: 'Details',
                content: [{ id: 2, type: 'string', label: 'Name' } as ContentItem],
            } as ContentItem

            render(
                <FormItems
                    items={[sectionItem]}
                    visibilityMap={
                        new Map([
                            [1, true],
                            [2, true],
                        ])
                    }
                    values={{}}
                    fieldErrors={new Map()}
                    components={makeComponents()}
                    showInlineValidation={false}
                />,
            )

            expect(MockSection).toHaveBeenCalledWith(expect.objectContaining({ section: sectionItem }), undefined)
        })
        it('renders no section component for a section whose fields are all hidden', () => {
            const sectionItem: ContentItem = {
                id: 10,
                type: 'section',
                title: 'Conditional',
                content: [
                    { id: 11, type: 'static', text: 'Intro' },
                    { id: 12, type: 'string', label: 'Detail', condition: { field: 1, op: 'eq', value: true } },
                ],
            }
            const toggle: ContentItem = { id: 1, type: 'boolean', label: 'Toggle' }
            const engine = new FormEngine({ id: 'f', version: '1.0.0', title: 'F', content: [toggle, sectionItem] })
            const values = { '1': false }

            render(
                <FormItems
                    items={[toggle, sectionItem]}
                    visibilityMap={engine.getVisibilityMap({
                        form: { id: 'f', version: '1.0.0', submittedAt: '2025-06-15T00:00:00.000Z' },
                        values,
                    })}
                    values={values}
                    fieldErrors={new Map()}
                    components={makeComponentsWithNewTypes()}
                    showInlineValidation={false}
                />,
            )

            expect(screen.getByTestId('boolean-1')).toBeTruthy()
            expect(screen.queryByTestId('section-10')).toBeNull()
            expect(MockSection).not.toHaveBeenCalled()
        })
    })

    describe('select field options', () => {
        it('passes options prop to select component', () => {
            const options = [
                { value: 'r', label: 'Red' },
                { value: 'b', label: 'Blue' },
            ]
            const items: ContentItem[] = [{ id: 1, type: 'select', label: 'Color', options } as ContentItem]

            render(
                <FormItems
                    items={items}
                    visibilityMap={new Map([[1, true]])}
                    values={{ '1': 'r' }}
                    fieldErrors={new Map()}
                    components={makeComponents()}
                    showInlineValidation={false}
                />,
            )

            expect(MockSelect).toHaveBeenCalledWith(expect.objectContaining({ options }), undefined)
        })
    })

    describe('error component', () => {
        const makeError = (fieldId: number, message: string): FieldValidationError => ({
            fieldId,
            rule: 'REQUIRED',
            message,
        })

        it('renders error component when showInlineValidation is true and errors exist', () => {
            const items: ContentItem[] = [{ id: 1, type: 'string', label: 'Name' } as ContentItem]
            const fieldErrors = new Map<number, FieldValidationError[]>([[1, [makeError(1, 'Required')]]])

            render(
                <FormItems
                    items={items}
                    visibilityMap={new Map([[1, true]])}
                    values={{}}
                    fieldErrors={fieldErrors}
                    components={makeComponents(true)}
                    showInlineValidation={true}
                />,
            )

            expect(screen.getByTestId('error-1')).toBeTruthy()
            expect(screen.getByTestId('error-1').textContent).toBe('Required')
        })

        it('does not render error component when showInlineValidation is false', () => {
            const items: ContentItem[] = [{ id: 1, type: 'string', label: 'Name' } as ContentItem]
            const fieldErrors = new Map<number, FieldValidationError[]>([[1, [makeError(1, 'Required')]]])

            render(
                <FormItems
                    items={items}
                    visibilityMap={new Map([[1, true]])}
                    values={{}}
                    fieldErrors={fieldErrors}
                    components={makeComponents(true)}
                    showInlineValidation={false}
                />,
            )

            expect(screen.queryByTestId('error-1')).toBeNull()
        })

        it('does not render error component when error component is not provided', () => {
            const items: ContentItem[] = [{ id: 1, type: 'string', label: 'Name' } as ContentItem]
            const fieldErrors = new Map<number, FieldValidationError[]>([[1, [makeError(1, 'Required')]]])

            render(
                <FormItems
                    items={items}
                    visibilityMap={new Map([[1, true]])}
                    values={{}}
                    fieldErrors={fieldErrors}
                    components={makeComponents(false)}
                    showInlineValidation={true}
                />,
            )

            expect(screen.queryByTestId('error-1')).toBeNull()
        })

        it('does not render error component when field has no errors', () => {
            const items: ContentItem[] = [{ id: 1, type: 'string', label: 'Name' } as ContentItem]

            render(
                <FormItems
                    items={items}
                    visibilityMap={new Map([[1, true]])}
                    values={{ '1': 'Alice' }}
                    fieldErrors={new Map()}
                    components={makeComponents(true)}
                    showInlineValidation={true}
                />,
            )

            expect(screen.queryByTestId('error-1')).toBeNull()
        })
    })

    describe('array fields', () => {
        it('renders array component with children items', () => {
            const items: ContentItem[] = [
                {
                    id: 1,
                    type: 'array',
                    label: 'Tags',
                    item: { type: 'string', label: 'Tag' },
                } as ContentItem,
            ]

            render(
                <FormItems
                    items={items}
                    visibilityMap={new Map([[1, true]])}
                    values={{ '1': ['foo', 'bar'] }}
                    fieldErrors={new Map()}
                    components={makeComponents()}
                    showInlineValidation={false}
                />,
            )

            expect(screen.getByTestId('array-1')).toBeTruthy()
            // Array renders its item components as children
            expect(MockArray).toHaveBeenCalledWith(
                expect.objectContaining({
                    field: items[0],
                    value: ['foo', 'bar'],
                    itemDef: { type: 'string', label: 'Tag' },
                }),
                undefined,
            )
        })

        it('renders item components for each array value', () => {
            const items: ContentItem[] = [
                {
                    id: 1,
                    type: 'array',
                    label: 'Tags',
                    item: { type: 'string', label: 'Tag' },
                } as ContentItem,
            ]

            render(
                <FormItems
                    items={items}
                    visibilityMap={new Map([[1, true]])}
                    values={{ '1': ['a', 'b', 'c'] }}
                    fieldErrors={new Map()}
                    components={makeComponents()}
                    showInlineValidation={false}
                />,
            )

            // MockString is called for each array item
            const stringCalls = (MockString as jest.Mock).mock.calls
            const arrayItemCalls = stringCalls.filter(
                (c: unknown[]) => (c[0] as Record<string, unknown>).field !== undefined,
            )
            expect(arrayItemCalls.length).toBe(3)
        })

        it('renders empty array without item components', () => {
            const items: ContentItem[] = [
                {
                    id: 1,
                    type: 'array',
                    label: 'Tags',
                    item: { type: 'string', label: 'Tag' },
                } as ContentItem,
            ]

            render(
                <FormItems
                    items={items}
                    visibilityMap={new Map([[1, true]])}
                    values={{ '1': [] }}
                    fieldErrors={new Map()}
                    components={makeComponents()}
                    showInlineValidation={false}
                />,
            )

            expect(screen.getByTestId('array-1')).toBeTruthy()
            expect(MockString).not.toHaveBeenCalled()
        })

        it('handles array with undefined value', () => {
            const items: ContentItem[] = [
                {
                    id: 1,
                    type: 'array',
                    label: 'Tags',
                    item: { type: 'string', label: 'Tag' },
                } as ContentItem,
            ]

            render(
                <FormItems
                    items={items}
                    visibilityMap={new Map([[1, true]])}
                    values={{}}
                    fieldErrors={new Map()}
                    components={makeComponents()}
                    showInlineValidation={false}
                />,
            )

            expect(screen.getByTestId('array-1')).toBeTruthy()
            expect(MockArray).toHaveBeenCalledWith(expect.objectContaining({ value: undefined }), undefined)
        })

        it('passes select options to array item components with select type', () => {
            const options = [
                { value: 'r', label: 'Red' },
                { value: 'b', label: 'Blue' },
            ]
            const items: ContentItem[] = [
                {
                    id: 1,
                    type: 'array',
                    label: 'Colors',
                    item: { type: 'select', label: 'Color', options },
                } as ContentItem,
            ]

            render(
                <FormItems
                    items={items}
                    visibilityMap={new Map([[1, true]])}
                    values={{ '1': ['r'] }}
                    fieldErrors={new Map()}
                    components={makeComponents()}
                    showInlineValidation={false}
                />,
            )

            expect(MockSelect).toHaveBeenCalledWith(expect.objectContaining({ options }), undefined)
        })

        it('renders error for array field-level errors', () => {
            const items: ContentItem[] = [
                {
                    id: 1,
                    type: 'array',
                    label: 'Tags',
                    item: { type: 'string', label: 'Tag' },
                } as ContentItem,
            ]
            const fieldErrors = new Map<number, FieldValidationError[]>([
                [1, [{ fieldId: 1, rule: 'MIN_ITEMS', message: 'At least 1 item' }]],
            ])

            render(
                <FormItems
                    items={items}
                    visibilityMap={new Map([[1, true]])}
                    values={{ '1': [] }}
                    fieldErrors={fieldErrors}
                    components={makeComponents(true)}
                    showInlineValidation={true}
                />,
            )

            expect(screen.getByTestId('error-1')).toBeTruthy()
            expect(screen.getByTestId('error-1').textContent).toBe('At least 1 item')
        })

        it('renders error for array item-level errors', () => {
            const items: ContentItem[] = [
                {
                    id: 1,
                    type: 'array',
                    label: 'Tags',
                    item: { type: 'string', label: 'Tag', validation: { required: true } },
                } as ContentItem,
            ]
            const fieldErrors = new Map<number, FieldValidationError[]>([
                [1, [{ fieldId: 1, rule: 'REQUIRED', message: 'Required', itemIndex: 0 }]],
            ])

            render(
                <FormItems
                    items={items}
                    visibilityMap={new Map([[1, true]])}
                    values={{ '1': [''] }}
                    fieldErrors={fieldErrors}
                    components={makeComponents(true)}
                    showInlineValidation={true}
                />,
            )

            // Item-level error rendered within array children
            const errorCalls = (MockError as jest.Mock).mock.calls
            const itemErrorCall = errorCalls.find((c: unknown[]) => {
                const errors = (c[0] as Record<string, unknown>).errors as FieldValidationError[]
                return errors.some((e) => e.itemIndex === 0)
            })
            expect(itemErrorCall).toBeDefined()
        })
    })

    describe('array_obj fields', () => {
        const directors = (): ContentItem =>
            ({
                id: 10,
                type: 'array_obj',
                label: 'Directors',
                items: [
                    { id: 11, type: 'string', label: 'Name' },
                    { id: 12, type: 'select', label: 'Role', options: [{ value: 'ceo', label: 'CEO' }] },
                    { id: 13, type: 'static', text: 'Checked against filings' },
                ],
            }) as ContentItem

        const renderField = (values: FormValues, fieldErrors = new Map<number, FieldValidationError[]>()) =>
            render(
                <FormItems
                    items={[directors()]}
                    visibilityMap={new Map([[10, true]])}
                    values={values}
                    fieldErrors={fieldErrors}
                    components={makeComponentsWithNewTypes(true)}
                    showInlineValidation
                />,
            )

        it('renders one child list per row, one cell per sub-field', () => {
            renderField({ '10': [{ '11': 'Jane' }, { '11': 'John' }] })

            expect(screen.getByTestId('array-obj-10').dataset.rows).toBe('2')
            expect(screen.getAllByTestId(/^row-/)).toHaveLength(2)
            for (const row of screen.getAllByTestId(/^row-/)) {
                expect(row.dataset.cells).toBe('3')
            }
        })

        it('passes each cell its own value keyed by sub-field id', () => {
            renderField({ '10': [{ '11': 'Jane', '12': 'ceo' }] })

            expect(screen.getByTestId('string-11').textContent).toBe('Jane')
            expect(screen.getByTestId('select-12').textContent).toBe('ceo')
        })

        it('injects options into a select sub-field', () => {
            renderField({ '10': [{}] })
            expect(lastCallProps(MockSelect as unknown as jest.Mock).options).toEqual([{ value: 'ceo', label: 'CEO' }])
        })

        it('gives a static sub-field the field and nothing else', () => {
            renderField({ '10': [{}] })

            const props = lastCallProps(MockStatic as unknown as jest.Mock)
            expect(Object.keys(props)).toEqual(['field'])
            expect(screen.getByTestId('static-13').textContent).toBe('Checked against filings')
        })

        it('passes the field, the whole value and itemsDef to the container', () => {
            const value = [{ '11': 'Jane' }]
            renderField({ '10': value })

            const props = lastCallProps(MockArrayObj as unknown as jest.Mock)
            expect(props.value).toEqual(value)
            expect(props.itemsDef).toHaveLength(3)
            expect((props.field as FieldContentItem).id).toBe(10)
        })

        it('resolves an absent kind to "list"', () => {
            renderField({ '10': [{}] })
            expect(lastCallProps(MockArrayObj as unknown as jest.Mock).kind).toBe('list')
        })

        it('passes the declared kind through', () => {
            const items: ContentItem[] = [{ ...(directors() as FieldContentItem), kind: 'table' } as ContentItem]
            render(
                <FormItems
                    items={items}
                    visibilityMap={new Map([[10, true]])}
                    values={{ '10': [{}] }}
                    fieldErrors={new Map()}
                    components={makeComponentsWithNewTypes()}
                    showInlineValidation={false}
                />,
            )

            expect(lastCallProps(MockArrayObj as unknown as jest.Mock).kind).toBe('table')
        })

        it('renders nothing for an absent value', () => {
            renderField({})
            expect(screen.getByTestId('array-obj-10').dataset.rows).toBe('0')
        })

        it('routes a cell error to that cell only', () => {
            const fieldErrors = new Map<number, FieldValidationError[]>([
                [10, [{ fieldId: 10, rule: 'REQUIRED', message: 'Name: Is required', itemIndex: 1, itemFieldId: 11 }]],
            ])
            renderField({ '10': [{ '11': 'Jane' }, {}] }, fieldErrors)

            expect(screen.getByTestId('error-11').textContent).toBe('Name: Is required')
            expect(lastCallProps(MockArrayObj as unknown as jest.Mock).errors).toEqual([])
        })

        it('routes a field-level error to the container', () => {
            const fieldErrors = new Map<number, FieldValidationError[]>([
                [10, [{ fieldId: 10, rule: 'MIN_ITEMS', message: 'Must have at least 1 items' }]],
            ])
            renderField({ '10': [] }, fieldErrors)

            expect(screen.getByTestId('error-10').textContent).toBe('Must have at least 1 items')
        })

        it('surfaces a row-level error on the container', () => {
            const fieldErrors = new Map<number, FieldValidationError[]>([
                [10, [{ fieldId: 10, rule: 'TYPE', message: 'Must be an object', itemIndex: 0 }]],
            ])
            renderField({ '10': ['oops'] }, fieldErrors)

            expect(screen.getByTestId('error-10').textContent).toBe('Must be an object')
        })

        it('renders nothing when no array_obj component is supplied', () => {
            render(
                <FormItems
                    items={[directors()]}
                    visibilityMap={new Map([[10, true]])}
                    values={{ '10': [{ '11': 'Jane' }] }}
                    fieldErrors={new Map()}
                    components={makeComponents()}
                    showInlineValidation={false}
                />,
            )

            expect(screen.queryByTestId('array-obj-10')).toBeNull()
            expect(screen.queryByTestId('string-11')).toBeNull()
        })

        it('skips a sub-field whose component is missing without dropping the row', () => {
            const items: ContentItem[] = [
                {
                    id: 10,
                    type: 'array_obj',
                    label: 'Wallets',
                    items: [
                        { id: 11, type: 'string', label: 'Label' },
                        { id: 12, type: 'blockchain', label: 'Address' },
                    ],
                } as ContentItem,
            ]

            // `blockchain` is an optional map key -- leaving it out must not drop the row.
            const { blockchain: _blockchain, ...components } = makeComponentsWithNewTypes()

            render(
                <FormItems
                    items={items}
                    visibilityMap={new Map([[10, true]])}
                    values={{ '10': [{ '11': 'Cold storage', '12': 'eip155:1:0x0' }] }}
                    fieldErrors={new Map()}
                    components={components}
                    showInlineValidation={false}
                />,
            )

            expect(screen.getByTestId('string-11').textContent).toBe('Cold storage')
            expect(screen.queryByTestId('blockchain-12')).toBeNull()
            expect(screen.getByTestId('row-0').dataset.cells).toBe('2')
        })
    })

    describe('renderFieldProps integration', () => {
        it('spreads editor props onto field components', () => {
            const onChange = jest.fn()
            const renderFieldProps = jest.fn((_field: FieldContentItem): EditorFieldProps => ({ onChange }))

            const items: ContentItem[] = [{ id: 1, type: 'string', label: 'Name' } as ContentItem]

            render(
                <FormItems
                    items={items}
                    visibilityMap={new Map([[1, true]])}
                    values={{ '1': 'test' }}
                    fieldErrors={new Map()}
                    components={makeComponents()}
                    showInlineValidation={false}
                    renderFieldProps={renderFieldProps}
                />,
            )

            expect(renderFieldProps).toHaveBeenCalled()
            const stringProps = lastCallProps(MockString as jest.Mock)
            expect(stringProps.onChange).toBe(onChange)
        })
    })

    describe('renderArrayItemProps integration', () => {
        it('spreads editor item props onto array item components', () => {
            const itemOnChange = jest.fn()
            const renderArrayItemProps = jest.fn(
                (_field: FieldContentItem, _index: number): EditorArrayItemProps => ({ onChange: itemOnChange }),
            )

            const items: ContentItem[] = [
                {
                    id: 1,
                    type: 'array',
                    label: 'Tags',
                    item: { type: 'string', label: 'Tag' },
                } as ContentItem,
            ]

            render(
                <FormItems
                    items={items}
                    visibilityMap={new Map([[1, true]])}
                    values={{ '1': ['a'] }}
                    fieldErrors={new Map()}
                    components={makeComponents()}
                    showInlineValidation={false}
                    renderArrayItemProps={renderArrayItemProps}
                />,
            )

            expect(renderArrayItemProps).toHaveBeenCalledTimes(1)
            const stringProps = lastCallProps(MockString as jest.Mock)
            expect(stringProps.onChange).toBe(itemOnChange)
        })
    })

    describe('field props', () => {
        it('passes field, value, and errors to each field component', () => {
            const fieldItem = { id: 1, type: 'string', label: 'Name' } as ContentItem
            const errors: FieldValidationError[] = [{ fieldId: 1, rule: 'REQUIRED', message: 'Required' }]

            render(
                <FormItems
                    items={[fieldItem]}
                    visibilityMap={new Map([[1, true]])}
                    values={{ '1': 'Alice' }}
                    fieldErrors={new Map([[1, errors]])}
                    components={makeComponents()}
                    showInlineValidation={false}
                />,
            )

            expect(MockString).toHaveBeenCalledWith(
                expect.objectContaining({
                    field: fieldItem,
                    value: 'Alice',
                    errors,
                }),
                undefined,
            )
        })

        it('passes empty errors array when field has no errors', () => {
            const fieldItem = { id: 1, type: 'string', label: 'Name' } as ContentItem

            render(
                <FormItems
                    items={[fieldItem]}
                    visibilityMap={new Map([[1, true]])}
                    values={{ '1': 'Alice' }}
                    fieldErrors={new Map()}
                    components={makeComponents()}
                    showInlineValidation={false}
                />,
            )

            expect(MockString).toHaveBeenCalledWith(expect.objectContaining({ errors: [] }), undefined)
        })
    })
    describe('static fields', () => {
        const staticItem = (overrides: Record<string, unknown> = {}): ContentItem =>
            ({ id: 1, type: 'static', text: 'Read this first.', ...overrides }) as ContentItem

        it('renders the static component with only the field prop', () => {
            render(
                <FormItems
                    items={[staticItem()]}
                    visibilityMap={new Map([[1, true]])}
                    values={{}}
                    fieldErrors={new Map()}
                    components={makeComponentsWithNewTypes()}
                    showInlineValidation={false}
                />,
            )

            expect(screen.getByTestId('static-1').textContent).toBe('Read this first.')

            const props = lastCallProps(MockStatic as unknown as jest.Mock)
            expect(Object.keys(props)).toEqual(['field'])
            expect(props.value).toBeUndefined()
            expect(props.errors).toBeUndefined()
            expect(props.onChange).toBeUndefined()
        })

        it('passes no suggestion even when the document has one for that id', () => {
            render(
                <FormItems
                    items={[staticItem()]}
                    visibilityMap={new Map([[1, true]])}
                    values={{}}
                    suggestions={{ '1': { value: 'x', confidence: 0.5, source: 'doc' } }}
                    fieldErrors={new Map()}
                    components={makeComponentsWithNewTypes()}
                    showInlineValidation={false}
                />,
            )
            expect(lastCallProps(MockStatic as unknown as jest.Mock).suggestion).toBeUndefined()
        })

        it('renders no inline error component for a static field', () => {
            render(
                <FormItems
                    items={[staticItem()]}
                    visibilityMap={new Map([[1, true]])}
                    values={{}}
                    fieldErrors={new Map([[1, [{ fieldId: 1, rule: 'REQUIRED', message: 'nope' }]]])}
                    components={makeComponentsWithNewTypes(true)}
                    showInlineValidation
                />,
            )
            expect(screen.queryByTestId('error-1')).toBeNull()
        })

        it('honours visibility', () => {
            render(
                <FormItems
                    items={[staticItem()]}
                    visibilityMap={new Map([[1, false]])}
                    values={{}}
                    fieldErrors={new Map()}
                    components={makeComponentsWithNewTypes()}
                    showInlineValidation={false}
                />,
            )
            expect(screen.queryByTestId('static-1')).toBeNull()
        })
    })

    describe('multiselect fields', () => {
        const options = [
            { value: 'a', label: 'A' },
            { value: 'b', label: 'B' },
        ]
        const multiselectItem = { id: 1, type: 'multiselect', label: 'Tags', options } as ContentItem

        it('renders the multiselect component with value and options', () => {
            render(
                <FormItems
                    items={[multiselectItem]}
                    visibilityMap={new Map([[1, true]])}
                    values={{ '1': ['a', 'b'] }}
                    fieldErrors={new Map()}
                    components={makeComponentsWithNewTypes()}
                    showInlineValidation={false}
                />,
            )

            expect(screen.getByTestId('multiselect-1').textContent).toBe('a,b')

            const props = lastCallProps(MockMultiselect as unknown as jest.Mock)
            expect(props.options).toEqual(options)
            expect(props.value).toEqual(['a', 'b'])
        })

        it('defaults options to an empty array when the field has none', () => {
            render(
                <FormItems
                    items={[{ id: 1, type: 'multiselect', label: 'Tags' } as ContentItem]}
                    visibilityMap={new Map([[1, true]])}
                    values={{}}
                    fieldErrors={new Map()}
                    components={makeComponentsWithNewTypes()}
                    showInlineValidation={false}
                />,
            )
            expect(lastCallProps(MockMultiselect as unknown as jest.Mock).options).toEqual([])
        })

        it('receives onChange in editor mode', () => {
            const renderFieldProps = (): EditorFieldProps => ({ onChange: jest.fn() })
            render(
                <FormItems
                    items={[multiselectItem]}
                    visibilityMap={new Map([[1, true]])}
                    values={{ '1': ['a'] }}
                    fieldErrors={new Map()}
                    components={makeComponentsWithNewTypes()}
                    showInlineValidation={false}
                    renderFieldProps={renderFieldProps}
                />,
            )
            expect(typeof lastCallProps(MockMultiselect as unknown as jest.Mock).onChange).toBe('function')
        })

        it('renders inline errors like any other field', () => {
            render(
                <FormItems
                    items={[multiselectItem]}
                    visibilityMap={new Map([[1, true]])}
                    values={{ '1': [] }}
                    fieldErrors={new Map([[1, [{ fieldId: 1, rule: 'REQUIRED', message: 'Value is required' }]]])}
                    components={makeComponentsWithNewTypes(true)}
                    showInlineValidation
                />,
            )
            expect(screen.getByTestId('error-1').textContent).toBe('Value is required')
        })
    })

    describe('optional component map keys', () => {
        it('renders nothing instead of crashing when the static component is missing', () => {
            expect(() =>
                render(
                    <FormItems
                        items={[
                            { id: 1, type: 'static', text: 'Note' } as ContentItem,
                            { id: 2, type: 'string', label: 'Name' } as ContentItem,
                        ]}
                        visibilityMap={
                            new Map([
                                [1, true],
                                [2, true],
                            ])
                        }
                        values={{ '2': 'Acme' }}
                        fieldErrors={new Map()}
                        components={makeComponents()}
                        showInlineValidation={false}
                    />,
                ),
            ).not.toThrow()

            expect(screen.queryByTestId('static-1')).toBeNull()
            expect(screen.getByTestId('string-2')).toBeTruthy()
        })

        it('renders nothing instead of crashing when the multiselect component is missing', () => {
            expect(() =>
                render(
                    <FormItems
                        items={[{ id: 1, type: 'multiselect', label: 'Tags', options: [] } as ContentItem]}
                        visibilityMap={new Map([[1, true]])}
                        values={{}}
                        fieldErrors={new Map()}
                        components={makeComponents()}
                        showInlineValidation={false}
                    />,
                ),
            ).not.toThrow()
            expect(screen.queryByTestId('multiselect-1')).toBeNull()
        })
    })

    describe('blockchain and sustainability fields', () => {
        const ADDRESS = 'eip155:1/erc20:0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48'

        it('renders both through their component map keys', () => {
            render(
                <FormItems
                    items={[
                        { id: 1, type: 'blockchain', label: 'Token' } as ContentItem,
                        { id: 2, type: 'sustainability', label: 'Footprint' } as ContentItem,
                    ]}
                    visibilityMap={
                        new Map([
                            [1, true],
                            [2, true],
                        ])
                    }
                    values={{ '1': ADDRESS, '2': { address: ADDRESS, ccri: 'CCRI-1', cmc: '3408' } }}
                    fieldErrors={new Map()}
                    components={makeComponentsWithNewTypes()}
                    showInlineValidation={false}
                />,
            )

            expect(screen.getByTestId('blockchain-1').textContent).toBe(ADDRESS)
            expect(screen.getByTestId('sustainability-2').textContent).toBe(ADDRESS)
        })

        it('passes the value through untouched and injects no options', () => {
            render(
                <FormItems
                    items={[{ id: 1, type: 'sustainability', label: 'Footprint' } as ContentItem]}
                    visibilityMap={new Map([[1, true]])}
                    values={{ '1': { address: ADDRESS, ccri: 'CCRI-1', cmc: '3408' } }}
                    fieldErrors={new Map()}
                    components={makeComponentsWithNewTypes()}
                    showInlineValidation={false}
                />,
            )

            const props = lastCallProps(MockSustainability as unknown as jest.Mock)
            expect(props.value).toEqual({ address: ADDRESS, ccri: 'CCRI-1', cmc: '3408' })
            expect(props.options).toBeUndefined()
        })

        it('renders nothing instead of crashing when their components are missing', () => {
            expect(() =>
                render(
                    <FormItems
                        items={[
                            { id: 1, type: 'blockchain', label: 'Token' } as ContentItem,
                            { id: 2, type: 'sustainability', label: 'Footprint' } as ContentItem,
                            { id: 3, type: 'string', label: 'Name' } as ContentItem,
                        ]}
                        visibilityMap={
                            new Map([
                                [1, true],
                                [2, true],
                                [3, true],
                            ])
                        }
                        values={{ '3': 'Acme' }}
                        fieldErrors={new Map()}
                        components={makeComponents()}
                        showInlineValidation={false}
                    />,
                ),
            ).not.toThrow()

            expect(screen.queryByTestId('blockchain-1')).toBeNull()
            expect(screen.queryByTestId('sustainability-2')).toBeNull()
            expect(screen.getByTestId('string-3')).toBeTruthy()
        })
    })
})
