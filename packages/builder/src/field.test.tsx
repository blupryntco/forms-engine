import type { FC } from 'react'

import type { FieldContentItem } from '@bluprynt/forms-core'
import { render, screen } from '@testing-library/react'

import { Field, type FieldRenderProps } from './field'

// Mock useSortable to avoid real dnd-kit DOM interactions
const mockRef = jest.fn()
const mockHandleRef = jest.fn()
let mockIsDragSource = false

jest.mock('@dnd-kit/react/sortable', () => ({
    useSortable: () => ({
        ref: mockRef,
        handleRef: mockHandleRef,
        isDragSource: mockIsDragSource,
    }),
}))

const MockFieldComponent: FC<FieldRenderProps> = ({
    id,
    depth,
    index,
    parentId,
    type,
    item,
    isDragging,
    isSelected,
}) => (
    <div
        data-testid="field"
        data-id={id}
        data-depth={depth}
        data-index={index}
        data-parent-id={parentId ?? 'null'}
        data-type={type}
        data-label={item.label}
        data-dragging={isDragging}
        data-selected={isSelected}
    />
)

const defaultItem: FieldContentItem = { id: 1, type: 'string', label: 'Name' }

describe('Field', () => {
    beforeEach(() => {
        mockIsDragSource = false
    })

    it('renders component with all props', () => {
        render(
            <Field
                id={1}
                depth={2}
                index={3}
                parentId={10}
                type="string"
                item={defaultItem}
                isSelected={false}
                component={MockFieldComponent}
                onAdd={jest.fn()}
                onRemove={jest.fn()}
                onChange={jest.fn()}
            />,
        )

        const el = screen.getByTestId('field')
        expect(el.dataset.id).toBe('1')
        expect(el.dataset.depth).toBe('2')
        expect(el.dataset.index).toBe('3')
        expect(el.dataset.parentId).toBe('10')
        expect(el.dataset.type).toBe('string')
        expect(el.dataset.label).toBe('Name')
        expect(el.dataset.dragging).toBe('false')
        expect(el.dataset.selected).toBe('false')
    })

    it('passes isDragging from useSortable', () => {
        mockIsDragSource = true

        render(
            <Field
                id={1}
                depth={0}
                index={0}
                parentId={null}
                type="string"
                item={defaultItem}
                isSelected={false}
                component={MockFieldComponent}
                onAdd={jest.fn()}
                onRemove={jest.fn()}
                onChange={jest.fn()}
            />,
        )

        expect(screen.getByTestId('field').dataset.dragging).toBe('true')
    })

    it('passes isSelected=true', () => {
        render(
            <Field
                id={1}
                depth={0}
                index={0}
                parentId={null}
                type="string"
                item={defaultItem}
                isSelected={true}
                component={MockFieldComponent}
                onAdd={jest.fn()}
                onRemove={jest.fn()}
                onChange={jest.fn()}
            />,
        )

        expect(screen.getByTestId('field').dataset.selected).toBe('true')
    })

    it('forwards onAdd callback', () => {
        const onAdd = jest.fn().mockReturnValue(5)
        const Comp: FC<FieldRenderProps> = ({ onAdd: add }) => {
            const id = add({ type: 'number', label: 'Age' })
            return <div data-testid="result" data-id={id} />
        }

        render(
            <Field
                id={1}
                depth={0}
                index={0}
                parentId={null}
                type="string"
                item={defaultItem}
                isSelected={false}
                component={Comp}
                onAdd={onAdd}
                onRemove={jest.fn()}
                onChange={jest.fn()}
            />,
        )

        expect(onAdd).toHaveBeenCalledWith({ type: 'number', label: 'Age' })
    })

    it('forwards onRemove callback', () => {
        const onRemove = jest.fn()
        const Comp: FC<FieldRenderProps> = ({ onRemove: remove }) => {
            remove()
            return <div data-testid="done" />
        }

        render(
            <Field
                id={1}
                depth={0}
                index={0}
                parentId={null}
                type="string"
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
        const Comp: FC<FieldRenderProps> = ({ onChange: change }) => {
            change({ id: 1, type: 'string', label: 'Updated' })
            return <div data-testid="done" />
        }

        render(
            <Field
                id={1}
                depth={0}
                index={0}
                parentId={null}
                type="string"
                item={defaultItem}
                isSelected={false}
                component={Comp}
                onAdd={jest.fn()}
                onRemove={jest.fn()}
                onChange={onChange}
            />,
        )

        expect(onChange).toHaveBeenCalledWith({ id: 1, type: 'string', label: 'Updated' })
    })

    it('passes null parentId', () => {
        render(
            <Field
                id={1}
                depth={0}
                index={0}
                parentId={null}
                type="string"
                item={defaultItem}
                isSelected={false}
                component={MockFieldComponent}
                onAdd={jest.fn()}
                onRemove={jest.fn()}
                onChange={jest.fn()}
            />,
        )

        expect(screen.getByTestId('field').dataset.parentId).toBe('null')
    })
})
