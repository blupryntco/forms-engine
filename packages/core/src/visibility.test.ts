import { ConditionEvaluator } from './condition-eval'
import { DependencyGraph } from './dependency-graph'
import type { FieldEntry } from './types'
import { VisibilityResolver } from './visibility'

const makeEntry = (id: number, overrides: Partial<FieldEntry> = {}): FieldEntry => ({
    id,
    type: 'string',
    condition: undefined,
    validation: undefined,
    parentId: undefined,
    options: undefined,
    item: undefined,
    label: `Field ${id}`,
    title: undefined,
    ...overrides,
})

const condEval = new ConditionEvaluator()

describe('VisibilityResolver.isVisible', () => {
    it('returns true for a field with no condition', () => {
        const registry = new Map<number, FieldEntry>([[1, makeEntry(1)]])
        const resolver = new VisibilityResolver(registry, condEval, [1])
        expect(resolver.isVisible(1, {})).toBe(true)
    })

    it('returns false for an unknown ID', () => {
        const registry = new Map<number, FieldEntry>()
        const resolver = new VisibilityResolver(registry, condEval, [])
        expect(resolver.isVisible(999, {})).toBe(false)
    })

    it('returns true when condition evaluates to true', () => {
        const registry = new Map<number, FieldEntry>([
            [1, makeEntry(1)],
            [2, makeEntry(2, { condition: { field: 1, op: 'eq', value: 'yes' } })],
        ])
        const resolver = new VisibilityResolver(registry, condEval, [1, 2])
        expect(resolver.isVisible(2, { '1': 'yes' })).toBe(true)
    })

    it('returns false when condition evaluates to false', () => {
        const registry = new Map<number, FieldEntry>([
            [1, makeEntry(1)],
            [2, makeEntry(2, { condition: { field: 1, op: 'eq', value: 'yes' } })],
        ])
        const resolver = new VisibilityResolver(registry, condEval, [1, 2])
        expect(resolver.isVisible(2, { '1': 'no' })).toBe(false)
    })

    it('returns false when parent section is hidden', () => {
        const registry = new Map<number, FieldEntry>([
            [1, makeEntry(1)],
            [10, makeEntry(10, { type: 'section', condition: { field: 1, op: 'eq', value: 'show' } })],
            [20, makeEntry(20, { parentId: 10 })],
        ])
        const resolver = new VisibilityResolver(registry, condEval, [1, 10, 20])
        // Parent condition fails, so child is hidden regardless
        expect(resolver.isVisible(20, { '1': 'hide' })).toBe(false)
    })

    it('returns true when parent section is visible and child has no condition', () => {
        const registry = new Map<number, FieldEntry>([
            [1, makeEntry(1)],
            [10, makeEntry(10, { type: 'section', condition: { field: 1, op: 'eq', value: 'show' } })],
            [20, makeEntry(20, { parentId: 10 })],
        ])
        const resolver = new VisibilityResolver(registry, condEval, [1, 10, 20])
        expect(resolver.isVisible(20, { '1': 'show' })).toBe(true)
    })
})

