import type { Condition } from './types/conditions'
import type { FieldEntry } from './types/field-entry'

const DfsVisitState = { Unvisited: 0, InProgress: 1, Completed: 2 } as const
type DfsVisitState = (typeof DfsVisitState)[keyof typeof DfsVisitState]

/**
 * Manages the condition dependency graph for form fields.
 *
 * Built from the field registry during engine preparation. Provides:
 * - Forward dependency graph (`graph`): answers "if field X changes, which
 *   items need to re-evaluate their visibility?"
 * - Topological ordering (`topologicalOrder`): guarantees that when computing
 *   visibility, every item is evaluated after the fields it depends on.
 * - Affected-ids lookup (`getAffectedIds`): returns all transitively
 *   affected item ids when a field value changes (lazily cached).
 *
 * Static methods (`extractFieldRefs`, `detectCycle`) can be used before
 * constructing an instance, e.g. during semantic validation.
 */
export class DependencyGraph {
    /**
     * Forward adjacencyMap map: key is a field id, value is the set of item ids
     * whose conditions reference that field.
     */
    readonly graph: Map<number, Set<number>>

    /**
     * Item ids in topological order. Dependencies come before dependents.
     */
    readonly topologicalOrder: number[]

    private readonly registry: Map<number, FieldEntry>
    private readonly affectedCache = new Map<number, Set<number>>()

    /**
     * @param registry - The engine's field registry (built during preparation).
     */
    constructor(registry: Map<number, FieldEntry>) {
        this.registry = registry
        this.graph = this.buildGraph()
        this.topologicalOrder = this.buildTopologicalOrder()
    }

    /**
     * Extracts the set of field ids referenced by a condition tree.
     *
     * Recursively walks compound conditions (`and`/`or`) and collects the
     * `field` property from every leaf {@link SimpleCondition}.
     *
     * @param condition - A simple or compound condition.
     * @returns Set of all unique field ids that appear in the condition.
     */
    static extractFieldRefs(condition: Condition): Set<number> {
        const refs = new Set<number>()
        DependencyGraph.collectRefs(condition, refs)
        return refs
    }

    /**
     * Detects circular dependencies in the condition graph.
     *
     * Uses DFS-based cycle detection (white/gray/black coloring). If a cycle
     * is found, the function reconstructs and returns a human-readable path
     * string (e.g. `"1 -> 2 -> 3 -> 1"`).
     *
     * @param registry - The engine's field registry.
     * @returns An array of field ids forming the cycle, or `undefined` if no cycle exists.
     */
    static detectCycle(registry: Map<number, FieldEntry>): number[] | undefined {
        const allIds = new Set(registry.keys())
        const adjacencyMap = new Map<number, Set<number>>()

        for (const [id, entry] of registry) {
            if (!entry.condition) continue

            const refs = DependencyGraph.extractFieldRefs(entry.condition)

            for (const ref of refs) {
                if (!allIds.has(ref)) continue

                let targets = adjacencyMap.get(ref)
                if (!targets) {
                    targets = new Set()
                    adjacencyMap.set(ref, targets)
                }

                targets.add(id)
            }
        }

        // DFS-based cycle detection

        const nodes = new Map<number, DfsVisitState>()
        const parent = new Map<number, number>()

        for (const id of allIds) {
            nodes.set(id, DfsVisitState.Unvisited)
        }

        for (const id of allIds) {
            if (nodes.get(id) === DfsVisitState.Unvisited) {
                const cyclePath = DependencyGraph.dfs(id, adjacencyMap, nodes, parent, allIds)
                if (cyclePath) return cyclePath
            }
        }

        return undefined
    }

    /**
     * Returns the set of item ids whose visibility could change when the given
     * field's value changes.
     *
     * Performs a transitive expansion of the forward dependency graph starting
     * from the field's direct dependents. Results are memoized for subsequent
     * calls with the same `fieldId`.
     *
     * @param fieldId - Id of the field whose value changed.
     * @returns Set of all transitively affected item ids. Empty set if no items
     *   depend on `fieldId`.
     */
    getAffectedIds(fieldId: number): Set<number> {
        const cached = this.affectedCache.get(fieldId)
        if (cached) return cached

        const directDeps = this.graph.get(fieldId)
        if (!directDeps || directDeps.size === 0) {
            const empty = new Set<number>()
            this.affectedCache.set(fieldId, empty)
            return empty
        }

        const expanded = this.expandTransitiveDependencies(directDeps)
        this.affectedCache.set(fieldId, expanded)

        return expanded
    }

    private static collectRefs(condition: Condition, refs: Set<number>): void {
        if ('and' in condition) {
            for (const c of condition.and) DependencyGraph.collectRefs(c, refs)
        } else if ('or' in condition) {
            for (const c of condition.or) DependencyGraph.collectRefs(c, refs)
        } else {
            refs.add(condition.field)
        }
    }

