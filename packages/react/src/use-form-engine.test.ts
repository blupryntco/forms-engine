/**
 * @jest-environment jsdom
 */

import type { FormDefinition } from '@bluprynt/forms-core'
import { FormDefinitionError, FormEngine } from '@bluprynt/forms-core'
import { renderHook } from '@testing-library/react'

import { useFormEngine } from './use-form-engine'

const validDef: FormDefinition = {
    id: 'test',
    version: '1.0.0',
    title: 'Test',
    content: [{ id: 1, type: 'string', label: 'Name' }],
}

describe('useFormEngine', () => {
    it('returns a FormEngine for a valid definition', () => {
        const { result } = renderHook(() => useFormEngine(validDef))
        expect(result.current).toBeInstanceOf(FormEngine)
    })

    it('returns the same instance when definition reference is stable', () => {
        const { result, rerender } = renderHook(() => useFormEngine(validDef))
        const first = result.current
        rerender()
        expect(result.current).toBe(first)
    })

    it('returns a new instance when definition reference changes', () => {
        let def = validDef
        const { result, rerender } = renderHook(() => useFormEngine(def))
        const first = result.current

        def = { ...validDef }
        rerender()
        expect(result.current).not.toBe(first)
        expect(result.current).toBeInstanceOf(FormEngine)
    })

    it('propagates FormDefinitionError for invalid definition', () => {
        const invalid = { id: 'x', version: '1.0.0', title: 'X', content: [] } as unknown as FormDefinition
        expect(() => renderHook(() => useFormEngine(invalid))).toThrow(FormDefinitionError)
    })
})