describe('VisibilityResolver.getVisibilityMap', () => {
    it('marks all fields visible when no conditions exist', () => {
        const registry = new Map<number, FieldEntry>([
            [1, makeEntry(1)],
            [2, makeEntry(2)],
        ])
        const resolver = new VisibilityResolver(registry, condEval, [1, 2])
        const map = resolver.getVisibilityMap({})
        expect(map.get(1)).toBe(true)
        expect(map.get(2)).toBe(true)
    })

    it('hides field when condition is false', () => {
        const registry = new Map<number, FieldEntry>([
            [1, makeEntry(1)],
            [2, makeEntry(2, { condition: { field: 1, op: 'eq', value: 'yes' } })],
        ])
        const resolver = new VisibilityResolver(registry, condEval, [1, 2])
        const map = resolver.getVisibilityMap({ '1': 'no' })
        expect(map.get(1)).toBe(true)
        expect(map.get(2)).toBe(false)
    })

    it('hides child when parent section is hidden', () => {
        const registry = new Map<number, FieldEntry>([
            [1, makeEntry(1)],
            [10, makeEntry(10, { type: 'section', condition: { field: 1, op: 'eq', value: 'show' } })],
            [20, makeEntry(20, { parentId: 10 })],
        ])
        const resolver = new VisibilityResolver(registry, condEval, [1, 10, 20])
        const map = resolver.getVisibilityMap({ '1': 'hide' })
        expect(map.get(10)).toBe(false)
        expect(map.get(20)).toBe(false)
    })

    it('hidden-field referenced in condition is treated as not set', () => {
        // Field 1 controls field 2's visibility
        // Field 2 controls field 3's visibility
        // When field 2 is hidden, field 3's condition should see field 2 as "not set"
        const registry = new Map<number, FieldEntry>([
            [1, makeEntry(1)],
            [2, makeEntry(2, { condition: { field: 1, op: 'eq', value: 'show' } })],
            [3, makeEntry(3, { condition: { field: 2, op: 'set' } })],
        ])
        const resolver = new VisibilityResolver(registry, condEval, [1, 2, 3])

        // Field 2 has a value, but field 1 is 'hide', so field 2 is hidden
        // Field 3's condition sees field 2 as "not set" → field 3 is hidden
        const map = resolver.getVisibilityMap({ '1': 'hide', '2': 'some-value' })
        expect(map.get(2)).toBe(false)
        expect(map.get(3)).toBe(false)
    })

    it('hidden-field with notset condition evaluates to true', () => {
        const registry = new Map<number, FieldEntry>([
            [1, makeEntry(1)],
            [2, makeEntry(2, { condition: { field: 1, op: 'eq', value: 'show' } })],
            [3, makeEntry(3, { condition: { field: 2, op: 'notset' } })],
        ])
        const resolver = new VisibilityResolver(registry, condEval, [1, 2, 3])

        // Field 2 is hidden → field 3 sees field 2 as "not set" → notset is true → field 3 is visible
        const map = resolver.getVisibilityMap({ '1': 'hide', '2': 'val' })
        expect(map.get(2)).toBe(false)
        expect(map.get(3)).toBe(true)
    })
})

describe('DependencyGraph.getAffectedIds (via VisibilityResolver context)', () => {
    it('returns empty set when field has no dependents', () => {
        const registry = new Map<number, FieldEntry>([[1, makeEntry(1)]])
        const depGraph = new DependencyGraph(registry)
        const result = depGraph.getAffectedIds(1)
        expect(result.size).toBe(0)
    })

    it('returns correct transitive set', () => {
        const registry = new Map<number, FieldEntry>([
            [1, makeEntry(1)],
            [2, makeEntry(2, { condition: { field: 1, op: 'set' } })],
            [3, makeEntry(3, { condition: { field: 2, op: 'set' } })],
        ])
        const depGraph = new DependencyGraph(registry)
        const result = depGraph.getAffectedIds(1)
        expect(result).toEqual(new Set([2, 3]))
    })

    it('caching works (same result on second call)', () => {
        const registry = new Map<number, FieldEntry>([
            [1, makeEntry(1)],
            [2, makeEntry(2, { condition: { field: 1, op: 'set' } })],
            [3, makeEntry(3, { condition: { field: 1, op: 'set' } })],
        ])
        const depGraph = new DependencyGraph(registry)
        const first = depGraph.getAffectedIds(1)
        const second = depGraph.getAffectedIds(1)
        expect(first).toBe(second) // Same reference (cached)
        expect(first).toEqual(new Set([2, 3]))
    })

    it('returns cached empty set on second call for no dependents', () => {
        const registry = new Map<number, FieldEntry>([[99, makeEntry(99)]])
        const depGraph = new DependencyGraph(registry)
        const first = depGraph.getAffectedIds(99)
        const second = depGraph.getAffectedIds(99)
        expect(first).toBe(second)
        expect(first.size).toBe(0)
    })
})
