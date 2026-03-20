import type { FC } from 'react'

import type { SectionContentItem } from '@bluprynt/forms-core'
import { render, screen } from '@testing-library/react'

import { Section, type SectionRenderProps } from './section'

let mockIsDragSource = false

jest.mock('@dnd-kit/react/sortable', () => ({
    useSortable: () => ({
        ref: jest.fn(),
        handleRef: jest.fn(),
        isDragSource: mockIsDragSource,
    }),
}))

const MockSectionComponent: FC<SectionRenderProps> = ({ id, depth, index, parentId, item, isDragging, isSelected }) => (
    <div
        data-testid="section"
        data-id={id}
        data-depth={depth}
        data-index={index}
        data-parent-id={parentId ?? 'null'}
        data-title={item.title}
        data-dragging={isDragging}
        data-selected={isSelected}
    />
)

const defaultItem: SectionContentItem = { id: 1, type: 'section', title: 'Section 1', content: [] }

describe('Section', () => {
    beforeEach(() => {
        mockIsDragSource = false
    })

    it('renders component with all props', () => {
        render(
            <Section
                id={1}
                depth={0}
                index={0}
                parentId={null}
                item={defaultItem}
                isSelected={false}
                component={MockSectionComponent}
                onAdd={jest.fn()}
                onRemove={jest.fn()}
                onChange={jest.fn()}
            />,
        )

        const el = screen.getByTestId('section')
        expect(el.dataset.id).toBe('1')
        expect(el.dataset.depth).toBe('0')
        expect(el.dataset.title).toBe('Section 1')
        expect(el.dataset.dragging).toBe('false')
        expect(el.dataset.selected).toBe('false')
    })

    it('passes isDragging from useSortable', () => {
        mockIsDragSource = true

        render(
            <Section
                id={1}
                depth={0}
                index={0}
                parentId={null}
                item={defaultItem}
                isSelected={false}
                component={MockSectionComponent}
                onAdd={jest.fn()}
                onRemove={jest.fn()}
                onChange={jest.fn()}
            />,
        )

        expect(screen.getByTestId('section').dataset.dragging).toBe('true')
    })

    it('passes isSelected=true', () => {
        render(
            <Section
                id={1}
                depth={0}
                index={0}
                parentId={null}
                item={defaultItem}
                isSelected={true}
                component={MockSectionComponent}
                onAdd={jest.fn()}
                onRemove={jest.fn()}
                onChange={jest.fn()}
            />,
        )

        expect(screen.getByTestId('section').dataset.selected).toBe('true')
    })

    it('forwards onRemove callback', () => {
        const onRemove = jest.fn()
        const Comp: FC<SectionRenderProps> = ({ onRemove: remove }) => {
            remove()
            return <div data-testid="done" />
        }

        render(
            <Section
                id={1}
                depth={0}
                index={0}
                parentId={null}
                item={defaultItem}
                isSelected={false}
                component={Comp}
                onAdd={jest.fn()}
                onRemove={onRemove}
                onChange={jest.fn()}
            />,
        )

        expect(onRemove).toHaveBeenCalled()
    })

    it('forwards onChange callback', () => {
        const onChange = jest.fn()
        const Comp: FC<SectionRenderProps> = ({ onChange: change }) => {
            change({ id: 1, type: 'section', title: 'Updated', content: [] })
            return <div data-testid="done" />
        }

        render(
            <Section
                id={1}
                depth={0}
                index={0}
                parentId={null}
                item={defaultItem}
                isSelected={false}
                component={Comp}
                onAdd={jest.fn()}
                onRemove={jest.fn()}
                onChange={onChange}
            />,
        )

        expect(onChange).toHaveBeenCalledWith({ id: 1, type: 'section', title: 'Updated', content: [] })
    })
})
