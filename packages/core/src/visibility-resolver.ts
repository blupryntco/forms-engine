import { ConditionEvaluator } from './condition-evaluator'
import type { FieldEntry } from './types/field-entry'
import type { ContentItemType } from './types/field-types'
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
 *
 * In both modes a section is visible only while some value field (any type
 * except `section` and `static`) beneath it, at any depth, is visible.
 */
export class VisibilityResolver {
    private readonly registry: Map<number, FieldEntry>
    private readonly conditionEvaluator: ConditionEvaluator
    private readonly topologicalOrder: number[]
    private readonly fieldTypes: Map<number, ContentItemType>
    private readonly childrenByParent: Map<number, number[]>

    /**
     * @param registry - The engine's field registry.
     * @param conditionEvaluator - Evaluator for condition trees.
     * @param topologicalOrder - Item ids in topological order (from {@link DependencyGraph}).
     */
    constructor(registry: Map<number, FieldEntry>, conditionEvaluator: ConditionEvaluator, topologicalOrder: number[]) {
        this.registry = registry
        this.conditionEvaluator = conditionEvaluator
        this.topologicalOrder = topologicalOrder
        this.fieldTypes = new Map([...registry].map(([id, entry]) => [id, entry.type]))
        this.childrenByParent = VisibilityResolver.buildChildrenByParent(registry)
    }

    /**
     * Determines whether a single field or section is visible.
     *
     * Evaluation logic:
     * 1. If the item has its own condition, evaluate it. If `false`, the item is hidden.
     * 2. A section is additionally hidden unless some value field beneath it
     *    passes steps 1 and 3 (a section with no such field is empty).
     * 3. A non-section item is hidden whenever its parent section is hidden.
     * 4. Items without conditions and without hidden parents are visible.
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

        if (entry.type === 'section') {
            return this.isConditionVisible(id, values, now) && this.hasConditionVisibleValueField(id, values, now)
        }

        if (!this.isOwnConditionMet(entry, values, now)) return false
        if (entry.parentId !== undefined) return this.isVisible(entry.parentId, values, now)

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
     * A post-pass then hides every section with no visible value field beneath
     * it, together with its descendants. That only flips sections and `static`
     * blocks, which no condition can reference, so no condition result changes.
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
                    fieldTypes: this.fieldTypes,
                })
                result.set(id, visible)
            } else {
                result.set(id, true)
            }
        }

        this.hideEmptySections(result)

        return result
    }

    /** Whether the item's own condition and those of all its ancestors hold, ignoring section content. */
    private isConditionVisible(id: number, values: FormValues, now: Date): boolean {
        const entry = this.registry.get(id)
        if (!entry) return false
        if (!this.isOwnConditionMet(entry, values, now)) return false
        if (entry.parentId !== undefined) return this.isConditionVisible(entry.parentId, values, now)

        return true
    }

    /** Whether the entry has no condition or its condition evaluates to `true`. */
    private isOwnConditionMet(entry: FieldEntry, values: FormValues, now: Date): boolean {
        if (!entry.condition) return true

        return this.conditionEvaluator.evalCondition(entry.condition, { values, now, fieldTypes: this.fieldTypes })
    }

    /**
     * Whether some value field beneath the section, at any depth, passes
     * {@link isConditionVisible}. Ancestors are re-checked per field, which is
     * redundant but keeps the single-item path free of shared state.
     */
    private hasConditionVisibleValueField(sectionId: number, values: FormValues, now: Date): boolean {
        return (this.childrenByParent.get(sectionId) ?? []).some((childId) => {
            const type = this.registry.get(childId)?.type
            if (type === 'static') return false
            if (type === 'section') return this.hasConditionVisibleValueField(childId, values, now)

            return this.isConditionVisible(childId, values, now)
        })
    }

    /** Sets every visible section with no visible value field beneath it, and its subtree, to `false`. */
    private hideEmptySections(result: Map<number, boolean>): void {
        const contentCache = new Map<number, boolean>()

        for (const [id, entry] of this.registry) {
            if (entry.type !== 'section' || result.get(id) !== true) continue
            if (this.hasVisibleContent(id, result, contentCache)) continue

            this.hideSubtree(id, result)
        }
    }

    /** Whether some child of the section is visible and is a value field or a section with content. Memoized in `cache`. */
    private hasVisibleContent(sectionId: number, result: Map<number, boolean>, cache: Map<number, boolean>): boolean {
        const cached = cache.get(sectionId)
        if (cached !== undefined) return cached

        const hasContent = (this.childrenByParent.get(sectionId) ?? []).some((childId) => {
            if (result.get(childId) !== true) return false

            const type = this.registry.get(childId)?.type
            if (type === 'static') return false
            if (type === 'section') return this.hasVisibleContent(childId, result, cache)

            return true
        })
        cache.set(sectionId, hasContent)

        return hasContent
    }

    /** Marks the item and all its descendants hidden. */
    private hideSubtree(id: number, result: Map<number, boolean>): void {
        result.set(id, false)
        for (const childId of this.childrenByParent.get(id) ?? []) this.hideSubtree(childId, result)
    }

    /** Groups registry ids by their parent section id, in registry order. */
    private static buildChildrenByParent(registry: Map<number, FieldEntry>): Map<number, number[]> {
        const childrenByParent = new Map<number, number[]>()
        for (const [id, entry] of registry) {
            if (entry.parentId === undefined) continue

            const children = childrenByParent.get(entry.parentId)
            if (children) children.push(id)
            else childrenByParent.set(entry.parentId, [id])
        }

        return childrenByParent
    }
}
