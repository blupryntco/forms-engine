import type { FC, PropsWithChildren } from 'react'

import type { FormDefinition } from '@bluprynt/forms-core'
import { render, screen } from '@testing-library/react'

import type { AddPlaceholderRenderProps } from './add-placeholder'
import { FormBuilder } from './builder'
import type { FieldRenderProps } from './field'
import type { SectionRenderProps } from './section'

// Mock dnd-kit
jest.mock('@dnd-kit/react', () => ({
    DragDropProvider: ({ children }: { children: React.ReactNode }) => <div data-testid="dnd-provider">{children}</div>,
}))

jest.mock('@dnd-kit/react/sortable', () => ({
    useSortable: () => ({
        ref: jest.fn(),
        handleRef: jest.fn(),
        isDragSource: false,
    }),
}))

jest.mock('@dnd-kit/helpers', () => ({
    move: jest.fn((items: unknown[]) => items),
}))

const Container: FC<PropsWithChildren> = ({ children }) => <div data-testid="container">{children}</div>
const MockField: FC<FieldRenderProps> = ({ id, type, item }) => (
    <div data-testid={`field-${id}`} data-type={type} data-label={item.label} />
)
const MockSection: FC<SectionRenderProps> = ({ id, item }) => (
    <div data-testid={`section-${id}`} data-title={item.title} />
)
const MockPlaceholder: FC<AddPlaceholderRenderProps> = ({ depth, parentId }) => (
    <div data-testid={`placeholder-d${depth}-p${parentId ?? 'null'}`} />
)

const emptyDef: FormDefinition = { id: 'test', version: '1.0.0', title: 'Test', content: [] }

describe('FormBuilder', () => {
    it('renders empty definition with root add-placeholder', () => {
        render(
            <FormBuilder
                definition={emptyDef}
                container={Container}
                field={MockField}
                section={MockSection}
                addPlaceholder={MockPlaceholder}
            />,
        )

        expect(screen.getByTestId('container')).toBeTruthy()
        expect(screen.getByTestId('placeholder-d0-pnull')).toBeTruthy()
    })

    it('renders fields', () => {
        const def: FormDefinition = {
            ...emptyDef,
            content: [
                { id: 1, type: 'string', label: 'Name' },
                { id: 2, type: 'number', label: 'Age' },
            ],
        }

        render(
            <FormBuilder
                definition={def}
                container={Container}
                field={MockField}
                section={MockSection}
                addPlaceholder={MockPlaceholder}
            />,
        )

        expect(screen.getByTestId('field-1')).toBeTruthy()
        expect(screen.getByTestId('field-1').dataset.label).toBe('Name')
        expect(screen.getByTestId('field-2')).toBeTruthy()
        expect(screen.getByTestId('field-2').dataset.label).toBe('Age')
    })

    it('renders sections', () => {
        const def: FormDefinition = {
            ...emptyDef,
            content: [{ id: 1, type: 'section', title: 'Personal', content: [] }],
        }

        render(
            <FormBuilder
                definition={def}
                container={Container}
                field={MockField}
                section={MockSection}
                addPlaceholder={MockPlaceholder}
            />,
        )

        expect(screen.getByTestId('section-1')).toBeTruthy()
        expect(screen.getByTestId('section-1').dataset.title).toBe('Personal')
    })

    it('renders mixed content (fields, sections, placeholders)', () => {
        const def: FormDefinition = {
            ...emptyDef,
            content: [
                { id: 1, type: 'string', label: 'Name' },
                { id: 2, type: 'section', title: 'Details', content: [{ id: 3, type: 'number', label: 'Age' }] },
            ],
        }

        render(
            <FormBuilder
                definition={def}
                container={Container}
                field={MockField}
                section={MockSection}
                addPlaceholder={MockPlaceholder}
            />,
        )

        expect(screen.getByTestId('field-1')).toBeTruthy()
        expect(screen.getByTestId('section-2')).toBeTruthy()
        expect(screen.getByTestId('field-3')).toBeTruthy()
    })

    it('wraps content in DragDropProvider', () => {
        render(
            <FormBuilder
                definition={emptyDef}
                container={Container}
                field={MockField}
                section={MockSection}
                addPlaceholder={MockPlaceholder}
            />,
        )

        expect(screen.getByTestId('dnd-provider')).toBeTruthy()
    })

    it('passes selectedId to field isSelected', () => {
        const def: FormDefinition = {
            ...emptyDef,
            content: [{ id: 1, type: 'string', label: 'Name' }],
        }

        const FieldWithSelected: FC<FieldRenderProps> = ({ id, isSelected }) => (
            <div data-testid={`field-${id}`} data-selected={isSelected} />
        )

        render(
            <FormBuilder
                definition={def}
                container={Container}
                field={FieldWithSelected}
                section={MockSection}
                addPlaceholder={MockPlaceholder}
                selectedId={1}
            />,
        )

        expect(screen.getByTestId('field-1').dataset.selected).toBe('true')
    })

    it('passes selectedId to section isSelected', () => {
        const def: FormDefinition = {
            ...emptyDef,
            content: [{ id: 1, type: 'section', title: 'S', content: [] }],
        }

        const SectionWithSelected: FC<SectionRenderProps> = ({ id, isSelected }) => (
            <div data-testid={`section-${id}`} data-selected={isSelected} />
        )

        render(
            <FormBuilder
                definition={def}
                container={Container}
                field={MockField}
                section={SectionWithSelected}
                addPlaceholder={MockPlaceholder}
                selectedId={1}
            />,
        )

        expect(screen.getByTestId('section-1').dataset.selected).toBe('true')
    })

    it('does not mark unselected items', () => {
        const def: FormDefinition = {
            ...emptyDef,
            content: [
                { id: 1, type: 'string', label: 'A' },
                { id: 2, type: 'string', label: 'B' },
            ],
        }

        const FieldWithSelected: FC<FieldRenderProps> = ({ id, isSelected }) => (
            <div data-testid={`field-${id}`} data-selected={isSelected} />
        )

        render(
            <FormBuilder
                definition={def}
                container={Container}
                field={FieldWithSelected}
                section={MockSection}
                addPlaceholder={MockPlaceholder}
                selectedId={1}
            />,
        )

        expect(screen.getByTestId('field-1').dataset.selected).toBe('true')
        expect(screen.getByTestId('field-2').dataset.selected).toBe('false')
    })
})
