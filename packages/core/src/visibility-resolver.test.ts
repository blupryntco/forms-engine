import { ConditionEvaluator } from './condition-evaluator'
import { DependencyGraph } from './dependency-graph'
import type { FieldEntry } from './types/field-entry'
import { VisibilityResolver } from './visibility-resolver'

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

const conditionEvaluator = new ConditionEvaluator()
const now = new Date('2024-06-15T00:00:00Z')

describe('VisibilityResolver.isVisible', () => {
    it('returns true for a field with no condition', () => {
        const registry = new Map<number, FieldEntry>([[1, makeEntry(1)]])
        const resolver = new VisibilityResolver(registry, conditionEvaluator, [1])
        expect(resolver.isVisible(1, {}, now)).toBe(true)
    })

    it('returns false for an unknown ID', () => {
        const registry = new Map<number, FieldEntry>()
        const resolver = new VisibilityResolver(registry, conditionEvaluator, [])
        expect(resolver.isVisible(999, {}, now)).toBe(false)
    })

    it('returns true when condition evaluates to true', () => {
        const registry = new Map<number, FieldEntry>([
            [1, makeEntry(1)],
            [2, makeEntry(2, { condition: { field: 1, op: 'eq', value: 'yes' } })],
        ])
        const resolver = new VisibilityResolver(registry, conditionEvaluator, [1, 2])
        expect(resolver.isVisible(2, { '1': 'yes' }, now)).toBe(true)
    })

    it('returns false when condition evaluates to false', () => {
        const registry = new Map<number, FieldEntry>([
            [1, makeEntry(1)],
            [2, makeEntry(2, { condition: { field: 1, op: 'eq', value: 'yes' } })],
        ])
        const resolver = new VisibilityResolver(registry, conditionEvaluator, [1, 2])
        expect(resolver.isVisible(2, { '1': 'no' }, now)).toBe(false)
    })

    it('returns false when parent section is hidden', () => {
        const registry = new Map<number, FieldEntry>([
            [1, makeEntry(1)],
            [10, makeEntry(10, { type: 'section', condition: { field: 1, op: 'eq', value: 'show' } })],
            [20, makeEntry(20, { parentId: 10 })],
        ])
        const resolver = new VisibilityResolver(registry, conditionEvaluator, [1, 10, 20])
        // Parent condition fails, so child is hidden regardless
        expect(resolver.isVisible(20, { '1': 'hide' }, now)).toBe(false)
    })

    it('returns true when parent section is visible and child has no condition', () => {
        const registry = new Map<number, FieldEntry>([
            [1, makeEntry(1)],
            [10, makeEntry(10, { type: 'section', condition: { field: 1, op: 'eq', value: 'show' } })],
            [20, makeEntry(20, { parentId: 10 })],
        ])
        const resolver = new VisibilityResolver(registry, conditionEvaluator, [1, 10, 20])
        expect(resolver.isVisible(20, { '1': 'show' }, now)).toBe(true)
    })

    it('returns true when parent section is visible and child has truthy condition', () => {
        const registry = new Map<number, FieldEntry>([
            [1, makeEntry(1)],
            [10, makeEntry(10, { type: 'section', condition: { field: 1, op: 'eq', value: 'show' } })],
            [20, makeEntry(20, { parentId: 10, condition: { field: 1, op: 'set' } })],
        ])
        const resolver = new VisibilityResolver(registry, conditionEvaluator, [1, 10, 20])
        expect(resolver.isVisible(20, { '1': 'show' }, now)).toBe(true)
    })

    it('returns false when parent section is visible and child has falsy condition', () => {
        const registry = new Map<number, FieldEntry>([
            [1, makeEntry(1)],
            [10, makeEntry(10, { type: 'section', condition: { field: 1, op: 'eq', value: 'show' } })],
            [20, makeEntry(20, { parentId: 10, condition: { field: 1, op: 'eq', value: 'other' } })],
        ])
        const resolver = new VisibilityResolver(registry, conditionEvaluator, [1, 10, 20])
        expect(resolver.isVisible(20, { '1': 'show' }, now)).toBe(false)
    })
})

