import type { FC, ReactNode } from 'react'

import type {
    ContentItem,
    FieldContentItem,
    FieldValidationError,
    FormValues,
    SectionContentItem,
} from '@bluprynt/forms-core'
import { render, screen } from '@testing-library/react'

import { DEFAULT, ROOT } from '../constants'
import type { EditorArrayItemProps, EditorComponentMap, EditorFieldProps, ViewerComponentMap } from '../types'
import { FormContent, type FormContentProps } from './form-content'

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
    <div data-testid={`file-${(props.field as FieldContentItem).id}`}>{String(props.value ?? '')}</div>
))

const MockSection: FC<Record<string, unknown>> = jest.fn((props) => (
    <div data-testid={`section-${(props.section as SectionContentItem).id}`}>{props.children as ReactNode}</div>
))

const MockError: FC<Record<string, unknown>> = jest.fn((props) => (
    <div data-testid={`error-${(props.field as FieldContentItem).id}`}>
        {(props.errors as FieldValidationError[]).map((e) => e.message).join(', ')}
    </div>
))

const makeViewerComponents = (): ViewerComponentMap => ({
    string: MockString as ViewerComponentMap['string'],
    number: MockNumber as ViewerComponentMap['number'],
    boolean: MockBoolean as ViewerComponentMap['boolean'],
    date: MockDate as ViewerComponentMap['date'],
    select: MockSelect as ViewerComponentMap['select'],
    array: MockArray as ViewerComponentMap['array'],
    file: MockFile as ViewerComponentMap['file'],
    section: MockSection as ViewerComponentMap['section'],
})

const makeEditorComponents = (): EditorComponentMap => ({
    string: MockString as EditorComponentMap['string'],
    number: MockNumber as EditorComponentMap['number'],
    boolean: MockBoolean as EditorComponentMap['boolean'],
    date: MockDate as EditorComponentMap['date'],
    select: MockSelect as EditorComponentMap['select'],
    array: MockArray as EditorComponentMap['array'],
    file: MockFile as EditorComponentMap['file'],
    section: MockSection as EditorComponentMap['section'],
    error: MockError as EditorComponentMap['error'],
})

const items: ContentItem[] = [
    { id: 1, type: 'string', label: 'Name' } as ContentItem,
    {
        id: 2,
        type: 'section',
        title: 'Details',
        content: [{ id: 3, type: 'number', label: 'Age' } as ContentItem],
    } as ContentItem,
    { id: 4, type: 'boolean', label: 'Active' } as ContentItem,
]

const visibilityMap = new Map<number, boolean>([
    [1, true],
    [2, true],
    [3, true],
    [4, true],
])

const values: FormValues = { '1': 'Alice', '3': 30, '4': true }
const fieldErrors = new Map<number, FieldValidationError[]>()

const renderFieldProps = jest.fn(
    (_field: FieldContentItem): EditorFieldProps => ({
        onChange: jest.fn(),
    }),
)

const renderArrayItemProps = jest.fn(
    (_field: FieldContentItem, _index: number): EditorArrayItemProps => ({
        onChange: jest.fn(),
    }),
)

beforeEach(() => {
    jest.clearAllMocks()
})

