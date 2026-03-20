import type { FC } from 'react'

import { render, screen } from '@testing-library/react'

import { AddPlaceholder, type AddPlaceholderRenderProps } from './add-placeholder'

const MockComponent: FC<AddPlaceholderRenderProps> = ({ depth, parentId }) => (
    <div data-testid="placeholder" data-depth={depth} data-parent-id={parentId ?? 'null'} />
)

describe('AddPlaceholder', () => {
    it('renders the component with correct props', () => {
        const onAdd = jest.fn()
        const onChange = jest.fn()

        render(<AddPlaceholder depth={2} parentId={10} component={MockComponent} onAdd={onAdd} onChange={onChange} />)

        const el = screen.getByTestId('placeholder')
        expect(el).toBeTruthy()
        expect(el.dataset.depth).toBe('2')
        expect(el.dataset.parentId).toBe('10')
    })

    it('passes null parentId', () => {
        render(
            <AddPlaceholder
                depth={0}
                parentId={null}
                component={MockComponent}
                onAdd={jest.fn()}
                onChange={jest.fn()}
            />,
        )

        expect(screen.getByTestId('placeholder').dataset.parentId).toBe('null')
    })

    it('forwards onAdd callback', () => {
        const onAdd = jest.fn().mockReturnValue(42)
        const Comp: FC<AddPlaceholderRenderProps> = ({ onAdd: add }) => {
            const id = add({ type: 'string', label: 'Test' })
            return <div data-testid="result" data-id={id} />
        }

        render(<AddPlaceholder depth={0} parentId={null} component={Comp} onAdd={onAdd} onChange={jest.fn()} />)

        expect(onAdd).toHaveBeenCalledWith({ type: 'string', label: 'Test' })
    })

    it('forwards onChange callback', () => {
        const onChange = jest.fn()
        const Comp: FC<AddPlaceholderRenderProps> = ({ onChange: change }) => {
            change(1, { id: 1, type: 'string', label: 'X' })
            return <div data-testid="done" />
        }

        render(<AddPlaceholder depth={0} parentId={null} component={Comp} onAdd={jest.fn()} onChange={onChange} />)

        expect(onChange).toHaveBeenCalledWith(1, { id: 1, type: 'string', label: 'X' })
    })
})
