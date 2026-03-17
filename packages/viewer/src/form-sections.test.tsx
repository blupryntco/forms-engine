import type { FC, PropsWithChildren } from 'react'

import type { FormDefinition, FormDocument, FormValues } from '@bluprynt/forms-core'
import { render, screen } from '@testing-library/react'

import { ROOT } from './constants'
import { Form } from './form-context'
import { type FormSectionItemProps, FormSections } from './form-sections'

const MockContainer: FC<PropsWithChildren> = jest.fn((props) => (
    <div data-testid="sections-container">{props.children}</div>
))

const MockItem: FC<FormSectionItemProps> = jest.fn((props) => (
    <div
        data-testid={`section-item-${props.section.id === ROOT ? 'root' : String(props.section.id)}`}
        data-active={String(props.active)}>
        {props.section.title ?? ''}
    </div>
))

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

const renderSections = (
    formProps: {
        definition: FormDefinition
        data: FormDocument
        section?: typeof ROOT | number
    },
    sectionProps: {
        defaultSectionTitle?: string
        defaultSectionDescription?: string
        onSelect?: (id: typeof ROOT | number) => void
    } = {},
) =>
    render(
        <Form {...formProps}>
            <FormSections container={MockContainer} item={MockItem} {...sectionProps} />
        </Form>,
    )

beforeEach(() => {
    jest.clearAllMocks()
})