describe('VisibilityResolver.getVisibilityMap', () => {
    it('marks all fields visible when no conditions exist', () => {
        const registry = new Map<number, FieldEntry>([
            [1, makeEntry(1)],
            [2, makeEntry(2)],
        ])
        const resolver = new VisibilityResolver(registry, conditionEvaluator, [1, 2])
        const map = resolver.getVisibilityMap({}, now)
        expect(map).toEqual(
            new Map([
                [1, true],
                [2, true],
            ]),
        )
    })

    it('hides field when condition is false', () => {
        const registry = new Map<number, FieldEntry>([
            [1, makeEntry(1)],
            [2, makeEntry(2, { condition: { field: 1, op: 'eq', value: 'yes' } })],
        ])
        const resolver = new VisibilityResolver(registry, conditionEvaluator, [1, 2])
        const map = resolver.getVisibilityMap({ '1': 'no' }, now)
        expect(map).toEqual(
            new Map([
                [1, true],
                [2, false],
            ]),
        )
    })

    it('shows field when condition is true', () => {
        const registry = new Map<number, FieldEntry>([
            [1, makeEntry(1)],
            [2, makeEntry(2, { condition: { field: 1, op: 'eq', value: 'yes' } })],
        ])
        const resolver = new VisibilityResolver(registry, conditionEvaluator, [1, 2])
        const map = resolver.getVisibilityMap({ '1': 'yes' }, now)
        expect(map).toEqual(
            new Map([
                [1, true],
                [2, true],
            ]),
        )
    })

    it('hides child when parent section is hidden', () => {
        const registry = new Map<number, FieldEntry>([
            [1, makeEntry(1)],
            [10, makeEntry(10, { type: 'section', condition: { field: 1, op: 'eq', value: 'show' } })],
            [20, makeEntry(20, { parentId: 10 })],
        ])
        const resolver = new VisibilityResolver(registry, conditionEvaluator, [1, 10, 20])
        const map = resolver.getVisibilityMap({ '1': 'hide' }, now)
        expect(map).toEqual(
            new Map([
                [1, true],
                [10, false],
                [20, false],
            ]),
        )
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
        const resolver = new VisibilityResolver(registry, conditionEvaluator, [1, 2, 3])

        // Field 2 has a value, but field 1 is 'hide', so field 2 is hidden
        // Field 3's condition sees field 2 as "not set" → field 3 is hidden
        const map = resolver.getVisibilityMap({ '1': 'hide', '2': 'some-value' }, now)
        expect(map).toEqual(
            new Map([
                [1, true],
                [2, false],
                [3, false],
            ]),
        )
    })

    it('hidden-field with notset condition evaluates to true', () => {
        const registry = new Map<number, FieldEntry>([
            [1, makeEntry(1)],
            [2, makeEntry(2, { condition: { field: 1, op: 'eq', value: 'show' } })],
            [3, makeEntry(3, { condition: { field: 2, op: 'notset' } })],
        ])
        const resolver = new VisibilityResolver(registry, conditionEvaluator, [1, 2, 3])

        // Field 2 is hidden → field 3 sees field 2 as "not set" → notset is true → field 3 is visible
        const map = resolver.getVisibilityMap({ '1': 'hide', '2': 'val' }, now)
        expect(map).toEqual(
            new Map([
                [1, true],
                [2, false],
                [3, true],
            ]),
        )
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

    it('returns all transitive dependents in a 10-field chain', () => {
        // Linear chain: 1 → 2 → 3 → 4 → 5 → 6 → 7 → 8 → 9 → 10
        const registry = new Map<number, FieldEntry>([
            [1, makeEntry(1)],
            [2, makeEntry(2, { condition: { field: 1, op: 'set' } })],
            [3, makeEntry(3, { condition: { field: 2, op: 'set' } })],
            [4, makeEntry(4, { condition: { field: 3, op: 'set' } })],
            [5, makeEntry(5, { condition: { field: 4, op: 'set' } })],
            [6, makeEntry(6, { condition: { field: 5, op: 'set' } })],
            [7, makeEntry(7, { condition: { field: 6, op: 'set' } })],
            [8, makeEntry(8, { condition: { field: 7, op: 'set' } })],
            [9, makeEntry(9, { condition: { field: 8, op: 'set' } })],
            [10, makeEntry(10, { condition: { field: 9, op: 'set' } })],
        ])
        const depGraph = new DependencyGraph(registry)
        expect(depGraph.getAffectedIds(1)).toEqual(new Set([2, 3, 4, 5, 6, 7, 8, 9, 10]))
        expect(depGraph.getAffectedIds(5)).toEqual(new Set([6, 7, 8, 9, 10]))
        expect(depGraph.getAffectedIds(10)).toEqual(new Set())
    })

    it('returns correct dependents in a 10-field fan-out from single root', () => {
        // Fan-out: fields 2–10 all depend on field 1
        const registry = new Map<number, FieldEntry>([
            [1, makeEntry(1)],
            [2, makeEntry(2, { condition: { field: 1, op: 'set' } })],
            [3, makeEntry(3, { condition: { field: 1, op: 'set' } })],
            [4, makeEntry(4, { condition: { field: 1, op: 'set' } })],
            [5, makeEntry(5, { condition: { field: 1, op: 'set' } })],
            [6, makeEntry(6, { condition: { field: 1, op: 'set' } })],
            [7, makeEntry(7, { condition: { field: 1, op: 'set' } })],
            [8, makeEntry(8, { condition: { field: 1, op: 'set' } })],
            [9, makeEntry(9, { condition: { field: 1, op: 'set' } })],
            [10, makeEntry(10, { condition: { field: 1, op: 'set' } })],
        ])
        const depGraph = new DependencyGraph(registry)
        expect(depGraph.getAffectedIds(1)).toEqual(new Set([2, 3, 4, 5, 6, 7, 8, 9, 10]))
        expect(depGraph.getAffectedIds(5)).toEqual(new Set())
    })

    it('returns correct dependents in a 10-field diamond/tree graph', () => {
        // Tree:  1 → {2, 3, 4}
        //        2 → {5, 6}
        //        3 → {7, 8}
        //        4 → {9, 10}
        const registry = new Map<number, FieldEntry>([
            [1, makeEntry(1)],
            [2, makeEntry(2, { condition: { field: 1, op: 'set' } })],
            [3, makeEntry(3, { condition: { field: 1, op: 'set' } })],
            [4, makeEntry(4, { condition: { field: 1, op: 'set' } })],
            [5, makeEntry(5, { condition: { field: 2, op: 'set' } })],
            [6, makeEntry(6, { condition: { field: 2, op: 'set' } })],
            [7, makeEntry(7, { condition: { field: 3, op: 'set' } })],
            [8, makeEntry(8, { condition: { field: 3, op: 'set' } })],
            [9, makeEntry(9, { condition: { field: 4, op: 'set' } })],
            [10, makeEntry(10, { condition: { field: 4, op: 'set' } })],
        ])
        const depGraph = new DependencyGraph(registry)
        expect(depGraph.getAffectedIds(1)).toEqual(new Set([2, 3, 4, 5, 6, 7, 8, 9, 10]))
        expect(depGraph.getAffectedIds(2)).toEqual(new Set([5, 6]))
        expect(depGraph.getAffectedIds(3)).toEqual(new Set([7, 8]))
        expect(depGraph.getAffectedIds(4)).toEqual(new Set([9, 10]))
        expect(depGraph.getAffectedIds(7)).toEqual(new Set())
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
