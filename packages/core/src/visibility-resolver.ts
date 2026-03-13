import { ConditionEvaluator } from './condition-evaluator'
import type { FieldEntry } from './types/field-entry'
import type { FormValues } from './types/form-values'

/**
 * Computes field and section visibility for a form.
 *
 * Provides two modes of visibility computation:
 * - **Single-item** (`isVisible`): evaluates one item's condition plus its
 *   parent chain. Does not use the hidden-field rule.
 * - **Bulk** (`getVisibilityMap`): evaluates all items in topological order
 *   with the hidden-field rule applied (references to hidden fields are
 *   treated as "not set").
 */
export class VisibilityResolver {
    private readonly registry: Map<number, FieldEntry>
    private readonly conditionEvaluator: ConditionEvaluator
    private readonly topologicalOrder: number[]

    /**
     * @param registry - The engine's field registry.
     * @param conditionEvaluator - Evaluator for condition trees.
     * @param topologicalOrder - Item ids in topological order (from {@link DependencyGraph}).
     */
    constructor(registry: Map<number, FieldEntry>, conditionEvaluator: ConditionEvaluator, topologicalOrder: number[]) {
        this.registry = registry
        this.conditionEvaluator = conditionEvaluator
        this.topologicalOrder = topologicalOrder
    }

    /**
     * Determines whether a single field or section is visible.
     *
     * Evaluation logic:
     * 1. If the item has its own condition, evaluate it. If `false`, the item is hidden.
     * 2. If the item has a parent section, recursively check parent visibility.
     *    An item is hidden whenever any ancestor is hidden.
     * 3. Items without conditions and without hidden parents are visible.
     *
     * Unlike {@link getVisibilityMap}, this method does not use the
     * pre-computed visibility map and does not apply the hidden-field rule.
     * Use it for one-off visibility checks; prefer `getVisibilityMap` when
     * evaluating many items at once.
     *
     * @param id - Numeric id of the field or section to check.
     * @param values - Current form values.
     * @param now - Reference date for relative date expressions.
     * @returns `true` if the item should be displayed.
     */
    isVisible(id: number, values: FormValues, now: Date): boolean {
        const entry = this.registry.get(id)
        if (!entry) return false

        // Check own condition
        if (entry.condition) {
            const result = this.conditionEvaluator.evalCondition(entry.condition, { values, now })
            if (!result) return false
        }

        // Check parent chain
        if (entry.parentId !== undefined) {
            return this.isVisible(entry.parentId, values, now)
        }

        return true
    }

    /**
     * Computes visibility for all fields and sections in a single pass.
     *
     * Iterates in topological order so that every item is evaluated after the
     * fields its condition depends on. This enables the **hidden-field rule**:
     * if a condition references a field that has already been determined hidden,
     * that field is treated as "not set".
     *
     * Cascading parent visibility is also enforced -- if a parent section is
     * hidden, all its children are immediately marked hidden without evaluating
     * their own conditions.
     *
     * @param values - Current form values.
     * @param now - Reference date for relative date expressions.
     * @returns Map from item id to visibility boolean (`true` = visible).
     */
    getVisibilityMap(values: FormValues, now: Date): Map<number, boolean> {
        const result = new Map<number, boolean>()

        for (const id of this.topologicalOrder) {
            const entry = this.registry.get(id)
            if (!entry) {
                result.set(id, false)
                continue
            }

            // Parent must be visible
            if (entry.parentId !== undefined && result.get(entry.parentId) === false) {
                result.set(id, false)
                continue
            }

            // Evaluate own condition
            if (entry.condition) {
                const visible = this.conditionEvaluator.evalCondition(entry.condition, {
                    values,
                    visibilityMap: result,
                    now,
                })
                result.set(id, visible)
            } else {
                result.set(id, true)
            }
        }

        return result
    }
}