describe('FormContent', () => {
    describe('section=undefined — renders all items', () => {
        it('renders all items in viewer mode', () => {
            const props: FormContentProps = {
                mode: 'viewer',
                items,
                visibilityMap,
                values,
                fieldErrors,
                showInlineValidation: false,
                components: makeViewerComponents(),
            }

            render(<FormContent {...props} />)

            expect(screen.getByTestId('string-1')).toBeTruthy()
            expect(screen.getByTestId('section-2')).toBeTruthy()
            expect(screen.getByTestId('number-3')).toBeTruthy()
            expect(screen.getByTestId('boolean-4')).toBeTruthy()
        })

        it('renders all items in editor mode', () => {
            const props: FormContentProps = {
                mode: 'editor',
                items,
                visibilityMap,
                values,
                fieldErrors,
                showInlineValidation: false,
                components: makeEditorComponents(),
                renderFieldProps,
                renderArrayItemProps,
            }

            render(<FormContent {...props} />)

            expect(screen.getByTestId('string-1')).toBeTruthy()
            expect(screen.getByTestId('section-2')).toBeTruthy()
            expect(screen.getByTestId('number-3')).toBeTruthy()
            expect(screen.getByTestId('boolean-4')).toBeTruthy()
        })
    })

    describe('section=ROOT — renders only non-section items', () => {
        it('filters out sections in viewer mode', () => {
            const props: FormContentProps = {
                mode: 'viewer',
                items,
                visibilityMap,
                values,
                fieldErrors,
                section: ROOT,
                showInlineValidation: false,
                components: makeViewerComponents(),
            }

            render(<FormContent {...props} />)

            expect(screen.getByTestId('string-1')).toBeTruthy()
            expect(screen.getByTestId('boolean-4')).toBeTruthy()
            expect(screen.queryByTestId('section-2')).toBeNull()
            expect(screen.queryByTestId('number-3')).toBeNull()
        })

        it('filters out sections in editor mode', () => {
            const props: FormContentProps = {
                mode: 'editor',
                items,
                visibilityMap,
                values,
                fieldErrors,
                section: ROOT,
                showInlineValidation: false,
                components: makeEditorComponents(),
                renderFieldProps,
                renderArrayItemProps,
            }

            render(<FormContent {...props} />)

            expect(screen.getByTestId('string-1')).toBeTruthy()
            expect(screen.getByTestId('boolean-4')).toBeTruthy()
            expect(screen.queryByTestId('section-2')).toBeNull()
        })
    })

    describe('section=<id> — renders specific section', () => {
        it('renders section wrapper and its content', () => {
            const props: FormContentProps = {
                mode: 'viewer',
                items,
                visibilityMap,
                values,
                fieldErrors,
                section: 2,
                showInlineValidation: false,
                components: makeViewerComponents(),
            }

            render(<FormContent {...props} />)

            expect(screen.getByTestId('section-2')).toBeTruthy()
            expect(screen.getByTestId('number-3')).toBeTruthy()
            expect(screen.queryByTestId('string-1')).toBeNull()
            expect(screen.queryByTestId('boolean-4')).toBeNull()
        })

        it('returns null when section is not visible', () => {
            const hiddenVisibility = new Map<number, boolean>([
                [1, true],
                [2, false],
                [3, true],
                [4, true],
            ])

            const props: FormContentProps = {
                mode: 'viewer',
                items,
                visibilityMap: hiddenVisibility,
                values,
                fieldErrors,
                section: 2,
                showInlineValidation: false,
                components: makeViewerComponents(),
            }

            const { container } = render(<FormContent {...props} />)

            expect(container.innerHTML).toBe('')
        })

        it('returns null when section id does not exist', () => {
            const props: FormContentProps = {
                mode: 'viewer',
                items,
                visibilityMap,
                values,
                fieldErrors,
                section: 999,
                showInlineValidation: false,
                components: makeViewerComponents(),
            }

            const { container } = render(<FormContent {...props} />)

            expect(container.innerHTML).toBe('')
        })
    })

    describe('editor mode passes renderFieldProps and renderArrayItemProps', () => {
        it('forwards renderFieldProps to FormItems', () => {
            const props: FormContentProps = {
                mode: 'editor',
                items: [{ id: 1, type: 'string', label: 'Name' } as ContentItem],
                visibilityMap: new Map([[1, true]]),
                values: { '1': 'test' },
                fieldErrors,
                showInlineValidation: false,
                components: makeEditorComponents(),
                renderFieldProps,
                renderArrayItemProps,
            }

            render(<FormContent {...props} />)

            expect(renderFieldProps).toHaveBeenCalled()
        })

        it('forwards renderArrayItemProps for array fields', () => {
            const arrayItems: ContentItem[] = [
                {
                    id: 1,
                    type: 'array',
                    label: 'Tags',
                    item: { type: 'string', label: 'Tag' },
                } as ContentItem,
            ]

            const props: FormContentProps = {
                mode: 'editor',
                items: arrayItems,
                visibilityMap: new Map([[1, true]]),
                values: { '1': ['a', 'b'] },
                fieldErrors,
                showInlineValidation: false,
                components: makeEditorComponents(),
                renderFieldProps,
                renderArrayItemProps,
            }

            render(<FormContent {...props} />)

            expect(renderArrayItemProps).toHaveBeenCalledTimes(2)
        })
    })

    describe('section=DEFAULT — renders first visible section', () => {
        it('renders root fields when they are visible (viewer mode)', () => {
            const props: FormContentProps = {
                mode: 'viewer',
                items,
                visibilityMap,
                values,
                fieldErrors,
                section: DEFAULT,
                showInlineValidation: false,
                components: makeViewerComponents(),
            }

            render(<FormContent {...props} />)

            expect(screen.getByTestId('string-1')).toBeTruthy()
            expect(screen.getByTestId('boolean-4')).toBeTruthy()
            expect(screen.queryByTestId('section-2')).toBeNull()
            expect(screen.queryByTestId('number-3')).toBeNull()
        })

        it('renders root fields when they are visible (editor mode)', () => {
            const props: FormContentProps = {
                mode: 'editor',
                items,
                visibilityMap,
                values,
                fieldErrors,
                section: DEFAULT,
                showInlineValidation: false,
                components: makeEditorComponents(),
                renderFieldProps,
                renderArrayItemProps,
            }

            render(<FormContent {...props} />)

            expect(screen.getByTestId('string-1')).toBeTruthy()
            expect(screen.getByTestId('boolean-4')).toBeTruthy()
            expect(screen.queryByTestId('section-2')).toBeNull()
        })

        it('falls back to first visible section when no root fields are visible', () => {
            const sectionOnlyItems: ContentItem[] = [
                {
                    id: 10,
                    type: 'section',
                    title: 'First',
                    content: [{ id: 11, type: 'string', label: 'A' } as ContentItem],
                } as ContentItem,
                {
                    id: 20,
                    type: 'section',
                    title: 'Second',
                    content: [{ id: 21, type: 'number', label: 'B' } as ContentItem],
                } as ContentItem,
            ]

            const vis = new Map<number, boolean>([
                [10, true],
                [11, true],
                [20, true],
                [21, true],
            ])

            const props: FormContentProps = {
                mode: 'viewer',
                items: sectionOnlyItems,
                visibilityMap: vis,
                values: { '11': 'x', '21': 1 },
                fieldErrors,
                section: DEFAULT,
                showInlineValidation: false,
                components: makeViewerComponents(),
            }

            render(<FormContent {...props} />)

            expect(screen.getByTestId('section-10')).toBeTruthy()
            expect(screen.getByTestId('string-11')).toBeTruthy()
            expect(screen.queryByTestId('section-20')).toBeNull()
        })

        it('skips hidden first section and renders second visible section', () => {
            const sectionOnlyItems: ContentItem[] = [
                {
                    id: 10,
                    type: 'section',
                    title: 'Hidden',
                    content: [{ id: 11, type: 'string', label: 'A' } as ContentItem],
                } as ContentItem,
                {
                    id: 20,
                    type: 'section',
                    title: 'Visible',
                    content: [{ id: 21, type: 'number', label: 'B' } as ContentItem],
                } as ContentItem,
            ]

            const vis = new Map<number, boolean>([
                [10, false],
                [11, true],
                [20, true],
                [21, true],
            ])

            const props: FormContentProps = {
                mode: 'viewer',
                items: sectionOnlyItems,
                visibilityMap: vis,
                values: { '11': 'x', '21': 1 },
                fieldErrors,
                section: DEFAULT,
                showInlineValidation: false,
                components: makeViewerComponents(),
            }

            render(<FormContent {...props} />)

            expect(screen.queryByTestId('section-10')).toBeNull()
            expect(screen.getByTestId('section-20')).toBeTruthy()
            expect(screen.getByTestId('number-21')).toBeTruthy()
        })

        it('returns null when no sections are visible and no root fields', () => {
            const sectionOnlyItems: ContentItem[] = [
                {
                    id: 10,
                    type: 'section',
                    title: 'Hidden',
                    content: [{ id: 11, type: 'string', label: 'A' } as ContentItem],
                } as ContentItem,
            ]

            const vis = new Map<number, boolean>([
                [10, false],
                [11, true],
            ])

            const props: FormContentProps = {
                mode: 'viewer',
                items: sectionOnlyItems,
                visibilityMap: vis,
                values: {},
                fieldErrors,
                section: DEFAULT,
                showInlineValidation: false,
                components: makeViewerComponents(),
            }

            const { container } = render(<FormContent {...props} />)

            expect(container.innerHTML).toBe('')
        })
    })

    describe('nested section lookup', () => {
        it('finds and renders a deeply nested section', () => {
            const nestedItems: ContentItem[] = [
                {
                    id: 10,
                    type: 'section',
                    title: 'Outer',
                    content: [
                        {
                            id: 20,
                            type: 'section',
                            title: 'Inner',
                            content: [{ id: 30, type: 'string', label: 'Deep' } as ContentItem],
                        } as ContentItem,
                    ],
                } as ContentItem,
            ]

            const nestedVisibility = new Map<number, boolean>([
                [10, true],
                [20, true],
                [30, true],
            ])

            const props: FormContentProps = {
                mode: 'viewer',
                items: nestedItems,
                visibilityMap: nestedVisibility,
                values: { '30': 'deep value' },
                fieldErrors,
                section: 20,
                showInlineValidation: false,
                components: makeViewerComponents(),
            }

            render(<FormContent {...props} />)

            expect(screen.getByTestId('section-20')).toBeTruthy()
            expect(screen.getByTestId('string-30')).toBeTruthy()
        })
    })
})
