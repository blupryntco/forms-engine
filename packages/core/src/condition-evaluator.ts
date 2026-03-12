import { isRelativeDate, resolveRelativeDate } from './date-utils'
import type { Condition, SimpleCondition } from './types'

/**
 * Context passed to condition evaluation methods.
 *
 * @property values - Current form values keyed by stringified field id.
 * @property visibilityMap - Pre-computed visibility map. When provided, a
 *   reference to a hidden field is treated as "not set" regardless of its
 *   actual value.
 * @property now - Reference date for resolving relative date expressions in
 *   condition values.
 */
export type EvaluationContext = {
    values: Record<string, unknown>
    visibilityMap?: Map<number, boolean>
    now?: Date
}

/**
 * Evaluates condition trees against form state.
 *
 * Supports three kinds of conditions:
 * - **Simple** ({@link SimpleCondition}): compares a single field's value
 *   using one of the supported operators (`set`, `notset`, `eq`, `ne`, `lt`,
 *   `gt`, `lte`, `gte`, `in`, `notin`).
 * - **Compound AND**: `{ and: [...] }` -- all child conditions must be true.
 * - **Compound OR**: `{ or: [...] }` -- at least one child condition must be true.
 *
 * **Hidden-field rule**: when a `visibilityMap` is provided and the
 * referenced field is hidden (`false`), the condition evaluates as if the
 * field has no value. This means `notset` returns `true` and all other
 * operators return `false`.
 *
 * **Date handling**: condition values that are relative date expressions
 * (e.g. `"+7d"`) are resolved against `ctx.now` before comparison.
 */
export class ConditionEvaluator {
    /**
     * Evaluates a condition tree against the current form state.
     *
     * @param condition - The condition to evaluate (simple or compound).
     * @param ctx - Evaluation context containing form values and optional
     *   visibility/date overrides.
     * @returns `true` if the condition is satisfied, `false` otherwise.
     */
    evalCondition(condition: Condition, ctx: EvaluationContext): boolean {
        if ('and' in condition) {
            return condition.and.every((c) => this.evalCondition(c, ctx))
        }
        if ('or' in condition) {
            return condition.or.some((c) => this.evalCondition(c, ctx))
        }
        return this.evalSimple(condition as SimpleCondition, ctx)
    }

    private evalSimple(cond: SimpleCondition, ctx: EvaluationContext): boolean {
        // Hidden-field rule: if the referenced field is hidden, treat as not set
        if (ctx.visibilityMap && ctx.visibilityMap.get(cond.field) === false) {
            return cond.op === 'notset'
        }

        const fieldValue = ctx.values[String(cond.field)]

        switch (cond.op) {
            case 'set':
                return fieldValue !== null && fieldValue !== undefined && fieldValue !== ''
            case 'notset':
                return fieldValue === null || fieldValue === undefined || fieldValue === ''
            case 'eq':
                return fieldValue === this.resolveIfDate(cond.value, ctx.now)
            case 'ne':
                return fieldValue !== this.resolveIfDate(cond.value, ctx.now)
            case 'lt':
                return this.compareTo(fieldValue, cond.value, ctx.now) < 0
            case 'gt':
                return this.compareTo(fieldValue, cond.value, ctx.now) > 0
            case 'lte':
                return this.compareTo(fieldValue, cond.value, ctx.now) <= 0
            case 'gte':
                return this.compareTo(fieldValue, cond.value, ctx.now) >= 0
            case 'in':
                return Array.isArray(cond.value) && cond.value.includes(fieldValue)
            case 'notin':
                return Array.isArray(cond.value) && !cond.value.includes(fieldValue)
            default:
                return false
        }
    }

    private resolveIfDate(value: unknown, now?: Date): unknown {
        if (isRelativeDate(value)) {
            return resolveRelativeDate(value, now)
        }
        return value
    }

    private compareTo(a: unknown, b: unknown, now?: Date): number {
        const resolvedB = this.resolveIfDate(b, now)

        if (typeof a === 'number' && typeof resolvedB === 'number') {
            return a - resolvedB
        }

        // Date comparison: both must be parseable date strings
        if (typeof a === 'string' && typeof resolvedB === 'string') {
            const ta = Date.parse(a)
            const tb = Date.parse(resolvedB)
            if (!Number.isNaN(ta) && !Number.isNaN(tb)) {
                return ta - tb
            }
            // Fall back to lexicographic for non-date strings
            if (a < resolvedB) return -1
            if (a > resolvedB) return 1
            return 0
        }

        return Number.NaN
    }
}
