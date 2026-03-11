import { DependencyGraph } from './dependency-graph'
import type { Condition, FieldEntry } from './types'

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

describe('DependencyGraph.extractFieldRefs', () => {
    it('extracts field from a simple condition', () => {
        const cond: Condition = { field: 1, op: 'eq', value: 'x' }
        expect(DependencyGraph.extractFieldRefs(cond)).toEqual(new Set([1]))
    })

    it('extracts fields from a compound and condition', () => {
        const cond: Condition = {
            and: [
                { field: 1, op: 'eq', value: 'a' },
                { field: 2, op: 'set' },
            ],
        }
        expect(DependencyGraph.extractFieldRefs(cond)).toEqual(new Set([1, 2]))
    })

    it('extracts fields from a compound or condition', () => {
        const cond: Condition = {
            or: [
                { field: 3, op: 'eq', value: 'x' },
                { field: 4, op: 'eq', value: 'y' },
            ],
        }
        expect(DependencyGraph.extractFieldRefs(cond)).toEqual(new Set([3, 4]))
    })

    it('extracts fields from nested compound conditions', () => {
        const cond: Condition = {
            and: [
                { field: 1, op: 'set' },
                {
                    or: [
                        { field: 2, op: 'gt', value: 10 },
                        { field: 3, op: 'lt', value: 0 },
                    ],
                },
            ],
        }
        expect(DependencyGraph.extractFieldRefs(cond)).toEqual(new Set([1, 2, 3]))
    })

    it('deduplicates field references', () => {
        const cond: Condition = {
            and: [
                { field: 1, op: 'eq', value: 'a' },
                { field: 1, op: 'ne', value: 'b' },
            ],
        }
        expect(DependencyGraph.extractFieldRefs(cond)).toEqual(new Set([1]))
    })
})

describe('DependencyGraph constructor (graph)', () => {
    it('returns empty graph when no conditions exist', () => {
        const registry = new Map<number, FieldEntry>([
            [1, makeEntry(1)],
            [2, makeEntry(2)],
        ])
        const depGraph = new DependencyGraph(registry)
        expect(depGraph.graph.size).toBe(0)
    })

    it('builds graph from simple condition', () => {
        const registry = new Map<number, FieldEntry>([
            [1, makeEntry(1)],
            [2, makeEntry(2, { condition: { field: 1, op: 'eq', value: 'a' } })],
        ])
        const depGraph = new DependencyGraph(registry)
        expect(depGraph.graph.get(1)).toEqual(new Set([2]))
    })

    it('builds graph from compound condition referencing multiple fields', () => {
        const registry = new Map<number, FieldEntry>([
            [1, makeEntry(1)],
            [2, makeEntry(2)],
            [
                3,
                makeEntry(3, {
                    condition: {
                        and: [
                            { field: 1, op: 'set' },
                            { field: 2, op: 'set' },
                        ],
                    },
                }),
            ],
        ])
        const depGraph = new DependencyGraph(registry)
        expect(depGraph.graph.get(1)).toEqual(new Set([3]))
        expect(depGraph.graph.get(2)).toEqual(new Set([3]))
    })

    it('accumulates multiple dependents for a single field', () => {
        const registry = new Map<number, FieldEntry>([
            [1, makeEntry(1)],
            [2, makeEntry(2, { condition: { field: 1, op: 'eq', value: 'a' } })],
            [3, makeEntry(3, { condition: { field: 1, op: 'eq', value: 'b' } })],
        ])
        const depGraph = new DependencyGraph(registry)
        expect(depGraph.graph.get(1)).toEqual(new Set([2, 3]))
    })
})

describe('DependencyGraph constructor (topoOrder)', () => {
    it('returns all IDs when no dependencies exist', () => {
        const registry = new Map<number, FieldEntry>([
            [1, makeEntry(1)],
            [2, makeEntry(2)],
            [3, makeEntry(3)],
        ])
        const depGraph = new DependencyGraph(registry)
        expect(depGraph.topoOrder.sort()).toEqual([1, 2, 3])
    })

    it('places dependency before dependent for simple deps', () => {
        const registry = new Map<number, FieldEntry>([
            [1, makeEntry(1)],
            [2, makeEntry(2, { condition: { field: 1, op: 'set' } })],
        ])
        const depGraph = new DependencyGraph(registry)
        expect(depGraph.topoOrder.indexOf(1)).toBeLessThan(depGraph.topoOrder.indexOf(2))
    })

    it('handles chain dependencies (1 → 2 → 3)', () => {
        const registry = new Map<number, FieldEntry>([
            [1, makeEntry(1)],
            [2, makeEntry(2, { condition: { field: 1, op: 'set' } })],
            [3, makeEntry(3, { condition: { field: 2, op: 'set' } })],
        ])
        const depGraph = new DependencyGraph(registry)
        expect(depGraph.topoOrder.indexOf(1)).toBeLessThan(depGraph.topoOrder.indexOf(2))
        expect(depGraph.topoOrder.indexOf(2)).toBeLessThan(depGraph.topoOrder.indexOf(3))
    })

    it('includes nodes with no edges', () => {
        const registry = new Map<number, FieldEntry>([
            [1, makeEntry(1)],
            [2, makeEntry(2, { condition: { field: 1, op: 'set' } })],
            [3, makeEntry(3)], // no condition, no dependency
        ])
        const depGraph = new DependencyGraph(registry)
        expect(depGraph.topoOrder).toHaveLength(3)
        expect(depGraph.topoOrder).toContain(3)
    })
})

describe('DependencyGraph.detectCycle', () => {
    it('returns null when no cycle exists', () => {
        const registry = new Map<number, FieldEntry>([
            [1, makeEntry(1)],
            [2, makeEntry(2, { condition: { field: 1, op: 'set' } })],
        ])
        expect(DependencyGraph.detectCycle(registry)).toBeNull()
    })

    it('returns null for entries without conditions', () => {
        const registry = new Map<number, FieldEntry>([
            [1, makeEntry(1)],
            [2, makeEntry(2)],
        ])
        expect(DependencyGraph.detectCycle(registry)).toBeNull()
    })

    it('detects a simple cycle (A → B → A)', () => {
        const registry = new Map<number, FieldEntry>([
            [1, makeEntry(1, { condition: { field: 2, op: 'set' } })],
            [2, makeEntry(2, { condition: { field: 1, op: 'set' } })],
        ])
        const result = DependencyGraph.detectCycle(registry)
        expect(result).not.toBeNull()
        expect(result).toContain('1')
        expect(result).toContain('2')
    })

    it('detects a transitive cycle (A → B → C → A)', () => {
        const registry = new Map<number, FieldEntry>([
            [1, makeEntry(1, { condition: { field: 3, op: 'set' } })],
            [2, makeEntry(2, { condition: { field: 1, op: 'set' } })],
            [3, makeEntry(3, { condition: { field: 2, op: 'set' } })],
        ])
        const result = DependencyGraph.detectCycle(registry)
        expect(result).not.toBeNull()
    })
})

describe('DependencyGraph.getAffectedIds', () => {
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
