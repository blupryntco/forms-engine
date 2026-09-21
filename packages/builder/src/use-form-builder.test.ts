import type { FieldContentItem, FormDefinition, SectionContentItem } from '@bluprynt/forms-core'
import { act, renderHook } from '@testing-library/react'

import type { NewContentItem } from './core/types'
import { useFormBuilder } from './use-form-builder'

// Mock @dnd-kit/helpers move to just return items reordered
jest.mock('@dnd-kit/helpers', () => ({
    move: jest.fn((items: unknown[]) => items),
}))

// Mock DragDropProvider to be a passthrough
jest.mock('@dnd-kit/react', () => ({
    DragDropProvider: ({ children }: { children: React.ReactNode }) => children,
}))

const emptyDef = (): FormDefinition => ({
    id: 'test',
    version: '1.0.0',
    title: 'Test',
    content: [],
})

const defWithField = (field: FieldContentItem): FormDefinition => ({
    ...emptyDef(),
    content: [field],
})

const defWithSection = (section: SectionContentItem): FormDefinition => ({
    ...emptyDef(),
    content: [section],
})

describe('useFormBuilder', () => {
    it('returns flattened items from definition', () => {
        const def = defWithField({ id: 1, type: 'string', label: 'Name' })
        const { result } = renderHook(({ d }) => useFormBuilder(d), { initialProps: { d: def } })

        // field + root add-placeholder
        expect(result.current.items).toHaveLength(2)
        expect(result.current.items[0]).toMatchObject({ id: 1, type: 'string', depth: 0 })
        expect(result.current.items[1]?.type).toBe('add-placeholder')
    })

    it('returns single add-placeholder for empty definition', () => {
        const def = emptyDef()
        const { result } = renderHook(({ d }) => useFormBuilder(d), { initialProps: { d: def } })
        expect(result.current.items).toHaveLength(1)
        expect(result.current.items[0]?.type).toBe('add-placeholder')
    })

    it('flattens nested sections', () => {
        const def = defWithSection({
            id: 1,
            type: 'section',
            title: 'S1',
            content: [{ id: 2, type: 'string', label: 'F1' }],
        })
        const { result } = renderHook(({ d }) => useFormBuilder(d), { initialProps: { d: def } })

        // section + field + section placeholder + root placeholder = 4
        expect(result.current.items).toHaveLength(4)
    })

    describe('handleItemAdd', () => {
        it('adds a field to root', () => {
            const def = emptyDef()
            const onChange = jest.fn()
            const { result } = renderHook(({ d, cb }) => useFormBuilder(d, cb), {
                initialProps: { d: def, cb: onChange },
            })

            const newItem: NewContentItem = { type: 'string', label: 'New Field' }
            let id: number
            act(() => {
                id = result.current.handleItemAdd(null, newItem)
            })

            expect(id).toBeGreaterThan(0)
            expect(onChange).toHaveBeenCalledTimes(1)
            const updatedDef = onChange.mock.calls[0][0] as FormDefinition
            expect(updatedDef.content).toHaveLength(1)
            expect(updatedDef.content[0]?.type).toBe('string')
        })

        it('adds a field to a section', () => {
            const def = defWithSection({ id: 1, type: 'section', title: 'S1', content: [] })
            const onChange = jest.fn()
            const { result } = renderHook(({ d, cb }) => useFormBuilder(d, cb), {
                initialProps: { d: def, cb: onChange },
            })

            act(() => {
                result.current.handleItemAdd(1, { type: 'number', label: 'Age' })
            })

            const updatedDef = onChange.mock.calls[0][0] as FormDefinition
            const section = updatedDef.content[0] as SectionContentItem
            expect(section.content).toHaveLength(1)
            expect(section.content[0]?.type).toBe('number')
        })

        it('adds a section', () => {
            const def = emptyDef()
            const onChange = jest.fn()
            const { result } = renderHook(({ d, cb }) => useFormBuilder(d, cb), {
                initialProps: { d: def, cb: onChange },
            })

            act(() => {
                result.current.handleItemAdd(null, { type: 'section', title: 'New Section', content: [] })
            })

            const updatedDef = onChange.mock.calls[0][0] as FormDefinition
            expect(updatedDef.content[0]?.type).toBe('section')
        })
    })

    describe('handleItemChange', () => {
        it('updates a field', () => {
            const def = defWithField({ id: 1, type: 'string', label: 'Name' })
            const onChange = jest.fn()
            const { result } = renderHook(({ d, cb }) => useFormBuilder(d, cb), {
                initialProps: { d: def, cb: onChange },
            })

            act(() => {
                result.current.handleItemChange(1, { id: 1, type: 'string', label: 'Full Name' })
            })

            const updatedDef = onChange.mock.calls[0][0] as FormDefinition
            expect((updatedDef.content[0] as FieldContentItem).label).toBe('Full Name')
        })

        it('updates a section', () => {
            const def = defWithSection({ id: 1, type: 'section', title: 'Old', content: [] })
            const onChange = jest.fn()
            const { result } = renderHook(({ d, cb }) => useFormBuilder(d, cb), {
                initialProps: { d: def, cb: onChange },
            })

            act(() => {
                result.current.handleItemChange(1, { id: 1, type: 'section', title: 'New', content: [] })
            })

            const updatedDef = onChange.mock.calls[0][0] as FormDefinition
            expect((updatedDef.content[0] as SectionContentItem).title).toBe('New')
        })
    })

    describe('handleItemRemove', () => {
        it('removes a field', () => {
            const def: FormDefinition = {
                ...emptyDef(),
                content: [
                    { id: 1, type: 'string', label: 'A' },
                    { id: 2, type: 'string', label: 'B' },
                ],
            }
            const onChange = jest.fn()
            const { result } = renderHook(({ d, cb }) => useFormBuilder(d, cb), {
                initialProps: { d: def, cb: onChange },
            })

            act(() => {
                result.current.handleItemRemove(1)
            })

            const updatedDef = onChange.mock.calls[0][0] as FormDefinition
            expect(updatedDef.content).toHaveLength(1)
            expect(updatedDef.content[0]?.id).toBe(2)
        })

        it('removes a section with children', () => {
            const def = defWithSection({
                id: 1,
                type: 'section',
                title: 'S',
                content: [{ id: 2, type: 'string', label: 'F' }],
            })
            const onChange = jest.fn()
            const { result } = renderHook(({ d, cb }) => useFormBuilder(d, cb), {
                initialProps: { d: def, cb: onChange },
            })

            act(() => {
                result.current.handleItemRemove(1)
            })

            const updatedDef = onChange.mock.calls[0][0] as FormDefinition
            expect(updatedDef.content).toHaveLength(0)
        })
    })

    describe('external definition sync', () => {
        it('re-flattens items when definition prop changes', () => {
            const def1 = defWithField({ id: 1, type: 'string', label: 'A' })
            const def2: FormDefinition = {
                ...emptyDef(),
                content: [
                    { id: 1, type: 'string', label: 'A' },
                    { id: 2, type: 'number', label: 'B' },
                ],
            }

            const { result, rerender } = renderHook(({ d }) => useFormBuilder(d), {
                initialProps: { d: def1 },
            })

            expect(result.current.items.filter((i) => i.type !== 'add-placeholder')).toHaveLength(1)

            rerender({ d: def2 })

            expect(result.current.items.filter((i) => i.type !== 'add-placeholder')).toHaveLength(2)
        })
    })

    describe('returned handlers are stable', () => {
        it('handler references remain the same between renders', () => {
            const def = emptyDef()
            const { result, rerender } = renderHook(({ d }) => useFormBuilder(d), {
                initialProps: { d: def },
            })

            const handlers1 = {
                add: result.current.handleItemAdd,
                change: result.current.handleItemChange,
                remove: result.current.handleItemRemove,
            }

            rerender({ d: def })

            expect(result.current.handleItemAdd).toBe(handlers1.add)
            expect(result.current.handleItemChange).toBe(handlers1.change)
            expect(result.current.handleItemRemove).toBe(handlers1.remove)
        })
    })

    describe('authoring metadata pass-through', () => {
        const METADATA = {
            placeholder: 'Acme Ltd',
            answer_guidelines: 'Use the registered name',
            reference_id: 'KYI-3.1.a',
        }

        const renderBuilder = (def: FormDefinition, onChange: jest.Mock) =>
            renderHook(({ d, cb }) => useFormBuilder(d, cb), { initialProps: { d: def, cb: onChange } })

        it('writes metadata set on a field through handleItemChange', () => {
            const onChange = jest.fn()
            const { result } = renderBuilder(defWithField({ id: 1, type: 'string', label: 'Name' }), onChange)

            act(() => {
                result.current.handleItemChange(1, { id: 1, type: 'string', label: 'Name', ...METADATA })
            })

            expect(onChange.mock.calls[0][0].content[0] as FieldContentItem).toMatchObject(METADATA)
        })

        it('writes metadata set on a section through handleItemChange', () => {
            const onChange = jest.fn()
            const def = defWithSection({ id: 1, type: 'section', title: 'Issuer', content: [] })
            const { result } = renderBuilder(def, onChange)

            act(() => {
                result.current.handleItemChange(1, {
                    id: 1,
                    type: 'section',
                    title: 'Issuer',
                    content: [],
                    ...METADATA,
                })
            })

            expect(onChange.mock.calls[0][0].content[0] as SectionContentItem).toMatchObject(METADATA)
        })

        it('clears metadata when the consumer passes an explicit undefined', () => {
            const onChange = jest.fn()
            const def = defWithField({ id: 1, type: 'string', label: 'Name', ...METADATA })
            const { result } = renderBuilder(def, onChange)

            act(() => {
                result.current.handleItemChange(1, {
                    id: 1,
                    type: 'string',
                    label: 'Name',
                    placeholder: undefined,
                    answer_guidelines: undefined,
                    reference_id: undefined,
                })
            })

            const field = onChange.mock.calls[0][0].content[0] as FieldContentItem
            expect('placeholder' in field).toBe(false)
            expect('answer_guidelines' in field).toBe(false)
            expect('reference_id' in field).toBe(false)
        })

        it('preserves metadata that the consumer does not mention', () => {
            const onChange = jest.fn()
            const def = defWithField({ id: 1, type: 'string', label: 'Name', ...METADATA })
            const { result } = renderBuilder(def, onChange)

            act(() => {
                result.current.handleItemChange(1, { id: 1, type: 'string', label: 'Full Name' })
            })

            expect(onChange.mock.calls[0][0].content[0] as FieldContentItem).toMatchObject(METADATA)
        })

        it('carries array item metadata through a round trip', () => {
            const onChange = jest.fn()
            const item = { type: 'string' as const, label: 'Tag', ...METADATA }
            const { result } = renderBuilder(defWithField({ id: 1, type: 'array', label: 'Tags', item }), onChange)

            act(() => {
                result.current.handleItemChange(1, { id: 1, type: 'array', label: 'Labels', item })
            })

            expect((onChange.mock.calls[0][0].content[0] as FieldContentItem).item).toMatchObject(METADATA)
        })

        it('accepts metadata on a newly added field', () => {
            const onChange = jest.fn()
            const { result } = renderBuilder(emptyDef(), onChange)

            act(() => {
                result.current.handleItemAdd(null, {
                    type: 'string',
                    label: 'Name',
                    ...METADATA,
                } as NewContentItem)
            })

            expect(onChange.mock.calls[0][0].content[0] as FieldContentItem).toMatchObject(METADATA)
        })
    })
})
