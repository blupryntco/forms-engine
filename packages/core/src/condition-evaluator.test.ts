import { ConditionEvaluator } from './condition-evaluator'
import type { Condition } from './types'

const evaluator = new ConditionEvaluator()

describe('ConditionEvaluator', () => {
    describe('set operator', () => {
        it('returns true when field has a string value', () => {
            expect(evaluator.evalCondition({ field: 1, op: 'set' }, { values: { '1': 'hello' } })).toBe(true)
        })

        it('returns true when field has a number value', () => {
            expect(evaluator.evalCondition({ field: 1, op: 'set' }, { values: { '1': 42 } })).toBe(true)
        })

        it('returns true when field has a boolean true value', () => {
            expect(evaluator.evalCondition({ field: 1, op: 'set' }, { values: { '1': true } })).toBe(true)
        })

        it('returns true when field has a boolean false value', () => {
            expect(evaluator.evalCondition({ field: 1, op: 'set' }, { values: { '1': false } })).toBe(true)
        })

        it('returns false when field is null', () => {
            expect(evaluator.evalCondition({ field: 1, op: 'set' }, { values: { '1': null } })).toBe(false)
        })

        it('returns false when field is undefined', () => {
            expect(evaluator.evalCondition({ field: 1, op: 'set' }, { values: { '1': undefined } })).toBe(false)
        })

        it('returns false when field is empty string', () => {
            expect(evaluator.evalCondition({ field: 1, op: 'set' }, { values: { '1': '' } })).toBe(false)
        })

        it('returns false when field is missing from values', () => {
            expect(evaluator.evalCondition({ field: 1, op: 'set' }, { values: {} })).toBe(false)
        })

        it('returns true when field is zero', () => {
            expect(evaluator.evalCondition({ field: 1, op: 'set' }, { values: { '1': 0 } })).toBe(true)
        })
    })

    describe('notset operator', () => {
        it('returns true when field is null', () => {
            expect(evaluator.evalCondition({ field: 1, op: 'notset' }, { values: { '1': null } })).toBe(true)
        })

        it('returns true when field is undefined', () => {
            expect(evaluator.evalCondition({ field: 1, op: 'notset' }, { values: { '1': undefined } })).toBe(true)
        })

        it('returns true when field is empty string', () => {
            expect(evaluator.evalCondition({ field: 1, op: 'notset' }, { values: { '1': '' } })).toBe(true)
        })

        it('returns true when field is missing', () => {
            expect(evaluator.evalCondition({ field: 1, op: 'notset' }, { values: {} })).toBe(true)
        })

        it('returns false when field has a value', () => {
            expect(evaluator.evalCondition({ field: 1, op: 'notset' }, { values: { '1': 'x' } })).toBe(false)
        })
    })

    describe('eq operator', () => {
        it('returns true for equal strings', () => {
            expect(evaluator.evalCondition({ field: 1, op: 'eq', value: 'hello' }, { values: { '1': 'hello' } })).toBe(
                true,
            )
        })

        it('returns false for different strings', () => {
            expect(evaluator.evalCondition({ field: 1, op: 'eq', value: 'hello' }, { values: { '1': 'world' } })).toBe(
                false,
            )
        })

        it('returns true for equal numbers', () => {
            expect(evaluator.evalCondition({ field: 1, op: 'eq', value: 42 }, { values: { '1': 42 } })).toBe(true)
        })

        it('returns true for equal booleans', () => {
            expect(evaluator.evalCondition({ field: 1, op: 'eq', value: true }, { values: { '1': true } })).toBe(true)
        })

        it('returns false for type mismatch (no coercion)', () => {
            expect(evaluator.evalCondition({ field: 1, op: 'eq', value: '42' }, { values: { '1': 42 } })).toBe(false)
        })
    })

    describe('ne operator', () => {
        it('returns true for different values', () => {
            expect(evaluator.evalCondition({ field: 1, op: 'ne', value: 'a' }, { values: { '1': 'b' } })).toBe(true)
        })

        it('returns false for equal values', () => {
            expect(evaluator.evalCondition({ field: 1, op: 'ne', value: 'a' }, { values: { '1': 'a' } })).toBe(false)
        })
    })

    describe('lt operator', () => {
        it('returns true when number is less than value', () => {
            expect(evaluator.evalCondition({ field: 1, op: 'lt', value: 10 }, { values: { '1': 5 } })).toBe(true)
        })

        it('returns false when number equals value', () => {
            expect(evaluator.evalCondition({ field: 1, op: 'lt', value: 10 }, { values: { '1': 10 } })).toBe(false)
        })

        it('returns false when number is greater than value', () => {
            expect(evaluator.evalCondition({ field: 1, op: 'lt', value: 10 }, { values: { '1': 15 } })).toBe(false)
        })

        it('compares date strings correctly', () => {
            expect(
                evaluator.evalCondition(
                    { field: 1, op: 'lt', value: '2025-06-15T00:00:00.000Z' },
                    { values: { '1': '2025-06-14T00:00:00.000Z' } },
                ),
            ).toBe(true)
        })

        it('compares strings lexicographically', () => {
            expect(evaluator.evalCondition({ field: 1, op: 'lt', value: 'b' }, { values: { '1': 'a' } })).toBe(true)
        })
    })

    describe('gt operator', () => {
        it('returns true when number is greater than value', () => {
            expect(evaluator.evalCondition({ field: 1, op: 'gt', value: 10 }, { values: { '1': 15 } })).toBe(true)
        })

        it('returns false when number is less than value', () => {
            expect(evaluator.evalCondition({ field: 1, op: 'gt', value: 10 }, { values: { '1': 5 } })).toBe(false)
        })
    })

    describe('lte operator', () => {
        it('returns true when number is equal', () => {
            expect(evaluator.evalCondition({ field: 1, op: 'lte', value: 10 }, { values: { '1': 10 } })).toBe(true)
        })

        it('returns true when number is less', () => {
            expect(evaluator.evalCondition({ field: 1, op: 'lte', value: 10 }, { values: { '1': 5 } })).toBe(true)
        })

        it('returns false when number is greater', () => {
            expect(evaluator.evalCondition({ field: 1, op: 'lte', value: 10 }, { values: { '1': 15 } })).toBe(false)
        })
    })

    describe('gte operator', () => {
        it('returns true when number is equal', () => {
            expect(evaluator.evalCondition({ field: 1, op: 'gte', value: 10 }, { values: { '1': 10 } })).toBe(true)
        })

        it('returns true when number is greater', () => {
            expect(evaluator.evalCondition({ field: 1, op: 'gte', value: 10 }, { values: { '1': 15 } })).toBe(true)
        })

        it('returns false when number is less', () => {
            expect(evaluator.evalCondition({ field: 1, op: 'gte', value: 10 }, { values: { '1': 5 } })).toBe(false)
        })
    })

    describe('in operator', () => {
        it('returns true when value is in the array', () => {
            expect(
                evaluator.evalCondition({ field: 1, op: 'in', value: ['a', 'b', 'c'] }, { values: { '1': 'b' } }),
            ).toBe(true)
        })

        it('returns false when value is not in the array', () => {
            expect(
                evaluator.evalCondition({ field: 1, op: 'in', value: ['a', 'b', 'c'] }, { values: { '1': 'd' } }),
            ).toBe(false)
        })

        it('returns false when condition value is not an array', () => {
            expect(evaluator.evalCondition({ field: 1, op: 'in', value: 'not-array' }, { values: { '1': 'a' } })).toBe(
                false,
            )
        })
    })

    describe('notin operator', () => {
        it('returns true when value is not in the array', () => {
            expect(
                evaluator.evalCondition({ field: 1, op: 'notin', value: ['a', 'b', 'c'] }, { values: { '1': 'd' } }),
            ).toBe(true)
        })

        it('returns false when value is in the array', () => {
            expect(
                evaluator.evalCondition({ field: 1, op: 'notin', value: ['a', 'b', 'c'] }, { values: { '1': 'b' } }),
            ).toBe(false)
        })

        it('returns false when condition value is not an array', () => {
            expect(
                evaluator.evalCondition({ field: 1, op: 'notin', value: 'not-array' }, { values: { '1': 'a' } }),
            ).toBe(false)
        })
    })

    describe('hidden-field rule (visibilityMap)', () => {
        it('treats hidden field as not set for set operator', () => {
            const vis = new Map<number, boolean>([[1, false]])
            expect(
                evaluator.evalCondition({ field: 1, op: 'set' }, { values: { '1': 'hello' }, visibilityMap: vis }),
            ).toBe(false)
        })

        it('treats hidden field as not set for notset operator', () => {
            const vis = new Map<number, boolean>([[1, false]])
            expect(
                evaluator.evalCondition({ field: 1, op: 'notset' }, { values: { '1': 'hello' }, visibilityMap: vis }),
            ).toBe(true)
        })

        it('treats hidden field as not matching for eq operator', () => {
            const vis = new Map<number, boolean>([[1, false]])
            expect(
                evaluator.evalCondition(
                    { field: 1, op: 'eq', value: 'hello' },
                    { values: { '1': 'hello' }, visibilityMap: vis },
                ),
            ).toBe(false)
        })

        it('does not affect visible fields', () => {
            const vis = new Map<number, boolean>([[1, true]])
            expect(
                evaluator.evalCondition(
                    { field: 1, op: 'eq', value: 'hello' },
                    { values: { '1': 'hello' }, visibilityMap: vis },
                ),
            ).toBe(true)
        })

        it('treats hidden field as not matching for ne operator', () => {
            const vis = new Map<number, boolean>([[1, false]])
            expect(
                evaluator.evalCondition(
                    { field: 1, op: 'ne', value: 'hello' },
                    { values: { '1': 'other' }, visibilityMap: vis },
                ),
            ).toBe(false)
        })
    })

    describe('compound conditions (and)', () => {
        it('returns true when all conditions are true', () => {
            const cond: Condition = {
                and: [
                    { field: 1, op: 'eq', value: 'a' },
                    { field: 2, op: 'eq', value: 'b' },
                ],
            }
            expect(evaluator.evalCondition(cond, { values: { '1': 'a', '2': 'b' } })).toBe(true)
        })

        it('returns false when any condition is false', () => {
            const cond: Condition = {
                and: [
                    { field: 1, op: 'eq', value: 'a' },
                    { field: 2, op: 'eq', value: 'b' },
                ],
            }
            expect(evaluator.evalCondition(cond, { values: { '1': 'a', '2': 'c' } })).toBe(false)
        })

        it('short-circuits on first false', () => {
            // The first condition is false, second references a non-existent field
            const cond: Condition = {
                and: [
                    { field: 1, op: 'eq', value: 'x' },
                    { field: 999, op: 'set' },
                ],
            }
            expect(evaluator.evalCondition(cond, { values: { '1': 'a' } })).toBe(false)
        })
    })

    describe('compound conditions (or)', () => {
        it('returns true when any condition is true', () => {
            const cond: Condition = {
                or: [
                    { field: 1, op: 'eq', value: 'a' },
                    { field: 1, op: 'eq', value: 'b' },
                ],
            }
            expect(evaluator.evalCondition(cond, { values: { '1': 'b' } })).toBe(true)
        })

        it('returns false when all conditions are false', () => {
            const cond: Condition = {
                or: [
                    { field: 1, op: 'eq', value: 'a' },
                    { field: 1, op: 'eq', value: 'b' },
                ],
            }
            expect(evaluator.evalCondition(cond, { values: { '1': 'c' } })).toBe(false)
        })

        it('short-circuits on first true', () => {
            const cond: Condition = {
                or: [
                    { field: 1, op: 'eq', value: 'a' },
                    { field: 999, op: 'set' },
                ],
            }
            expect(evaluator.evalCondition(cond, { values: { '1': 'a' } })).toBe(true)
        })
    })

    describe('nested compound conditions', () => {
        it('evaluates and inside or', () => {
            const cond: Condition = {
                or: [
                    {
                        and: [
                            { field: 1, op: 'eq', value: 'a' },
                            { field: 2, op: 'eq', value: 'b' },
                        ],
                    },
                    { field: 3, op: 'eq', value: 'c' },
                ],
            }
            // First and-branch is false (field 2 != 'b'), but field 3 == 'c'
            expect(evaluator.evalCondition(cond, { values: { '1': 'a', '2': 'x', '3': 'c' } })).toBe(true)
        })

        it('evaluates or inside and', () => {
            const cond: Condition = {
                and: [
                    { field: 1, op: 'set' },
                    {
                        or: [
                            { field: 2, op: 'gt', value: 10 },
                            { field: 2, op: 'lt', value: 0 },
                        ],
                    },
                ],
            }
            expect(evaluator.evalCondition(cond, { values: { '1': 'yes', '2': -5 } })).toBe(true)
            expect(evaluator.evalCondition(cond, { values: { '1': 'yes', '2': 5 } })).toBe(false)
        })
    })

    describe('relative date resolution in condition values', () => {
        const now = new Date('2025-06-15T00:00:00.000Z')

        it('resolves relative date in eq comparison', () => {
            const resolved = new Date('2025-06-15T00:00:00.000Z').toISOString()
            expect(
                evaluator.evalCondition({ field: 1, op: 'eq', value: '+0d' }, { values: { '1': resolved }, now }),
            ).toBe(true)
        })

        it('resolves relative date in gte comparison', () => {
            // +5d from 2025-06-15 = 2025-06-20
            expect(
                evaluator.evalCondition(
                    { field: 1, op: 'gte', value: '+5d' },
                    { values: { '1': '2025-06-20T00:00:00.000Z' }, now },
                ),
            ).toBe(true)
            expect(
                evaluator.evalCondition(
                    { field: 1, op: 'gte', value: '+5d' },
                    { values: { '1': '2025-06-19T00:00:00.000Z' }, now },
                ),
            ).toBe(false)
        })
    })

    describe('file field values', () => {
        const fileValue = {
            name: 'doc.pdf',
            mimeType: 'application/pdf',
            size: 1024,
            url: 'https://example.com/doc.pdf',
        }

        it('set returns true when field has a file object value', () => {
            expect(evaluator.evalCondition({ field: 1, op: 'set' }, { values: { '1': fileValue } })).toBe(true)
        })

        it('set returns false when file field is null', () => {
            expect(evaluator.evalCondition({ field: 1, op: 'set' }, { values: { '1': null } })).toBe(false)
        })

        it('notset returns true when file field is null', () => {
            expect(evaluator.evalCondition({ field: 1, op: 'notset' }, { values: { '1': null } })).toBe(true)
        })

        it('notset returns true when file field is undefined', () => {
            expect(evaluator.evalCondition({ field: 1, op: 'notset' }, { values: {} })).toBe(true)
        })

        it('notset returns false when file field has a file object', () => {
            expect(evaluator.evalCondition({ field: 1, op: 'notset' }, { values: { '1': fileValue } })).toBe(false)
        })
    })

    describe('type mismatch', () => {
        it('returns false for lt with mismatched types (number vs boolean)', () => {
            expect(evaluator.evalCondition({ field: 1, op: 'lt', value: 10 }, { values: { '1': true } })).toBe(false)
        })

        it('returns false for gt with mismatched types (string vs number)', () => {
            const result = evaluator.evalCondition({ field: 1, op: 'gt', value: 'abc' }, { values: { '1': 10 } })
            // Number vs string → NaN comparison
            expect(result).toBe(false)
        })
    })

    describe('missing values', () => {
        it('undefined field value with eq returns false', () => {
            expect(evaluator.evalCondition({ field: 1, op: 'eq', value: 'a' }, { values: {} })).toBe(false)
        })

        it('undefined field value with ne returns true', () => {
            expect(evaluator.evalCondition({ field: 1, op: 'ne', value: 'a' }, { values: {} })).toBe(true)
        })
    })
})