describe('FormSections', () => {
    it('renders root section with top-level non-section fields', () => {
        const definition = baseDef([
            { id: 1, type: 'string', label: 'Name' },
            { id: 2, type: 'number', label: 'Age' },
            {
                id: 10,
                type: 'section',
                title: 'Details',
                content: [{ id: 3, type: 'string', label: 'Address' }],
            },
        ])
        const values = { '1': 'Alice', '2': 30, '3': 'Street' }

        renderSections({ definition, data: doc(values) })

        expect(screen.getByTestId('sections-container')).toBeTruthy()
        expect(screen.getByTestId('section-item-root')).toBeTruthy()
        expect(screen.getByTestId('section-item-root').textContent).toBe('General')
        expect(screen.getByTestId('section-item-10')).toBeTruthy()
        expect(screen.getByTestId('section-item-10').textContent).toBe('Details')
    })

    it('renders named sections', () => {
        const definition = baseDef([
            {
                id: 10,
                type: 'section',
                title: 'Personal',
                content: [{ id: 1, type: 'string', label: 'Name' }],
            },
            {
                id: 20,
                type: 'section',
                title: 'Work',
                content: [{ id: 2, type: 'string', label: 'Company' }],
            },
        ])
        const values = { '1': 'Alice', '2': 'Corp' }

        renderSections({ definition, data: doc(values) })

        expect(screen.getByTestId('section-item-10').textContent).toBe('Personal')
        expect(screen.getByTestId('section-item-20').textContent).toBe('Work')
        expect(screen.queryByTestId('section-item-root')).toBeNull()
    })

    it('respects visibility map (hidden sections excluded)', () => {
        const definition = baseDef([
            { id: 1, type: 'boolean', label: 'Toggle' },
            {
                id: 10,
                type: 'section',
                title: 'Conditional',
                condition: { field: 1, op: 'eq' as const, value: true },
                content: [{ id: 2, type: 'string', label: 'Inner' }],
            },
            {
                id: 20,
                type: 'section',
                title: 'Always Visible',
                content: [{ id: 3, type: 'string', label: 'Other' }],
            },
        ])
        const values = { '1': false, '2': 'x', '3': 'y' }

        renderSections({ definition, data: doc(values) })

        expect(screen.queryByTestId('section-item-10')).toBeNull()
        expect(screen.getByTestId('section-item-20')).toBeTruthy()
    })

    it('handles defaultSectionTitle and defaultSectionDescription for root section', () => {
        const definition = baseDef([{ id: 1, type: 'string', label: 'Name' }])
        const values = { '1': 'Alice' }

        renderSections(
            { definition, data: doc(values) },
            { defaultSectionTitle: 'Overview', defaultSectionDescription: 'Main fields' },
        )

        expect(screen.getByTestId('section-item-root').textContent).toBe('Overview')

        // Check the item was called with description
        const itemCalls = (MockItem as jest.Mock).mock.calls
        const rootCall = itemCalls.find((c: unknown[]) => (c[0] as FormSectionItemProps).section.id === ROOT)
        expect(rootCall).toBeDefined()
        expect((rootCall?.[0] as FormSectionItemProps).section.description).toBe('Main fields')
    })

    it('calls onSelect callback', () => {
        const definition = baseDef([
            { id: 1, type: 'string', label: 'Name' },
            {
                id: 10,
                type: 'section',
                title: 'Details',
                content: [{ id: 2, type: 'string', label: 'Address' }],
            },
        ])
        const values = { '1': 'Alice', '2': 'Street' }
        const onSelect = jest.fn()

        renderSections({ definition, data: doc(values) }, { onSelect })

        // Extract the select callback from the rendered item and call it
        const itemCalls = (MockItem as jest.Mock).mock.calls
        const sectionCall = itemCalls.find((c: unknown[]) => (c[0] as FormSectionItemProps).section.id === 10)
        expect(sectionCall).toBeDefined()

        // Call the select prop
        ;(sectionCall?.[0] as FormSectionItemProps).select()

        expect(onSelect).toHaveBeenCalledWith(10)
    })

    it('returns null when no definition or data', () => {
        const { container } = render(
            <Form>
                <FormSections container={MockContainer} item={MockItem} />
            </Form>,
        )

        expect(container.innerHTML).toBe('')
    })

    it('returns null when document errors exist', () => {
        // Use an invalid definition that will trigger DocumentError
        const definition = baseDef([
            { id: 1, type: 'string', label: 'Name' },
            { id: 1, type: 'number', label: 'Duplicate' }, // duplicate ID
        ])
        const values = { '1': 'Alice' }

        const { container } = renderSections({ definition, data: doc(values) })

        expect(container.innerHTML).toBe('')
    })

    it('returns null when content is empty (schema validation rejects empty content)', () => {
        const definition = baseDef([])
        const values = {}

        const { container } = renderSections({ definition, data: doc(values) })

        // Empty content triggers SCHEMA_INVALID document error => returns null
        expect(container.innerHTML).toBe('')
    })

    it('renders no root section when all fields are inside sections', () => {
        const definition = baseDef([
            {
                id: 10,
                type: 'section',
                title: 'Only Section',
                content: [{ id: 1, type: 'string', label: 'Name' }],
            },
        ])
        const values = { '1': 'Alice' }

        renderSections({ definition, data: doc(values) })

        expect(screen.getByTestId('section-item-10')).toBeTruthy()
        expect(screen.queryByTestId('section-item-root')).toBeNull()
    })

    it('marks the active section correctly', () => {
        const definition = baseDef([
            { id: 1, type: 'string', label: 'Name' },
            {
                id: 10,
                type: 'section',
                title: 'Details',
                content: [{ id: 2, type: 'string', label: 'Address' }],
            },
        ])
        const values = { '1': 'Alice', '2': 'Street' }

        renderSections({ definition, data: doc(values), section: 10 })

        expect(screen.getByTestId('section-item-10').getAttribute('data-active')).toBe('true')
        expect(screen.getByTestId('section-item-root').getAttribute('data-active')).toBe('false')
    })

    it('handles nested sections within visible parent', () => {
        const definition = baseDef([
            {
                id: 10,
                type: 'section',
                title: 'Parent',
                content: [
                    { id: 1, type: 'string', label: 'Field' },
                    {
                        id: 20,
                        type: 'section',
                        title: 'Nested',
                        content: [{ id: 2, type: 'number', label: 'Inner' }],
                    },
                ],
            },
        ])
        const values = { '1': 'a', '2': 5 }

        renderSections({ definition, data: doc(values) })

        // Only top-level sections appear in FormSections
        expect(screen.getByTestId('section-item-10')).toBeTruthy()
        // Nested section is not a top-level entry
        expect(screen.queryByTestId('section-item-20')).toBeNull()
    })
})