    private static dfs(
        node: number,
        adjacencyMap: Map<number, Set<number>>,
        nodes: Map<number, DfsVisitState>,
        parent: Map<number, number>,
        allIds: Set<number>,
    ): number[] | undefined {
        nodes.set(node, DfsVisitState.InProgress)

        const neighbors = adjacencyMap.get(node)
        if (neighbors) {
            for (const next of neighbors) {
                if (!allIds.has(next)) continue

                if (nodes.get(next) === DfsVisitState.InProgress)
                    return DependencyGraph.reconstructCycle(next, node, parent)

                if (nodes.get(next) === DfsVisitState.Completed) continue

                parent.set(next, node)

                const cycle = DependencyGraph.dfs(next, adjacencyMap, nodes, parent, allIds)
                if (cycle) return cycle
            }
        }

        nodes.set(node, DfsVisitState.Completed)
        return undefined
    }

    private static reconstructCycle(cycleStart: number, cycleEnd: number, parent: Map<number, number>): number[] {
        const path: number[] = [cycleStart]

        let current = cycleEnd
        while (current !== cycleStart) {
            path.push(current)

            const next = parent.get(current)
            if (next === undefined) break

            current = next
        }

        path.push(cycleStart)

        return path.reverse()
    }

    /**
     * Builds the forward dependency graph from the registry.
     */
    private buildGraph(): Map<number, Set<number>> {
        const graph = new Map<number, Set<number>>()

        for (const [id, entry] of this.registry) {
            if (!entry.condition) continue

            const refs = DependencyGraph.extractFieldRefs(entry.condition)

            for (const ref of refs) {
                let deps = graph.get(ref)
                if (!deps) {
                    deps = new Set()
                    graph.set(ref, deps)
                }

                deps.add(id)
            }
        }

        return graph
    }

    /**
     * Produces a topological ordering using Kahn's algorithm.
     */
    private buildTopologicalOrder(): number[] {
        const allIds = new Set(this.registry.keys())

        const inDegree = new Map<number, number>()
        const adjacencyMap = new Map<number, Set<number>>()

        for (const id of allIds) {
            inDegree.set(id, 0)
        }

        for (const [id, entry] of this.registry) {
            if (!entry.condition) continue

            const refs = DependencyGraph.extractFieldRefs(entry.condition)
            for (const ref of refs) {
                if (!allIds.has(ref)) continue

                let targets = adjacencyMap.get(ref)
                if (!targets) {
                    targets = new Set()
                    adjacencyMap.set(ref, targets)
                }
                if (!targets.has(id)) {
                    targets.add(id)
                    inDegree.set(id, (inDegree.get(id) ?? 0) + 1)
                }
            }
        }

        // Parent → child edges ensure parents are evaluated before children
        // in getVisibilityMap, so cascading visibility works correctly.
        for (const [id, entry] of this.registry) {
            if (entry.parentId === undefined) continue
            if (!allIds.has(entry.parentId)) continue

            let targets = adjacencyMap.get(entry.parentId)
            if (!targets) {
                targets = new Set()
                adjacencyMap.set(entry.parentId, targets)
            }
            if (!targets.has(id)) {
                targets.add(id)
                inDegree.set(id, (inDegree.get(id) ?? 0) + 1)
            }
        }

        // Kahn's algorithm
        const queue: number[] = []
        for (const [id, deg] of inDegree) {
            if (deg === 0) queue.push(id)
        }

        const sorted: number[] = []

        while (queue.length > 0) {
            const current = queue.shift()
            if (current === undefined) break
            sorted.push(current)

            const targets = adjacencyMap.get(current)
            if (targets) {
                for (const target of targets) {
                    const newDeg = (inDegree.get(target) ?? 1) - 1
                    inDegree.set(target, newDeg)
                    if (newDeg === 0) {
                        queue.push(target)
                    }
                }
            }
        }

        if (sorted.length !== allIds.size) {
            const inCycle = [...allIds].filter((id) => !sorted.includes(id))
            const cyclePath = inCycle.join(' -> ')
            return sorted.length === 0
                ? []
                : (() => {
                      throw cyclePath
                  })()
        }

        return sorted
    }

    /**
     * Expands a set of item ids to include all transitive dependents via BFS.
     */
    private expandTransitiveDependencies(startIds: Set<number>): Set<number> {
        const result = new Set<number>()
        const queue = [...startIds]

        while (queue.length > 0) {
            const id = queue.shift()

            if (id === undefined) break
            if (result.has(id)) continue

            result.add(id)

            const deps = this.graph.get(id)
            if (deps) {
                for (const dep of deps) {
                    if (!result.has(dep)) queue.push(dep)
                }
            }
        }

        return result
    }
}
