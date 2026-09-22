/**
 * Backward compatibility of the schema builder for a 4.0.1-era definition.
 *
 * Nothing in this package changed on the branch -- `index.ts` is byte-identical
 * to `main` and `use-form-builder.ts` is not in the diff. These tests exist so
 * that stays true: a legacy definition must flatten to the same tree and come
 * back out of an edit cycle unchanged, with no properties injected by the new
 * field types.
 */

import type { ContentItem, FieldContentItem, FormDefinition } from '@bluprynt/forms-core'
import { act, renderHook } from '@testing-library/react'

import vaspRegistrationDefinition from './__fixtures__/backward_compatibility/vasp-registration.definition.json'
import { isAddPlaceholder, isField, isSection } from './core/types'
import { useFormBuilder } from './use-form-builder'

// Mock @dnd-kit/helpers move to just return items reordered
jest.mock('@dnd-kit/helpers', () => ({
    move: jest.fn((items: unknown[]) => items),
}))

// Mock DragDropProvider to be a passthrough
jest.mock('@dnd-kit/react', () => ({
    DragDropProvider: ({ children }: { children: React.ReactNode }) => children,
}))

const LEGACY_DEFINITION = vaspRegistrationDefinition as unknown as FormDefinition

const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T

const countItems = (content: ContentItem[]): number =>
    content.reduce((total, item) => total + 1 + (item.type === 'section' ? countItems(item.content) : 0), 0)

const renderBuilder = (definition: FormDefinition, onChange?: jest.Mock) =>
    renderHook(({ d, cb }) => useFormBuilder(d, cb), { initialProps: { d: definition, cb: onChange } })

describe('backward compatibility -- builder with a 4.0.1 definition', () => {
    it('flattens every content item, plus one add-placeholder per container', () => {
        const { result } = renderBuilder(clone(LEGACY_DEFINITION))

        const real = result.current.items.filter((item) => !isAddPlaceholder(item))

        expect(real).toHaveLength(countItems(LEGACY_DEFINITION.content))
        expect(real.every((item) => isField(item) || isSection(item))).toBe(true)
    })

    it('preserves ids, types and nesting depth', () => {
        const { result } = renderBuilder(clone(LEGACY_DEFINITION))

        // Top-level sections sit at depth 0; their children at depth 1.
        const section = result.current.items.find((item) => isSection(item) && item.item.id === 1)
        const child = result.current.items.find((item) => isField(item) && item.item.id === 2)

        expect(section?.depth).toBe(0)
        expect(child?.depth).toBe(1)
        expect(child?.type).toBe('string')
    })

    it('round-trips a no-op edit without changing the definition', () => {
        const onChange = jest.fn()
        const original = clone(LEGACY_DEFINITION)
        const { result } = renderBuilder(clone(LEGACY_DEFINITION), onChange)

        const target = result.current.items.find((item) => isField(item) && item.item.id === 2)
        const field = target?.item as FieldContentItem

        act(() => {
            result.current.handleItemChange(2, clone(field))
        })

        expect(onChange).toHaveBeenCalledTimes(1)
        expect(onChange.mock.calls[0]?.[0]).toStrictEqual(original)
    })

    it('adds no new properties when a legacy field is edited', () => {
        const onChange = jest.fn()
        const { result } = renderBuilder(clone(LEGACY_DEFINITION), onChange)

        const target = result.current.items.find((item) => isField(item) && item.item.id === 2)
        const field = target?.item as FieldContentItem

        act(() => {
            result.current.handleItemChange(2, { ...clone(field), label: 'Renamed' })
        })

        const next = onChange.mock.calls[0]?.[0] as FormDefinition
        const section = next.content[0]
        const edited = (section?.type === 'section' ? section.content[0] : undefined) as FieldContentItem

        expect(edited.label).toBe('Renamed')
        expect(Object.keys(edited).sort()).toStrictEqual(Object.keys(field).sort())
    })

    it('touches only the intended node when one field is removed', () => {
        const onChange = jest.fn()
        const original = clone(LEGACY_DEFINITION)
        const { result } = renderBuilder(clone(LEGACY_DEFINITION), onChange)

        act(() => {
            result.current.handleItemRemove(2)
        })

        const next = onChange.mock.calls[0]?.[0] as FormDefinition
        const before = original.content[0]
        const after = next.content[0]

        expect(before?.type === 'section' && after?.type === 'section').toBe(true)
        if (before?.type === 'section' && after?.type === 'section') {
            expect(after.content).toHaveLength(before.content.length - 1)
            expect(after.content.some((item) => item.id === 2)).toBe(false)
            expect(after.content).toStrictEqual(before.content.filter((item) => item.id !== 2))
        }
        // Every other top-level item is untouched.
        expect(next.content.slice(1)).toStrictEqual(original.content.slice(1))
    })
})
