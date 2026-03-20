/**
 * A leaf condition that compares a single field's value against an expected value.
 *
 * @property field - Numeric id of the field whose value is tested.
 * @property op - Comparison operator. `set`/`notset` ignore {@link value};
 *   `in`/`notin` expect {@link value} to be an array.
 * @property value - The reference value for the comparison. Optional for
 *   `set`/`notset` operators.
 */
export type SimpleCondition = {
    field: number
    op: 'set' | 'notset' | 'eq' | 'ne' | 'lt' | 'gt' | 'lte' | 'gte' | 'in' | 'notin'
    value?: unknown
}

/**
 * A compound condition that combines child conditions with logical AND or OR.
 *
 * - `{ and: [...] }` -- all child conditions must be true.
 * - `{ or: [...] }` -- at least one child condition must be true.
 */
export type CompoundCondition = { and: Condition[] } | { or: Condition[] }

/**
 * A condition controlling visibility of a field or section.
 * Can be a {@link SimpleCondition} or a {@link CompoundCondition} that
 * recursively nests other conditions.
 */
export type Condition = SimpleCondition | CompoundCondition
