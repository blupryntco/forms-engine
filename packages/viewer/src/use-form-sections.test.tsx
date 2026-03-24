import type { FC, ReactNode } from 'react'

import type { FormDefinition, FormDocument, FormValues } from '@bluprynt/forms-core'
import { renderHook } from '@testing-library/react'

import { ROOT } from './constants'
import { Form } from './form-context'
import { useFormSections } from './use-form-sections'

const baseDef = (content: FormDefinition['content']): FormDefinition => ({
    id: 'test-form',
    version: '1.0.0',
    title: 'Test Form',
    content,
})

const doc = (values: FormValues = {}, submittedAt = '2025-06-15T00:00:00.000Z'): FormDocument => ({
    form: { id: 'test-form', version: '1.0.0', submittedAt },
    values,
})

const createWrapper =
    (formProps: { definition?: FormDefinition; data?: FormDocument }): FC<{ children: ReactNode }> =>
    ({ children }) => <Form {...formProps}>{children}</Form>

describe('useFormSections', () => {
    it('returns empty array when no definition', () => {
        const { result } = renderHook(() => useFormSections(), {
            wrapper: createWrapper({}),
        })

        expect(result.current).toEqual([])
    })

    it('returns root section for top-level non-section fields', () => {
        const definition = baseDef([
            { id: 1, type: 'string', label: 'Name' },
            { id: 2, type: 'number', label: 'Age' },
        ])

        const { result } = renderHook(() => useFormSections(), {
            wrapper: createWrapper({ definition, data: doc({ '1': 'Alice', '2': 30 }) }),
        })

        expect(result.current).toHaveLength(1)
        expect(result.current[0]?.id).toBe(ROOT)
        expect(result.current[0]?.title).toBe('General')
    })

    it('uses custom defaultSectionTitle and defaultSectionDescription', () => {
        const definition = baseDef([{ id: 1, type: 'string', label: 'Name' }])

        const { result } = renderHook(() => useFormSections('Overview', 'Main fields'), {
            wrapper: createWrapper({ definition, data: doc({ '1': 'Alice' }) }),
        })

        expect(result.current).toHaveLength(1)
        expect(result.current[0]?.id).toBe(ROOT)
        expect(result.current[0]?.title).toBe('Overview')
        expect(result.current[0]?.description).toBe('Main fields')
    })

    it('returns named sections', () => {
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

        const { result } = renderHook(() => useFormSections(), {
            wrapper: createWrapper({ definition, data: doc({ '1': 'Alice', '2': 'Corp' }) }),
        })

        expect(result.current).toHaveLength(2)
        expect(result.current[0]?.id).toBe(10)
        expect(result.current[0]?.title).toBe('Personal')
        expect(result.current[1]?.id).toBe(20)
        expect(result.current[1]?.title).toBe('Work')
    })

    it('does not include root section when all fields are inside sections', () => {
        const definition = baseDef([
            {
                id: 10,
                type: 'section',
                title: 'Only Section',
                content: [{ id: 1, type: 'string', label: 'Name' }],
            },
        ])

        const { result } = renderHook(() => useFormSections(), {
            wrapper: createWrapper({ definition, data: doc({ '1': 'Alice' }) }),
        })

        expect(result.current).toHaveLength(1)
        expect(result.current[0]?.id).toBe(10)
    })

    it('includes both root and named sections when mixed', () => {
        const definition = baseDef([
            { id: 1, type: 'string', label: 'Name' },
            {
                id: 10,
                type: 'section',
                title: 'Details',
                content: [{ id: 2, type: 'string', label: 'Address' }],
            },
        ])

        const { result } = renderHook(() => useFormSections(), {
            wrapper: createWrapper({ definition, data: doc({ '1': 'Alice', '2': 'Street' }) }),
        })

        expect(result.current).toHaveLength(2)
        expect(result.current[0]?.id).toBe(ROOT)
        expect(result.current[1]?.id).toBe(10)
    })

    it('excludes hidden sections based on visibility', () => {
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

        const { result } = renderHook(() => useFormSections(), {
            wrapper: createWrapper({ definition, data: doc({ '1': false, '2': 'x', '3': 'y' }) }),
        })

        const ids = result.current.map((e) => e.id)
        expect(ids).not.toContain(10)
        expect(ids).toContain(20)
    })

    it('excludes root section when all root fields are hidden', () => {
        const definition = baseDef([
            { id: 1, type: 'boolean', label: 'Toggle' },
            {
                id: 2,
                type: 'string',
                label: 'Conditional Field',
                condition: { field: 1, op: 'eq' as const, value: true },
            },
            {
                id: 10,
                type: 'section',
                title: 'Always Visible',
                content: [{ id: 3, type: 'string', label: 'Other' }],
            },
        ])

        // Toggle is false, so field 2 is hidden. Field 1 (boolean) is still visible at root.
        const { result } = renderHook(() => useFormSections(), {
            wrapper: createWrapper({ definition, data: doc({ '1': false, '3': 'y' }) }),
        })

        // Root section should still appear because field 1 is visible
        const rootEntry = result.current.find((e) => e.id === ROOT)
        expect(rootEntry).toBeDefined()
    })

    it('does not include nested sections as top-level entries', () => {
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

        const { result } = renderHook(() => useFormSections(), {
            wrapper: createWrapper({ definition, data: doc({ '1': 'a', '2': 5 }) }),
        })

        expect(result.current).toHaveLength(1)
        expect(result.current[0]?.id).toBe(10)
    })

    it('root section content contains only non-section fields', () => {
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

        const { result } = renderHook(() => useFormSections(), {
            wrapper: createWrapper({ definition, data: doc({ '1': 'Alice', '2': 30, '3': 'Street' }) }),
        })

        const rootEntry = result.current.find((e) => e.id === ROOT)
        expect(rootEntry).toBeDefined()
        expect(rootEntry?.content).toHaveLength(2)
        expect(rootEntry?.content.every((item) => item.type !== 'section')).toBe(true)
    })
})
