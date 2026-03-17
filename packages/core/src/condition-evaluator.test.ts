import { ConditionEvaluator } from './condition-evaluator'
import type { Condition } from './types/conditions'

const evaluator = new ConditionEvaluator()
const now = new Date('2024-06-15T00:00:00Z')

describe('ConditionEvaluator', () => {
    describe('set operator', () => {
        it('returns true when field has a string value', () => {
            expect(evaluator.evalCondition({ field: 1, op: 'set' }, { now, values: { '1': 'hello' } })).toBe(true)
        })

        it('returns true when field has a number value', () => {
            expect(evaluator.evalCondition({ field: 1, op: 'set' }, { now, values: { '1': 42 } })).toBe(true)
        })

        it('returns true when field has a boolean true value', () => {
            expect(evaluator.evalCondition({ field: 1, op: 'set' }, { now, values: { '1': true } })).toBe(true)
        })

        it('returns true when field has a boolean false value', () => {
            expect(evaluator.evalCondition({ field: 1, op: 'set' }, { now, values: { '1': false } })).toBe(true)
        })

        it('returns false when field is null', () => {
            expect(evaluator.evalCondition({ field: 1, op: 'set' }, { now, values: { '1': null } })).toBe(false)
        })

        it('returns false when field is undefined', () => {
            expect(evaluator.evalCondition({ field: 1, op: 'set' }, { now, values: { '1': undefined } })).toBe(false)
        })

        it('returns false when field is empty string', () => {
            expect(evaluator.evalCondition({ field: 1, op: 'set' }, { now, values: { '1': '' } })).toBe(false)
        })

        it('returns false when field is missing from values', () => {
            expect(evaluator.evalCondition({ field: 1, op: 'set' }, { now, values: {} })).toBe(false)
        })

        it('returns true when field is zero', () => {
            expect(evaluator.evalCondition({ field: 1, op: 'set' }, { now, values: { '1': 0 } })).toBe(true)
        })
    })

    describe('notset operator', () => {
        it('returns true when field is null', () => {
            expect(evaluator.evalCondition({ field: 1, op: 'notset' }, { now, values: { '1': null } })).toBe(true)
        })

        it('returns true when field is undefined', () => {
            expect(evaluator.evalCondition({ field: 1, op: 'notset' }, { now, values: { '1': undefined } })).toBe(true)
        })

        it('returns true when field is empty string', () => {
            expect(evaluator.evalCondition({ field: 1, op: 'notset' }, { now, values: { '1': '' } })).toBe(true)
        })

        it('returns true when field is missing from values', () => {
            expect(evaluator.evalCondition({ field: 1, op: 'notset' }, { now, values: {} })).toBe(true)
        })

        it('returns false when field has a string value', () => {
            expect(evaluator.evalCondition({ field: 1, op: 'notset' }, { now, values: { '1': 'hello' } })).toBe(false)
        })

        it('returns false when field has a number value', () => {
            expect(evaluator.evalCondition({ field: 1, op: 'notset' }, { now, values: { '1': 42 } })).toBe(false)
        })

        it('returns false when field has a boolean true value', () => {
            expect(evaluator.evalCondition({ field: 1, op: 'notset' }, { now, values: { '1': true } })).toBe(false)
        })

        it('returns false when field has a boolean false value', () => {
            expect(evaluator.evalCondition({ field: 1, op: 'notset' }, { now, values: { '1': false } })).toBe(false)
        })

        it('returns false when field is zero', () => {
            expect(evaluator.evalCondition({ field: 1, op: 'notset' }, { now, values: { '1': 0 } })).toBe(false)
        })
    })

    describe('eq operator', () => {
        it('returns true for equal strings', () => {
            expect(
                evaluator.evalCondition({ field: 1, op: 'eq', value: 'hello' }, { now, values: { '1': 'hello' } }),
            ).toBe(true)
        })

        it('returns false for different strings', () => {
            expect(
                evaluator.evalCondition({ field: 1, op: 'eq', value: 'hello' }, { now, values: { '1': 'world' } }),
            ).toBe(false)
        })

        it('returns true for equal numbers', () => {
            expect(evaluator.evalCondition({ field: 1, op: 'eq', value: 42 }, { now, values: { '1': 42 } })).toBe(true)
        })

        it('returns false for different numbers', () => {
            expect(evaluator.evalCondition({ field: 1, op: 'eq', value: 42 }, { now, values: { '1': 99 } })).toBe(false)
        })

        it('returns true for equal booleans (true)', () => {
            expect(evaluator.evalCondition({ field: 1, op: 'eq', value: true }, { now, values: { '1': true } })).toBe(
                true,
            )
        })

        it('returns true for equal booleans (false)', () => {
            expect(evaluator.evalCondition({ field: 1, op: 'eq', value: false }, { now, values: { '1': false } })).toBe(
                true,
            )
        })

        it('returns false for different booleans', () => {
            expect(evaluator.evalCondition({ field: 1, op: 'eq', value: true }, { now, values: { '1': false } })).toBe(
                false,
            )
        })

        it('returns false for type mismatch string vs number (no coercion)', () => {
            expect(evaluator.evalCondition({ field: 1, op: 'eq', value: '42' }, { now, values: { '1': 42 } })).toBe(
                false,
            )
        })

        it('returns false for type mismatch number vs boolean (no coercion)', () => {
            expect(evaluator.evalCondition({ field: 1, op: 'eq', value: 1 }, { now, values: { '1': true } })).toBe(
                false,
            )
        })

        it('returns false when field is null', () => {
            expect(
                evaluator.evalCondition({ field: 1, op: 'eq', value: 'hello' }, { now, values: { '1': null } }),
            ).toBe(false)
        })

        it('returns false when field is undefined', () => {
            expect(
                evaluator.evalCondition({ field: 1, op: 'eq', value: 'hello' }, { now, values: { '1': undefined } }),
            ).toBe(false)
        })

        it('returns false when field is missing from values', () => {
            expect(evaluator.evalCondition({ field: 1, op: 'eq', value: 'hello' }, { now, values: {} })).toBe(false)
        })

        it('returns true for equal empty strings', () => {
            expect(evaluator.evalCondition({ field: 1, op: 'eq', value: '' }, { now, values: { '1': '' } })).toBe(true)
        })

        it('returns true for equal zero values', () => {
            expect(evaluator.evalCondition({ field: 1, op: 'eq', value: 0 }, { now, values: { '1': 0 } })).toBe(true)
        })

        it('returns false when comparing zero to false (no coercion)', () => {
            expect(evaluator.evalCondition({ field: 1, op: 'eq', value: 0 }, { now, values: { '1': false } })).toBe(
                false,
            )
        })

        it('returns false when comparing empty string to null', () => {
            expect(evaluator.evalCondition({ field: 1, op: 'eq', value: '' }, { now, values: { '1': null } })).toBe(
                false,
            )
        })
    })

    describe('ne operator', () => {
        it('returns true for different strings', () => {
            expect(evaluator.evalCondition({ field: 1, op: 'ne', value: 'a' }, { now, values: { '1': 'b' } })).toBe(
                true,
            )
        })

        it('returns false for equal strings', () => {
            expect(evaluator.evalCondition({ field: 1, op: 'ne', value: 'a' }, { now, values: { '1': 'a' } })).toBe(
                false,
            )
        })

        it('returns true for different numbers', () => {
            expect(evaluator.evalCondition({ field: 1, op: 'ne', value: 42 }, { now, values: { '1': 99 } })).toBe(true)
        })

        it('returns false for equal numbers', () => {
            expect(evaluator.evalCondition({ field: 1, op: 'ne', value: 42 }, { now, values: { '1': 42 } })).toBe(false)
        })

        it('returns true for different booleans', () => {
            expect(evaluator.evalCondition({ field: 1, op: 'ne', value: true }, { now, values: { '1': false } })).toBe(
                true,
            )
        })

        it('returns false for equal booleans', () => {
            expect(evaluator.evalCondition({ field: 1, op: 'ne', value: true }, { now, values: { '1': true } })).toBe(
                false,
            )
        })

        it('returns true for type mismatch string vs number (no coercion)', () => {
            expect(evaluator.evalCondition({ field: 1, op: 'ne', value: '42' }, { now, values: { '1': 42 } })).toBe(
                true,
            )
        })

        it('returns true when field is null', () => {
            expect(evaluator.evalCondition({ field: 1, op: 'ne', value: 'a' }, { now, values: { '1': null } })).toBe(
                true,
            )
        })

        it('returns true when field is undefined', () => {
            expect(
                evaluator.evalCondition({ field: 1, op: 'ne', value: 'a' }, { now, values: { '1': undefined } }),
            ).toBe(true)
        })

        it('returns true when field is missing from values', () => {
            expect(evaluator.evalCondition({ field: 1, op: 'ne', value: 'a' }, { now, values: {} })).toBe(true)
        })

        it('returns false for equal empty strings', () => {
            expect(evaluator.evalCondition({ field: 1, op: 'ne', value: '' }, { now, values: { '1': '' } })).toBe(false)
        })

        it('returns false for equal zero values', () => {
            expect(evaluator.evalCondition({ field: 1, op: 'ne', value: 0 }, { now, values: { '1': 0 } })).toBe(false)
        })

        it('returns true when comparing zero to false (no coercion)', () => {
            expect(evaluator.evalCondition({ field: 1, op: 'ne', value: 0 }, { now, values: { '1': false } })).toBe(
                true,
            )
        })
    })

    describe('lt operator', () => {
        it('returns true when number is less than value', () => {
            expect(evaluator.evalCondition({ field: 1, op: 'lt', value: 10 }, { now, values: { '1': 5 } })).toBe(true)
        })

        it('returns false when number equals value', () => {
            expect(evaluator.evalCondition({ field: 1, op: 'lt', value: 10 }, { now, values: { '1': 10 } })).toBe(false)
        })

        it('returns false when number is greater than value', () => {
            expect(evaluator.evalCondition({ field: 1, op: 'lt', value: 10 }, { now, values: { '1': 15 } })).toBe(false)
        })

        it('returns true for negative numbers less than value', () => {
            expect(evaluator.evalCondition({ field: 1, op: 'lt', value: 0 }, { now, values: { '1': -5 } })).toBe(true)
        })

        it('returns true for zero less than positive value', () => {
            expect(evaluator.evalCondition({ field: 1, op: 'lt', value: 10 }, { now, values: { '1': 0 } })).toBe(true)
        })

        it('returns false for zero compared to zero', () => {
            expect(evaluator.evalCondition({ field: 1, op: 'lt', value: 0 }, { now, values: { '1': 0 } })).toBe(false)
        })

        it('compares date strings correctly (earlier date)', () => {
            expect(
                evaluator.evalCondition(
                    { field: 1, op: 'lt', value: '2025-06-15T00:00:00.000Z' },
                    { now, values: { '1': '2025-06-14T00:00:00.000Z' } },
                ),
            ).toBe(true)
        })

        it('returns false for equal date strings', () => {
            expect(
                evaluator.evalCondition(
                    { field: 1, op: 'lt', value: '2025-06-15T00:00:00.000Z' },
                    { now, values: { '1': '2025-06-15T00:00:00.000Z' } },
                ),
            ).toBe(false)
        })

        it('returns false for later date string', () => {
            expect(
                evaluator.evalCondition(
                    { field: 1, op: 'lt', value: '2025-06-15T00:00:00.000Z' },
                    { now, values: { '1': '2025-06-16T00:00:00.000Z' } },
                ),
            ).toBe(false)
        })

        it('compares non-date strings lexicographically', () => {
            expect(evaluator.evalCondition({ field: 1, op: 'lt', value: 'b' }, { now, values: { '1': 'a' } })).toBe(
                true,
            )
        })

        it('returns false for equal non-date strings', () => {
            expect(evaluator.evalCondition({ field: 1, op: 'lt', value: 'a' }, { now, values: { '1': 'a' } })).toBe(
                false,
            )
        })

        it('returns false for lexicographically greater string', () => {
            expect(evaluator.evalCondition({ field: 1, op: 'lt', value: 'a' }, { now, values: { '1': 'b' } })).toBe(
                false,
            )
        })

        it('returns false for type mismatch number vs string', () => {
            expect(evaluator.evalCondition({ field: 1, op: 'lt', value: 10 }, { now, values: { '1': 'abc' } })).toBe(
                false,
            )
        })

        it('returns false for type mismatch number vs boolean', () => {
            expect(evaluator.evalCondition({ field: 1, op: 'lt', value: 10 }, { now, values: { '1': true } })).toBe(
                false,
            )
        })

        it('returns false when field is null', () => {
            expect(evaluator.evalCondition({ field: 1, op: 'lt', value: 10 }, { now, values: { '1': null } })).toBe(
                false,
            )
        })

        it('returns false when field is undefined', () => {
            expect(
                evaluator.evalCondition({ field: 1, op: 'lt', value: 10 }, { now, values: { '1': undefined } }),
            ).toBe(false)
        })

        it('returns false when field is missing from values', () => {
            expect(evaluator.evalCondition({ field: 1, op: 'lt', value: 10 }, { now, values: {} })).toBe(false)
        })
    })

    describe('gt operator', () => {
        it('returns true when number is greater than value', () => {
            expect(evaluator.evalCondition({ field: 1, op: 'gt', value: 10 }, { now, values: { '1': 15 } })).toBe(true)
        })

        it('returns false when number equals value', () => {
            expect(evaluator.evalCondition({ field: 1, op: 'gt', value: 10 }, { now, values: { '1': 10 } })).toBe(false)
        })

        it('returns false when number is less than value', () => {
            expect(evaluator.evalCondition({ field: 1, op: 'gt', value: 10 }, { now, values: { '1': 5 } })).toBe(false)
        })

        it('returns true for positive number greater than zero', () => {
            expect(evaluator.evalCondition({ field: 1, op: 'gt', value: 0 }, { now, values: { '1': 5 } })).toBe(true)
        })

        it('returns true for zero greater than negative', () => {
            expect(evaluator.evalCondition({ field: 1, op: 'gt', value: -5 }, { now, values: { '1': 0 } })).toBe(true)
        })

        it('returns false for zero compared to zero', () => {
            expect(evaluator.evalCondition({ field: 1, op: 'gt', value: 0 }, { now, values: { '1': 0 } })).toBe(false)
        })

        it('compares date strings correctly (later date)', () => {
            expect(
                evaluator.evalCondition(
                    { field: 1, op: 'gt', value: '2025-06-15T00:00:00.000Z' },
                    { now, values: { '1': '2025-06-16T00:00:00.000Z' } },
                ),
            ).toBe(true)
        })

        it('returns false for equal date strings', () => {
            expect(
                evaluator.evalCondition(
                    { field: 1, op: 'gt', value: '2025-06-15T00:00:00.000Z' },
                    { now, values: { '1': '2025-06-15T00:00:00.000Z' } },
                ),
            ).toBe(false)
        })

        it('returns false for earlier date string', () => {
            expect(
                evaluator.evalCondition(
                    { field: 1, op: 'gt', value: '2025-06-15T00:00:00.000Z' },
                    { now, values: { '1': '2025-06-14T00:00:00.000Z' } },
                ),
            ).toBe(false)
        })

        it('compares non-date strings lexicographically', () => {
            expect(evaluator.evalCondition({ field: 1, op: 'gt', value: 'a' }, { now, values: { '1': 'b' } })).toBe(
                true,
            )
        })

        it('returns false for equal non-date strings', () => {
            expect(evaluator.evalCondition({ field: 1, op: 'gt', value: 'a' }, { now, values: { '1': 'a' } })).toBe(
                false,
            )
        })

        it('returns false for lexicographically lesser string', () => {
            expect(evaluator.evalCondition({ field: 1, op: 'gt', value: 'b' }, { now, values: { '1': 'a' } })).toBe(
                false,
            )
        })

        it('returns false for type mismatch string vs number', () => {
            expect(evaluator.evalCondition({ field: 1, op: 'gt', value: 'abc' }, { now, values: { '1': 10 } })).toBe(
                false,
            )
        })

        it('returns false for type mismatch number vs boolean', () => {
            expect(evaluator.evalCondition({ field: 1, op: 'gt', value: 0 }, { now, values: { '1': true } })).toBe(
                false,
            )
        })

        it('returns false when field is null', () => {
            expect(evaluator.evalCondition({ field: 1, op: 'gt', value: 10 }, { now, values: { '1': null } })).toBe(
                false,
            )
        })

        it('returns false when field is undefined', () => {
            expect(
                evaluator.evalCondition({ field: 1, op: 'gt', value: 10 }, { now, values: { '1': undefined } }),
            ).toBe(false)
        })

        it('returns false when field is missing from values', () => {
            expect(evaluator.evalCondition({ field: 1, op: 'gt', value: 10 }, { now, values: {} })).toBe(false)
        })
    })

    describe('lte operator', () => {
        it('returns true when number is less than value', () => {
            expect(evaluator.evalCondition({ field: 1, op: 'lte', value: 10 }, { now, values: { '1': 5 } })).toBe(true)
        })

        it('returns true when number equals value', () => {
            expect(evaluator.evalCondition({ field: 1, op: 'lte', value: 10 }, { now, values: { '1': 10 } })).toBe(true)
        })

        it('returns false when number is greater than value', () => {
            expect(evaluator.evalCondition({ field: 1, op: 'lte', value: 10 }, { now, values: { '1': 15 } })).toBe(
                false,
            )
        })

        it('returns true for negative number less than zero', () => {
            expect(evaluator.evalCondition({ field: 1, op: 'lte', value: 0 }, { now, values: { '1': -5 } })).toBe(true)
        })

        it('returns true for zero equal to zero', () => {
            expect(evaluator.evalCondition({ field: 1, op: 'lte', value: 0 }, { now, values: { '1': 0 } })).toBe(true)
        })

        it('compares date strings correctly (earlier or equal)', () => {
            expect(
                evaluator.evalCondition(
                    { field: 1, op: 'lte', value: '2025-06-15T00:00:00.000Z' },
                    { now, values: { '1': '2025-06-14T00:00:00.000Z' } },
                ),
            ).toBe(true)
        })

        it('returns true for equal date strings', () => {
            expect(
                evaluator.evalCondition(
                    { field: 1, op: 'lte', value: '2025-06-15T00:00:00.000Z' },
                    { now, values: { '1': '2025-06-15T00:00:00.000Z' } },
                ),
            ).toBe(true)
        })

        it('returns false for later date string', () => {
            expect(
                evaluator.evalCondition(
                    { field: 1, op: 'lte', value: '2025-06-15T00:00:00.000Z' },
                    { now, values: { '1': '2025-06-16T00:00:00.000Z' } },
                ),
            ).toBe(false)
        })

        it('compares non-date strings lexicographically', () => {
            expect(evaluator.evalCondition({ field: 1, op: 'lte', value: 'b' }, { now, values: { '1': 'a' } })).toBe(
                true,
            )
        })

        it('returns true for equal non-date strings', () => {
            expect(evaluator.evalCondition({ field: 1, op: 'lte', value: 'a' }, { now, values: { '1': 'a' } })).toBe(
                true,
            )
        })

        it('returns false for lexicographically greater string', () => {
            expect(evaluator.evalCondition({ field: 1, op: 'lte', value: 'a' }, { now, values: { '1': 'b' } })).toBe(
                false,
            )
        })

        it('returns false for type mismatch number vs string', () => {
            expect(evaluator.evalCondition({ field: 1, op: 'lte', value: 10 }, { now, values: { '1': 'abc' } })).toBe(
                false,
            )
        })

        it('returns false when field is null', () => {
            expect(evaluator.evalCondition({ field: 1, op: 'lte', value: 10 }, { now, values: { '1': null } })).toBe(
                false,
            )
        })

        it('returns false when field is undefined', () => {
            expect(
                evaluator.evalCondition({ field: 1, op: 'lte', value: 10 }, { now, values: { '1': undefined } }),
            ).toBe(false)
        })

        it('returns false when field is missing from values', () => {
            expect(evaluator.evalCondition({ field: 1, op: 'lte', value: 10 }, { now, values: {} })).toBe(false)
        })
    })

    describe('gte operator', () => {
        it('returns true when number is greater than value', () => {
            expect(evaluator.evalCondition({ field: 1, op: 'gte', value: 10 }, { now, values: { '1': 15 } })).toBe(true)
        })

        it('returns true when number equals value', () => {
            expect(evaluator.evalCondition({ field: 1, op: 'gte', value: 10 }, { now, values: { '1': 10 } })).toBe(true)
        })

        it('returns false when number is less than value', () => {
            expect(evaluator.evalCondition({ field: 1, op: 'gte', value: 10 }, { now, values: { '1': 5 } })).toBe(false)
        })

        it('returns true for positive number greater than zero', () => {
            expect(evaluator.evalCondition({ field: 1, op: 'gte', value: 0 }, { now, values: { '1': 5 } })).toBe(true)
        })

        it('returns true for zero equal to zero', () => {
            expect(evaluator.evalCondition({ field: 1, op: 'gte', value: 0 }, { now, values: { '1': 0 } })).toBe(true)
        })

        it('returns false for negative number less than zero', () => {
            expect(evaluator.evalCondition({ field: 1, op: 'gte', value: 0 }, { now, values: { '1': -5 } })).toBe(false)
        })

        it('compares date strings correctly (later date)', () => {
            expect(
                evaluator.evalCondition(
                    { field: 1, op: 'gte', value: '2025-06-15T00:00:00.000Z' },
                    { now, values: { '1': '2025-06-16T00:00:00.000Z' } },
                ),
            ).toBe(true)
        })

        it('returns true for equal date strings', () => {
            expect(
                evaluator.evalCondition(
                    { field: 1, op: 'gte', value: '2025-06-15T00:00:00.000Z' },
                    { now, values: { '1': '2025-06-15T00:00:00.000Z' } },
                ),
            ).toBe(true)
        })

        it('returns false for earlier date string', () => {
            expect(
                evaluator.evalCondition(
                    { field: 1, op: 'gte', value: '2025-06-15T00:00:00.000Z' },
                    { now, values: { '1': '2025-06-14T00:00:00.000Z' } },
                ),
            ).toBe(false)
        })

        it('compares non-date strings lexicographically', () => {
            expect(evaluator.evalCondition({ field: 1, op: 'gte', value: 'a' }, { now, values: { '1': 'b' } })).toBe(
                true,
            )
        })

        it('returns true for equal non-date strings', () => {
            expect(evaluator.evalCondition({ field: 1, op: 'gte', value: 'a' }, { now, values: { '1': 'a' } })).toBe(
                true,
            )
        })

        it('returns false for lexicographically lesser string', () => {
            expect(evaluator.evalCondition({ field: 1, op: 'gte', value: 'b' }, { now, values: { '1': 'a' } })).toBe(
                false,
            )
        })

        it('returns false for type mismatch number vs string', () => {
            expect(evaluator.evalCondition({ field: 1, op: 'gte', value: 10 }, { now, values: { '1': 'abc' } })).toBe(
                false,
            )
        })

        it('returns false when field is null', () => {
            expect(evaluator.evalCondition({ field: 1, op: 'gte', value: 10 }, { now, values: { '1': null } })).toBe(
                false,
            )
        })

        it('returns false when field is undefined', () => {
            expect(
                evaluator.evalCondition({ field: 1, op: 'gte', value: 10 }, { now, values: { '1': undefined } }),
            ).toBe(false)
        })

        it('returns false when field is missing from values', () => {
            expect(evaluator.evalCondition({ field: 1, op: 'gte', value: 10 }, { now, values: {} })).toBe(false)
        })
    })

    describe('in operator', () => {
        it('returns true when string value is in the array', () => {
            expect(
                evaluator.evalCondition({ field: 1, op: 'in', value: ['a', 'b', 'c'] }, { now, values: { '1': 'b' } }),
            ).toBe(true)
        })

        it('returns true when number value is in the array', () => {
            expect(evaluator.evalCondition({ field: 1, op: 'in', value: [1, 2, 3] }, { now, values: { '1': 2 } })).toBe(
                true,
            )
        })

        it('returns true when boolean value is in the array', () => {
            expect(evaluator.evalCondition({ field: 1, op: 'in', value: [true] }, { now, values: { '1': true } })).toBe(
                true,
            )
        })

        it('returns false when string value is not in the array', () => {
            expect(
                evaluator.evalCondition({ field: 1, op: 'in', value: ['a', 'b', 'c'] }, { now, values: { '1': 'd' } }),
            ).toBe(false)
        })

        it('returns false when number value is not in the array', () => {
            expect(evaluator.evalCondition({ field: 1, op: 'in', value: [1, 2, 3] }, { now, values: { '1': 4 } })).toBe(
                false,
            )
        })

        it('returns false for type mismatch (string "1" not in number array)', () => {
            expect(
                evaluator.evalCondition({ field: 1, op: 'in', value: [1, 2, 3] }, { now, values: { '1': '1' } }),
            ).toBe(false)
        })

        it('returns false when condition value is not an array', () => {
            expect(
                evaluator.evalCondition({ field: 1, op: 'in', value: 'not-array' }, { now, values: { '1': 'a' } }),
            ).toBe(false)
        })

        it('returns false when condition value is null', () => {
            expect(evaluator.evalCondition({ field: 1, op: 'in', value: null }, { now, values: { '1': 'a' } })).toBe(
                false,
            )
        })

        it('returns false when condition value is undefined', () => {
            expect(evaluator.evalCondition({ field: 1, op: 'in' }, { now, values: { '1': 'a' } })).toBe(false)
        })

        it('returns false when field is null', () => {
            expect(
                evaluator.evalCondition({ field: 1, op: 'in', value: ['a', 'b'] }, { now, values: { '1': null } }),
            ).toBe(false)
        })

        it('returns false when field is undefined', () => {
            expect(
                evaluator.evalCondition({ field: 1, op: 'in', value: ['a', 'b'] }, { now, values: { '1': undefined } }),
            ).toBe(false)
        })

        it('returns false when field is missing from values', () => {
            expect(evaluator.evalCondition({ field: 1, op: 'in', value: ['a', 'b'] }, { now, values: {} })).toBe(false)
        })

        it('returns true when zero is in the array', () => {
            expect(evaluator.evalCondition({ field: 1, op: 'in', value: [0, 1, 2] }, { now, values: { '1': 0 } })).toBe(
                true,
            )
        })

        it('returns true when empty string is in the array', () => {
            expect(
                evaluator.evalCondition({ field: 1, op: 'in', value: ['', 'a'] }, { now, values: { '1': '' } }),
            ).toBe(true)
        })

        it('returns false with empty array', () => {
            expect(evaluator.evalCondition({ field: 1, op: 'in', value: [] }, { now, values: { '1': 'a' } })).toBe(
                false,
            )
        })
    })

    describe('notin operator', () => {
        it('returns true when string value is not in the array', () => {
            expect(
                evaluator.evalCondition(
                    { field: 1, op: 'notin', value: ['a', 'b', 'c'] },
                    { now, values: { '1': 'd' } },
                ),
            ).toBe(true)
        })

        it('returns true when number value is not in the array', () => {
            expect(
                evaluator.evalCondition({ field: 1, op: 'notin', value: [1, 2, 3] }, { now, values: { '1': 4 } }),
            ).toBe(true)
        })

        it('returns false when string value is in the array', () => {
            expect(
                evaluator.evalCondition(
                    { field: 1, op: 'notin', value: ['a', 'b', 'c'] },
                    { now, values: { '1': 'b' } },
                ),
            ).toBe(false)
        })

        it('returns false when number value is in the array', () => {
            expect(
                evaluator.evalCondition({ field: 1, op: 'notin', value: [1, 2, 3] }, { now, values: { '1': 2 } }),
            ).toBe(false)
        })

        it('returns false when boolean value is in the array', () => {
            expect(
                evaluator.evalCondition({ field: 1, op: 'notin', value: [true] }, { now, values: { '1': true } }),
            ).toBe(false)
        })

        it('returns true for type mismatch (string "1" not in number array)', () => {
            expect(
                evaluator.evalCondition({ field: 1, op: 'notin', value: [1, 2, 3] }, { now, values: { '1': '1' } }),
            ).toBe(true)
        })

        it('returns false when condition value is not an array', () => {
            expect(
                evaluator.evalCondition({ field: 1, op: 'notin', value: 'not-array' }, { now, values: { '1': 'a' } }),
            ).toBe(false)
        })

        it('returns false when condition value is null', () => {
            expect(evaluator.evalCondition({ field: 1, op: 'notin', value: null }, { now, values: { '1': 'a' } })).toBe(
                false,
            )
        })

        it('returns false when condition value is undefined', () => {
            expect(evaluator.evalCondition({ field: 1, op: 'notin' }, { now, values: { '1': 'a' } })).toBe(false)
        })

        it('returns true when field is null (null not in array)', () => {
            expect(
                evaluator.evalCondition({ field: 1, op: 'notin', value: ['a', 'b'] }, { now, values: { '1': null } }),
            ).toBe(true)
        })

        it('returns true when field is undefined (undefined not in array)', () => {
            expect(
                evaluator.evalCondition(
                    { field: 1, op: 'notin', value: ['a', 'b'] },
                    { now, values: { '1': undefined } },
                ),
            ).toBe(true)
        })

        it('returns true when field is missing from values', () => {
            expect(evaluator.evalCondition({ field: 1, op: 'notin', value: ['a', 'b'] }, { now, values: {} })).toBe(
                true,
            )
        })

        it('returns false when zero is in the array', () => {
            expect(
                evaluator.evalCondition({ field: 1, op: 'notin', value: [0, 1, 2] }, { now, values: { '1': 0 } }),
            ).toBe(false)
        })

        it('returns false when empty string is in the array', () => {
            expect(
                evaluator.evalCondition({ field: 1, op: 'notin', value: ['', 'a'] }, { now, values: { '1': '' } }),
            ).toBe(false)
        })

        it('returns true with empty array', () => {
            expect(evaluator.evalCondition({ field: 1, op: 'notin', value: [] }, { now, values: { '1': 'a' } })).toBe(
                true,
            )
        })
    })

    describe('hidden-field rule (visibilityMap)', () => {
        const hidden = new Map<number, boolean>([[1, false]])
        const visible = new Map<number, boolean>([[1, true]])

        describe('set operator', () => {
            it('returns false for hidden field even when field has a value', () => {
                expect(
                    evaluator.evalCondition(
                        { field: 1, op: 'set' },
                        { now, values: { '1': 'hello' }, visibilityMap: hidden },
                    ),
                ).toBe(false)
            })

            it('returns false for hidden field when field is null', () => {
                expect(
                    evaluator.evalCondition(
                        { field: 1, op: 'set' },
                        { now, values: { '1': null }, visibilityMap: hidden },
                    ),
                ).toBe(false)
            })

            it('does not affect visible field with value', () => {
                expect(
                    evaluator.evalCondition(
                        { field: 1, op: 'set' },
                        { now, values: { '1': 'hello' }, visibilityMap: visible },
                    ),
                ).toBe(true)
            })

            it('does not affect visible field without value', () => {
                expect(
                    evaluator.evalCondition(
                        { field: 1, op: 'set' },
                        { now, values: { '1': null }, visibilityMap: visible },
                    ),
                ).toBe(false)
            })

            it('evaluates normally when field is not in visibilityMap', () => {
                const visibilityMap = new Map<number, boolean>([[2, false]])
                expect(
                    evaluator.evalCondition({ field: 1, op: 'set' }, { now, values: { '1': 'hello' }, visibilityMap }),
                ).toBe(true)
            })
        })

        describe('notset operator', () => {
            it('returns true for hidden field even when field has a value', () => {
                expect(
                    evaluator.evalCondition(
                        { field: 1, op: 'notset' },
                        { now, values: { '1': 'hello' }, visibilityMap: hidden },
                    ),
                ).toBe(true)
            })

            it('returns true for hidden field when field is null', () => {
                expect(
                    evaluator.evalCondition(
                        { field: 1, op: 'notset' },
                        { now, values: { '1': null }, visibilityMap: hidden },
                    ),
                ).toBe(true)
            })

            it('does not affect visible field with value', () => {
                expect(
                    evaluator.evalCondition(
                        { field: 1, op: 'notset' },
                        { now, values: { '1': 'hello' }, visibilityMap: visible },
                    ),
                ).toBe(false)
            })

            it('does not affect visible field without value', () => {
                expect(
                    evaluator.evalCondition(
                        { field: 1, op: 'notset' },
                        { now, values: { '1': null }, visibilityMap: visible },
                    ),
                ).toBe(true)
            })
        })

        describe('eq operator', () => {
            it('returns false for hidden field even when values match', () => {
                expect(
                    evaluator.evalCondition(
                        { field: 1, op: 'eq', value: 'hello' },
                        { now, values: { '1': 'hello' }, visibilityMap: hidden },
                    ),
                ).toBe(false)
            })

            it('returns false for hidden field when values do not match', () => {
                expect(
                    evaluator.evalCondition(
                        { field: 1, op: 'eq', value: 'hello' },
                        { now, values: { '1': 'other' }, visibilityMap: hidden },
                    ),
                ).toBe(false)
            })

            it('does not affect visible field with matching value', () => {
                expect(
                    evaluator.evalCondition(
                        { field: 1, op: 'eq', value: 'hello' },
                        { now, values: { '1': 'hello' }, visibilityMap: visible },
                    ),
                ).toBe(true)
            })

            it('does not affect visible field with non-matching value', () => {
                expect(
                    evaluator.evalCondition(
                        { field: 1, op: 'eq', value: 'hello' },
                        { now, values: { '1': 'other' }, visibilityMap: visible },
                    ),
                ).toBe(false)
            })
        })

        describe('ne operator', () => {
            it('returns false for hidden field even when values differ', () => {
                expect(
                    evaluator.evalCondition(
                        { field: 1, op: 'ne', value: 'hello' },
                        { now, values: { '1': 'other' }, visibilityMap: hidden },
                    ),
                ).toBe(false)
            })

            it('returns false for hidden field when values match', () => {
                expect(
                    evaluator.evalCondition(
                        { field: 1, op: 'ne', value: 'hello' },
                        { now, values: { '1': 'hello' }, visibilityMap: hidden },
                    ),
                ).toBe(false)
            })

            it('does not affect visible field with different value', () => {
                expect(
                    evaluator.evalCondition(
                        { field: 1, op: 'ne', value: 'hello' },
                        { now, values: { '1': 'other' }, visibilityMap: visible },
                    ),
                ).toBe(true)
            })

            it('does not affect visible field with matching value', () => {
                expect(
                    evaluator.evalCondition(
                        { field: 1, op: 'ne', value: 'hello' },
                        { now, values: { '1': 'hello' }, visibilityMap: visible },
                    ),
                ).toBe(false)
            })
        })

        describe('lt operator', () => {
            it('returns false for hidden field even when field value is less', () => {
                expect(
                    evaluator.evalCondition(
                        { field: 1, op: 'lt', value: 10 },
                        { now, values: { '1': 5 }, visibilityMap: hidden },
                    ),
                ).toBe(false)
            })

            it('returns false for hidden field when field value is greater', () => {
                expect(
                    evaluator.evalCondition(
                        { field: 1, op: 'lt', value: 10 },
                        { now, values: { '1': 15 }, visibilityMap: hidden },
                    ),
                ).toBe(false)
            })

            it('does not affect visible field with lesser value', () => {
                expect(
                    evaluator.evalCondition(
                        { field: 1, op: 'lt', value: 10 },
                        { now, values: { '1': 5 }, visibilityMap: visible },
                    ),
                ).toBe(true)
            })

            it('does not affect visible field with greater value', () => {
                expect(
                    evaluator.evalCondition(
                        { field: 1, op: 'lt', value: 10 },
                        { now, values: { '1': 15 }, visibilityMap: visible },
                    ),
                ).toBe(false)
            })
        })

        describe('gt operator', () => {
            it('returns false for hidden field even when field value is greater', () => {
                expect(
                    evaluator.evalCondition(
                        { field: 1, op: 'gt', value: 10 },
                        { now, values: { '1': 15 }, visibilityMap: hidden },
                    ),
                ).toBe(false)
            })

            it('returns false for hidden field when field value is less', () => {
                expect(
                    evaluator.evalCondition(
                        { field: 1, op: 'gt', value: 10 },
                        { now, values: { '1': 5 }, visibilityMap: hidden },
                    ),
                ).toBe(false)
            })

            it('does not affect visible field with greater value', () => {
                expect(
                    evaluator.evalCondition(
                        { field: 1, op: 'gt', value: 10 },
                        { now, values: { '1': 15 }, visibilityMap: visible },
                    ),
                ).toBe(true)
            })

            it('does not affect visible field with lesser value', () => {
                expect(
                    evaluator.evalCondition(
                        { field: 1, op: 'gt', value: 10 },
                        { now, values: { '1': 5 }, visibilityMap: visible },
                    ),
                ).toBe(false)
            })
        })

        describe('lte operator', () => {
            it('returns false for hidden field even when field value is less or equal', () => {
                expect(
                    evaluator.evalCondition(
                        { field: 1, op: 'lte', value: 10 },
                        { now, values: { '1': 10 }, visibilityMap: hidden },
                    ),
                ).toBe(false)
            })

            it('returns false for hidden field when field value is greater', () => {
                expect(
                    evaluator.evalCondition(
                        { field: 1, op: 'lte', value: 10 },
                        { now, values: { '1': 15 }, visibilityMap: hidden },
                    ),
                ).toBe(false)
            })

            it('does not affect visible field with equal value', () => {
                expect(
                    evaluator.evalCondition(
                        { field: 1, op: 'lte', value: 10 },
                        { now, values: { '1': 10 }, visibilityMap: visible },
                    ),
                ).toBe(true)
            })

            it('does not affect visible field with greater value', () => {
                expect(
                    evaluator.evalCondition(
                        { field: 1, op: 'lte', value: 10 },
                        { now, values: { '1': 15 }, visibilityMap: visible },
                    ),
                ).toBe(false)
            })
        })

        describe('gte operator', () => {
            it('returns false for hidden field even when field value is greater or equal', () => {
                expect(
                    evaluator.evalCondition(
                        { field: 1, op: 'gte', value: 10 },
                        { now, values: { '1': 10 }, visibilityMap: hidden },
                    ),
                ).toBe(false)
            })

            it('returns false for hidden field when field value is less', () => {
                expect(
                    evaluator.evalCondition(
                        { field: 1, op: 'gte', value: 10 },
                        { now, values: { '1': 5 }, visibilityMap: hidden },
                    ),
                ).toBe(false)
            })

            it('does not affect visible field with equal value', () => {
                expect(
                    evaluator.evalCondition(
                        { field: 1, op: 'gte', value: 10 },
                        { now, values: { '1': 10 }, visibilityMap: visible },
                    ),
                ).toBe(true)
            })

            it('does not affect visible field with lesser value', () => {
                expect(
                    evaluator.evalCondition(
                        { field: 1, op: 'gte', value: 10 },
                        { now, values: { '1': 5 }, visibilityMap: visible },
                    ),
                ).toBe(false)
            })
        })

        describe('in operator', () => {
            it('returns false for hidden field even when value is in array', () => {
                expect(
                    evaluator.evalCondition(
                        { field: 1, op: 'in', value: ['a', 'b', 'c'] },
                        { now, values: { '1': 'b' }, visibilityMap: hidden },
                    ),
                ).toBe(false)
            })

            it('returns false for hidden field when value is not in array', () => {
                expect(
                    evaluator.evalCondition(
                        { field: 1, op: 'in', value: ['a', 'b', 'c'] },
                        { now, values: { '1': 'd' }, visibilityMap: hidden },
                    ),
                ).toBe(false)
            })

            it('does not affect visible field with matching value', () => {
                expect(
                    evaluator.evalCondition(
                        { field: 1, op: 'in', value: ['a', 'b', 'c'] },
                        { now, values: { '1': 'b' }, visibilityMap: visible },
                    ),
                ).toBe(true)
            })

            it('does not affect visible field with non-matching value', () => {
                expect(
                    evaluator.evalCondition(
                        { field: 1, op: 'in', value: ['a', 'b', 'c'] },
                        { now, values: { '1': 'd' }, visibilityMap: visible },
                    ),
                ).toBe(false)
            })
        })

        describe('notin operator', () => {
            it('returns false for hidden field even when value is not in array', () => {
                expect(
                    evaluator.evalCondition(
                        { field: 1, op: 'notin', value: ['a', 'b', 'c'] },
                        { now, values: { '1': 'd' }, visibilityMap: hidden },
                    ),
                ).toBe(false)
            })

            it('returns false for hidden field when value is in array', () => {
                expect(
                    evaluator.evalCondition(
                        { field: 1, op: 'notin', value: ['a', 'b', 'c'] },
                        { now, values: { '1': 'b' }, visibilityMap: hidden },
                    ),
                ).toBe(false)
            })

            it('does not affect visible field with non-matching value', () => {
                expect(
                    evaluator.evalCondition(
                        { field: 1, op: 'notin', value: ['a', 'b', 'c'] },
                        { now, values: { '1': 'd' }, visibilityMap: visible },
                    ),
                ).toBe(true)
            })

            it('does not affect visible field with matching value', () => {
                expect(
                    evaluator.evalCondition(
                        { field: 1, op: 'notin', value: ['a', 'b', 'c'] },
                        { now, values: { '1': 'b' }, visibilityMap: visible },
                    ),
                ).toBe(false)
            })
        })

        describe('general behavior', () => {
            it('evaluates normally when field is not in visibilityMap', () => {
                const otherField = new Map<number, boolean>([[2, false]])
                expect(
                    evaluator.evalCondition(
                        { field: 1, op: 'eq', value: 'hello' },
                        { now, values: { '1': 'hello' }, visibilityMap: otherField },
                    ),
                ).toBe(true)
            })

            it('evaluates normally when visibilityMap is not provided', () => {
                expect(
                    evaluator.evalCondition({ field: 1, op: 'eq', value: 'hello' }, { now, values: { '1': 'hello' } }),
                ).toBe(true)
            })
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
            expect(evaluator.evalCondition(cond, { now, values: { '1': 'a', '2': 'b' } })).toBe(true)
        })

        it('returns false when any condition is false', () => {
            const cond: Condition = {
                and: [
                    { field: 1, op: 'eq', value: 'a' },
                    { field: 2, op: 'eq', value: 'b' },
                ],
            }
            expect(evaluator.evalCondition(cond, { now, values: { '1': 'a', '2': 'c' } })).toBe(false)
        })

        it('short-circuits on first false', () => {
            // The first condition is false, second references a non-existent field
            const cond: Condition = {
                and: [
                    { field: 1, op: 'eq', value: 'x' },
                    { field: 999, op: 'set' },
                ],
            }
            expect(evaluator.evalCondition(cond, { now, values: { '1': 'a' } })).toBe(false)
        })

        it('returns false when one field is hidden (hidden field breaks and-chain)', () => {
            const cond: Condition = {
                and: [
                    { field: 1, op: 'eq', value: 'a' },
                    { field: 2, op: 'eq', value: 'b' },
                ],
            }
            const visibilityMap = new Map<number, boolean>([
                [1, true],
                [2, false],
            ])
            expect(evaluator.evalCondition(cond, { now, values: { '1': 'a', '2': 'b' }, visibilityMap })).toBe(false)
        })

        it('returns false when all fields are hidden', () => {
            const cond: Condition = {
                and: [
                    { field: 1, op: 'eq', value: 'a' },
                    { field: 2, op: 'eq', value: 'b' },
                ],
            }
            const visibilityMap = new Map<number, boolean>([
                [1, false],
                [2, false],
            ])
            expect(evaluator.evalCondition(cond, { now, values: { '1': 'a', '2': 'b' }, visibilityMap })).toBe(false)
        })

        it('returns true when all fields are visible and conditions match', () => {
            const cond: Condition = {
                and: [
                    { field: 1, op: 'eq', value: 'a' },
                    { field: 2, op: 'eq', value: 'b' },
                ],
            }
            const visibilityMap = new Map<number, boolean>([
                [1, true],
                [2, true],
            ])
            expect(evaluator.evalCondition(cond, { now, values: { '1': 'a', '2': 'b' }, visibilityMap })).toBe(true)
        })

        it('returns true when and-chain uses notset on hidden field', () => {
            const cond: Condition = {
                and: [
                    { field: 1, op: 'eq', value: 'a' },
                    { field: 2, op: 'notset' },
                ],
            }
            const visibilityMap = new Map<number, boolean>([
                [1, true],
                [2, false],
            ])
            expect(evaluator.evalCondition(cond, { now, values: { '1': 'a', '2': 'something' }, visibilityMap })).toBe(
                true,
            )
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
            expect(evaluator.evalCondition(cond, { now, values: { '1': 'b' } })).toBe(true)
        })

        it('returns false when all conditions are false', () => {
            const cond: Condition = {
                or: [
                    { field: 1, op: 'eq', value: 'a' },
                    { field: 1, op: 'eq', value: 'b' },
                ],
            }
            expect(evaluator.evalCondition(cond, { now, values: { '1': 'c' } })).toBe(false)
        })

        it('short-circuits on first true', () => {
            const cond: Condition = {
                or: [
                    { field: 1, op: 'eq', value: 'a' },
                    { field: 999, op: 'set' },
                ],
            }
            expect(evaluator.evalCondition(cond, { now, values: { '1': 'a' } })).toBe(true)
        })

        it('returns false when all referenced fields are hidden', () => {
            const cond: Condition = {
                or: [
                    { field: 1, op: 'eq', value: 'a' },
                    { field: 2, op: 'eq', value: 'b' },
                ],
            }
            const visibilityMap = new Map<number, boolean>([
                [1, false],
                [2, false],
            ])
            expect(evaluator.evalCondition(cond, { now, values: { '1': 'a', '2': 'b' }, visibilityMap })).toBe(false)
        })

        it('returns true when at least one field is visible and matches', () => {
            const cond: Condition = {
                or: [
                    { field: 1, op: 'eq', value: 'a' },
                    { field: 2, op: 'eq', value: 'b' },
                ],
            }
            const visibilityMap = new Map<number, boolean>([
                [1, false],
                [2, true],
            ])
            expect(evaluator.evalCondition(cond, { now, values: { '1': 'a', '2': 'b' }, visibilityMap })).toBe(true)
        })

        it('returns false when visible field does not match and other is hidden', () => {
            const cond: Condition = {
                or: [
                    { field: 1, op: 'eq', value: 'a' },
                    { field: 2, op: 'eq', value: 'b' },
                ],
            }
            const visibilityMap = new Map<number, boolean>([
                [1, false],
                [2, true],
            ])
            expect(evaluator.evalCondition(cond, { now, values: { '1': 'a', '2': 'x' }, visibilityMap })).toBe(false)
        })

        it('returns true when all fields are visible and any matches', () => {
            const cond: Condition = {
                or: [
                    { field: 1, op: 'eq', value: 'a' },
                    { field: 2, op: 'eq', value: 'b' },
                ],
            }
            const visibilityMap = new Map<number, boolean>([
                [1, true],
                [2, true],
            ])
            expect(evaluator.evalCondition(cond, { now, values: { '1': 'x', '2': 'b' }, visibilityMap })).toBe(true)
        })

        it('returns true when or-branch uses notset on hidden field', () => {
            const cond: Condition = {
                or: [
                    { field: 1, op: 'eq', value: 'x' },
                    { field: 2, op: 'notset' },
                ],
            }
            const visibilityMap = new Map<number, boolean>([
                [1, true],
                [2, false],
            ])
            // field 1 doesn't match 'x', but field 2 is hidden so notset returns true
            expect(evaluator.evalCondition(cond, { now, values: { '1': 'a', '2': 'something' }, visibilityMap })).toBe(
                true,
            )
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
            expect(evaluator.evalCondition(cond, { now, values: { '1': 'a', '2': 'x', '3': 'c' } })).toBe(true)
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
            expect(evaluator.evalCondition(cond, { now, values: { '1': 'yes', '2': -5 } })).toBe(true)
            expect(evaluator.evalCondition(cond, { now, values: { '1': 'yes', '2': 5 } })).toBe(false)
        })

        it('hidden field in nested and-branch causes that branch to fail in or', () => {
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
            // field 2 is hidden → and-branch fails; field 3 matches → or succeeds
            const visibilityMap = new Map<number, boolean>([
                [1, true],
                [2, false],
                [3, true],
            ])
            expect(
                evaluator.evalCondition(cond, { now, values: { '1': 'a', '2': 'b', '3': 'c' }, visibilityMap }),
            ).toBe(true)
        })

        it('hidden field in nested and-branch causes overall false when no or-branch matches', () => {
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
            // field 2 hidden → and-branch fails; field 3 doesn't match → or fails
            const visibilityMap = new Map<number, boolean>([
                [1, true],
                [2, false],
                [3, true],
            ])
            expect(
                evaluator.evalCondition(cond, { now, values: { '1': 'a', '2': 'b', '3': 'x' }, visibilityMap }),
            ).toBe(false)
        })

        it('hidden field in nested or-branch causes that branch to fail in and', () => {
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
            // field 2 hidden → both or-branches fail → and fails
            const visibilityMap = new Map<number, boolean>([
                [1, true],
                [2, false],
            ])
            expect(evaluator.evalCondition(cond, { now, values: { '1': 'yes', '2': -5 }, visibilityMap })).toBe(false)
        })

        it('hidden field in outer and does not affect nested or evaluation', () => {
            const cond: Condition = {
                and: [
                    { field: 1, op: 'set' },
                    {
                        or: [
                            { field: 2, op: 'gt', value: 10 },
                            { field: 3, op: 'eq', value: 'yes' },
                        ],
                    },
                ],
            }
            // field 1 hidden → set returns false → and short-circuits to false
            const visibilityMap = new Map<number, boolean>([
                [1, false],
                [2, true],
                [3, true],
            ])
            expect(
                evaluator.evalCondition(cond, { now, values: { '1': 'yes', '2': 15, '3': 'yes' }, visibilityMap }),
            ).toBe(false)
        })

        it('notset on hidden field succeeds in nested and-branch', () => {
            const cond: Condition = {
                and: [
                    { field: 1, op: 'eq', value: 'a' },
                    {
                        or: [
                            { field: 2, op: 'notset' },
                            { field: 3, op: 'eq', value: 'c' },
                        ],
                    },
                ],
            }
            // field 2 hidden → notset returns true → or succeeds → and succeeds
            const visibilityMap = new Map<number, boolean>([
                [1, true],
                [2, false],
                [3, true],
            ])
            expect(
                evaluator.evalCondition(cond, { now, values: { '1': 'a', '2': 'value', '3': 'x' }, visibilityMap }),
            ).toBe(true)
        })

        it('all fields visible in nested conditions evaluates normally', () => {
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
            const visibilityMap = new Map<number, boolean>([
                [1, true],
                [2, true],
                [3, true],
            ])
            expect(
                evaluator.evalCondition(cond, { now, values: { '1': 'a', '2': 'b', '3': 'x' }, visibilityMap }),
            ).toBe(true)
        })

        it('all fields hidden in nested conditions returns false', () => {
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
            const visibilityMap = new Map<number, boolean>([
                [1, false],
                [2, false],
                [3, false],
            ])
            expect(
                evaluator.evalCondition(cond, { now, values: { '1': 'a', '2': 'b', '3': 'c' }, visibilityMap }),
            ).toBe(false)
        })

        it('evaluates 5-level deep nesting correctly (all conditions true)', () => {
            // or → and → or → and → or → leaf
            const cond: Condition = {
                or: [
                    {
                        and: [
                            {
                                or: [
                                    {
                                        and: [
                                            {
                                                or: [
                                                    { field: 1, op: 'eq', value: 'a' },
                                                    { field: 2, op: 'eq', value: 'b' },
                                                ],
                                            },
                                            { field: 3, op: 'gt', value: 0 },
                                        ],
                                    },
                                ],
                            },
                            { field: 4, op: 'set' },
                        ],
                    },
                ],
            }
            // field 1 == 'a' → deepest or true; field 3 > 0 → inner and true;
            // middle or true; field 4 set → outer and true; top or true
            expect(evaluator.evalCondition(cond, { now, values: { '1': 'a', '2': 'x', '3': 5, '4': 'yes' } })).toBe(
                true,
            )
        })

        it('evaluates 5-level deep nesting correctly (deep leaf fails)', () => {
            // or → and → or → and → or → leaf
            const cond: Condition = {
                or: [
                    {
                        and: [
                            {
                                or: [
                                    {
                                        and: [
                                            {
                                                or: [
                                                    { field: 1, op: 'eq', value: 'a' },
                                                    { field: 2, op: 'eq', value: 'b' },
                                                ],
                                            },
                                            { field: 3, op: 'gt', value: 0 },
                                        ],
                                    },
                                ],
                            },
                            { field: 4, op: 'set' },
                        ],
                    },
                ],
            }
            // field 1 != 'a', field 2 != 'b' → deepest or false → inner and false →
            // middle or false → outer and false → top or false
            expect(evaluator.evalCondition(cond, { now, values: { '1': 'x', '2': 'x', '3': 5, '4': 'yes' } })).toBe(
                false,
            )
        })

        it('evaluates 5-level deep nesting with visibilityMap (hidden field at depth)', () => {
            // and → or → and → or → and → leaf
            const cond: Condition = {
                and: [
                    {
                        or: [
                            {
                                and: [
                                    {
                                        or: [
                                            {
                                                and: [
                                                    { field: 1, op: 'eq', value: 'a' },
                                                    { field: 2, op: 'eq', value: 'b' },
                                                ],
                                            },
                                        ],
                                    },
                                    { field: 3, op: 'set' },
                                ],
                            },
                            { field: 4, op: 'eq', value: 'fallback' },
                        ],
                    },
                    { field: 5, op: 'set' },
                ],
            }
            const visibilityMap = new Map<number, boolean>([
                [1, true],
                [2, false],
                [3, true],
                [4, true],
                [5, true],
            ])
            // field 2 hidden → deepest and fails → inner or fails → middle and fails →
            // but field 4 == 'fallback' → outer or true; field 5 set → top and true
            expect(
                evaluator.evalCondition(cond, {
                    now,
                    values: { '1': 'a', '2': 'b', '3': 'yes', '4': 'fallback', '5': 'yes' },
                    visibilityMap,
                }),
            ).toBe(true)
        })

        it('evaluates 5-level deep nesting with visibilityMap (no fallback available)', () => {
            const cond: Condition = {
                and: [
                    {
                        or: [
                            {
                                and: [
                                    {
                                        or: [
                                            {
                                                and: [
                                                    { field: 1, op: 'eq', value: 'a' },
                                                    { field: 2, op: 'eq', value: 'b' },
                                                ],
                                            },
                                        ],
                                    },
                                    { field: 3, op: 'set' },
                                ],
                            },
                            { field: 4, op: 'eq', value: 'fallback' },
                        ],
                    },
                    { field: 5, op: 'set' },
                ],
            }
            const visibilityMap = new Map<number, boolean>([
                [1, true],
                [2, false],
                [3, true],
                [4, true],
                [5, true],
            ])
            // field 2 hidden → deepest and fails; field 4 != 'fallback' → outer or fails → top and false
            expect(
                evaluator.evalCondition(cond, {
                    now,
                    values: { '1': 'a', '2': 'b', '3': 'yes', '4': 'nope', '5': 'yes' },
                    visibilityMap,
                }),
            ).toBe(false)
        })
    })

    describe('relative date resolution in condition values', () => {
        // Base: 2025-06-15T00:00:00.000Z (Sunday)
        const now = new Date('2025-06-15T00:00:00.000Z')

        it('resolves +0d as current date (eq)', () => {
            expect(
                evaluator.evalCondition(
                    { field: 1, op: 'eq', value: '+0d' },
                    { now, values: { '1': '2025-06-15T00:00:00.000Z' } },
                ),
            ).toBe(true)
        })

        describe('days (d)', () => {
            it('resolves +5d (eq)', () => {
                // 2025-06-15 + 5d = 2025-06-20
                expect(
                    evaluator.evalCondition(
                        { field: 1, op: 'eq', value: '+5d' },
                        { now, values: { '1': '2025-06-20T00:00:00.000Z' } },
                    ),
                ).toBe(true)
            })

            it('resolves +5d does not match wrong date (eq)', () => {
                expect(
                    evaluator.evalCondition(
                        { field: 1, op: 'eq', value: '+5d' },
                        { now, values: { '1': '2025-06-19T00:00:00.000Z' } },
                    ),
                ).toBe(false)
            })

            it('resolves -5d (eq)', () => {
                // 2025-06-15 - 5d = 2025-06-10
                expect(
                    evaluator.evalCondition(
                        { field: 1, op: 'eq', value: '-5d' },
                        { now, values: { '1': '2025-06-10T00:00:00.000Z' } },
                    ),
                ).toBe(true)
            })

            it('resolves -5d does not match wrong date (eq)', () => {
                expect(
                    evaluator.evalCondition(
                        { field: 1, op: 'eq', value: '-5d' },
                        { now, values: { '1': '2025-06-11T00:00:00.000Z' } },
                    ),
                ).toBe(false)
            })

            it('resolves +5d with gte (boundary)', () => {
                expect(
                    evaluator.evalCondition(
                        { field: 1, op: 'gte', value: '+5d' },
                        { now, values: { '1': '2025-06-20T00:00:00.000Z' } },
                    ),
                ).toBe(true)
                expect(
                    evaluator.evalCondition(
                        { field: 1, op: 'gte', value: '+5d' },
                        { now, values: { '1': '2025-06-19T00:00:00.000Z' } },
                    ),
                ).toBe(false)
            })

            it('resolves -5d with lt (boundary)', () => {
                // field < 2025-06-10
                expect(
                    evaluator.evalCondition(
                        { field: 1, op: 'lt', value: '-5d' },
                        { now, values: { '1': '2025-06-09T00:00:00.000Z' } },
                    ),
                ).toBe(true)
                expect(
                    evaluator.evalCondition(
                        { field: 1, op: 'lt', value: '-5d' },
                        { now, values: { '1': '2025-06-10T00:00:00.000Z' } },
                    ),
                ).toBe(false)
            })

            it('resolves +30d crossing month boundary (eq)', () => {
                // 2025-06-15 + 30d = 2025-07-15
                expect(
                    evaluator.evalCondition(
                        { field: 1, op: 'eq', value: '+30d' },
                        { now, values: { '1': '2025-07-15T00:00:00.000Z' } },
                    ),
                ).toBe(true)
            })

            it('resolves -15d crossing month boundary (eq)', () => {
                // 2025-06-15 - 15d = 2025-05-31
                expect(
                    evaluator.evalCondition(
                        { field: 1, op: 'eq', value: '-15d' },
                        { now, values: { '1': '2025-05-31T00:00:00.000Z' } },
                    ),
                ).toBe(true)
            })

            it('date range check with and+gte+lte using days', () => {
                // range: -5d..+5d → 2025-06-10..2025-06-20
                const cond: Condition = {
                    and: [
                        { field: 1, op: 'gte', value: '-5d' },
                        { field: 1, op: 'lte', value: '+5d' },
                    ],
                }
                // inside range
                expect(evaluator.evalCondition(cond, { now, values: { '1': '2025-06-15T00:00:00.000Z' } })).toBe(true)
                // on lower boundary
                expect(evaluator.evalCondition(cond, { now, values: { '1': '2025-06-10T00:00:00.000Z' } })).toBe(true)
                // on upper boundary
                expect(evaluator.evalCondition(cond, { now, values: { '1': '2025-06-20T00:00:00.000Z' } })).toBe(true)
                // below range
                expect(evaluator.evalCondition(cond, { now, values: { '1': '2025-06-09T00:00:00.000Z' } })).toBe(false)
                // above range
                expect(evaluator.evalCondition(cond, { now, values: { '1': '2025-06-21T00:00:00.000Z' } })).toBe(false)
            })
        })

        describe('weeks (w)', () => {
            it('resolves +2w (eq)', () => {
                // 2025-06-15 + 14d = 2025-06-29
                expect(
                    evaluator.evalCondition(
                        { field: 1, op: 'eq', value: '+2w' },
                        { now, values: { '1': '2025-06-29T00:00:00.000Z' } },
                    ),
                ).toBe(true)
            })

            it('resolves +2w does not match wrong date (eq)', () => {
                expect(
                    evaluator.evalCondition(
                        { field: 1, op: 'eq', value: '+2w' },
                        { now, values: { '1': '2025-06-28T00:00:00.000Z' } },
                    ),
                ).toBe(false)
            })

            it('resolves -2w (eq)', () => {
                // 2025-06-15 - 14d = 2025-06-01
                expect(
                    evaluator.evalCondition(
                        { field: 1, op: 'eq', value: '-2w' },
                        { now, values: { '1': '2025-06-01T00:00:00.000Z' } },
                    ),
                ).toBe(true)
            })

            it('resolves -2w does not match wrong date (eq)', () => {
                expect(
                    evaluator.evalCondition(
                        { field: 1, op: 'eq', value: '-2w' },
                        { now, values: { '1': '2025-06-02T00:00:00.000Z' } },
                    ),
                ).toBe(false)
            })

            it('resolves +1w with gt (boundary)', () => {
                // +1w = 2025-06-22; field must be > 2025-06-22
                expect(
                    evaluator.evalCondition(
                        { field: 1, op: 'gt', value: '+1w' },
                        { now, values: { '1': '2025-06-23T00:00:00.000Z' } },
                    ),
                ).toBe(true)
                expect(
                    evaluator.evalCondition(
                        { field: 1, op: 'gt', value: '+1w' },
                        { now, values: { '1': '2025-06-22T00:00:00.000Z' } },
                    ),
                ).toBe(false)
            })

            it('resolves -1w with lte (boundary)', () => {
                // -1w = 2025-06-08; field must be <= 2025-06-08
                expect(
                    evaluator.evalCondition(
                        { field: 1, op: 'lte', value: '-1w' },
                        { now, values: { '1': '2025-06-08T00:00:00.000Z' } },
                    ),
                ).toBe(true)
                expect(
                    evaluator.evalCondition(
                        { field: 1, op: 'lte', value: '-1w' },
                        { now, values: { '1': '2025-06-09T00:00:00.000Z' } },
                    ),
                ).toBe(false)
            })

            it('resolves +3w crossing month boundary (eq)', () => {
                // 2025-06-15 + 21d = 2025-07-06
                expect(
                    evaluator.evalCondition(
                        { field: 1, op: 'eq', value: '+3w' },
                        { now, values: { '1': '2025-07-06T00:00:00.000Z' } },
                    ),
                ).toBe(true)
            })

            it('date range check with and+gte+lte using weeks', () => {
                // range: -1w..+1w → 2025-06-08..2025-06-22
                const cond: Condition = {
                    and: [
                        { field: 1, op: 'gte', value: '-1w' },
                        { field: 1, op: 'lte', value: '+1w' },
                    ],
                }
                // inside range
                expect(evaluator.evalCondition(cond, { now, values: { '1': '2025-06-15T00:00:00.000Z' } })).toBe(true)
                // on lower boundary
                expect(evaluator.evalCondition(cond, { now, values: { '1': '2025-06-08T00:00:00.000Z' } })).toBe(true)
                // on upper boundary
                expect(evaluator.evalCondition(cond, { now, values: { '1': '2025-06-22T00:00:00.000Z' } })).toBe(true)
                // below range
                expect(evaluator.evalCondition(cond, { now, values: { '1': '2025-06-07T00:00:00.000Z' } })).toBe(false)
                // above range
                expect(evaluator.evalCondition(cond, { now, values: { '1': '2025-06-23T00:00:00.000Z' } })).toBe(false)
            })
        })

        describe('months (m)', () => {
            it('resolves +3m (eq)', () => {
                // 2025-06-15 + 3m = 2025-09-15
                expect(
                    evaluator.evalCondition(
                        { field: 1, op: 'eq', value: '+3m' },
                        { now, values: { '1': '2025-09-15T00:00:00.000Z' } },
                    ),
                ).toBe(true)
            })

            it('resolves +3m does not match wrong date (eq)', () => {
                expect(
                    evaluator.evalCondition(
                        { field: 1, op: 'eq', value: '+3m' },
                        { now, values: { '1': '2025-09-14T00:00:00.000Z' } },
                    ),
                ).toBe(false)
            })

            it('resolves -3m (eq)', () => {
                // 2025-06-15 - 3m = 2025-03-15
                expect(
                    evaluator.evalCondition(
                        { field: 1, op: 'eq', value: '-3m' },
                        { now, values: { '1': '2025-03-15T00:00:00.000Z' } },
                    ),
                ).toBe(true)
            })

            it('resolves -3m does not match wrong date (eq)', () => {
                expect(
                    evaluator.evalCondition(
                        { field: 1, op: 'eq', value: '-3m' },
                        { now, values: { '1': '2025-03-16T00:00:00.000Z' } },
                    ),
                ).toBe(false)
            })

            it('resolves +1m with ne', () => {
                // +1m = 2025-07-15
                expect(
                    evaluator.evalCondition(
                        { field: 1, op: 'ne', value: '+1m' },
                        { now, values: { '1': '2025-07-14T00:00:00.000Z' } },
                    ),
                ).toBe(true)
                expect(
                    evaluator.evalCondition(
                        { field: 1, op: 'ne', value: '+1m' },
                        { now, values: { '1': '2025-07-15T00:00:00.000Z' } },
                    ),
                ).toBe(false)
            })

            it('resolves -1m with lt (boundary)', () => {
                // -1m = 2025-05-15; field must be < 2025-05-15
                expect(
                    evaluator.evalCondition(
                        { field: 1, op: 'lt', value: '-1m' },
                        { now, values: { '1': '2025-05-14T00:00:00.000Z' } },
                    ),
                ).toBe(true)
                expect(
                    evaluator.evalCondition(
                        { field: 1, op: 'lt', value: '-1m' },
                        { now, values: { '1': '2025-05-15T00:00:00.000Z' } },
                    ),
                ).toBe(false)
            })

            it('resolves +7m crossing year boundary (eq)', () => {
                // 2025-06-15 + 7m = 2026-01-15
                expect(
                    evaluator.evalCondition(
                        { field: 1, op: 'eq', value: '+7m' },
                        { now, values: { '1': '2026-01-15T00:00:00.000Z' } },
                    ),
                ).toBe(true)
            })

            it('resolves -6m crossing year boundary (eq)', () => {
                // 2025-06-15 - 6m = 2024-12-15
                expect(
                    evaluator.evalCondition(
                        { field: 1, op: 'eq', value: '-6m' },
                        { now, values: { '1': '2024-12-15T00:00:00.000Z' } },
                    ),
                ).toBe(true)
            })

            it('date range check with and+gte+lte using months', () => {
                // range: -3m..+3m → 2025-03-15..2025-09-15
                const cond: Condition = {
                    and: [
                        { field: 1, op: 'gte', value: '-3m' },
                        { field: 1, op: 'lte', value: '+3m' },
                    ],
                }
                // inside range
                expect(evaluator.evalCondition(cond, { now, values: { '1': '2025-06-15T00:00:00.000Z' } })).toBe(true)
                // on lower boundary
                expect(evaluator.evalCondition(cond, { now, values: { '1': '2025-03-15T00:00:00.000Z' } })).toBe(true)
                // on upper boundary
                expect(evaluator.evalCondition(cond, { now, values: { '1': '2025-09-15T00:00:00.000Z' } })).toBe(true)
                // below range
                expect(evaluator.evalCondition(cond, { now, values: { '1': '2025-03-14T00:00:00.000Z' } })).toBe(false)
                // above range
                expect(evaluator.evalCondition(cond, { now, values: { '1': '2025-09-16T00:00:00.000Z' } })).toBe(false)
            })
        })

        describe('years (y)', () => {
            it('resolves +2y (eq)', () => {
                // 2025-06-15 + 2y = 2027-06-15
                expect(
                    evaluator.evalCondition(
                        { field: 1, op: 'eq', value: '+2y' },
                        { now, values: { '1': '2027-06-15T00:00:00.000Z' } },
                    ),
                ).toBe(true)
            })

            it('resolves +2y does not match wrong date (eq)', () => {
                expect(
                    evaluator.evalCondition(
                        { field: 1, op: 'eq', value: '+2y' },
                        { now, values: { '1': '2027-06-14T00:00:00.000Z' } },
                    ),
                ).toBe(false)
            })

            it('resolves -2y (eq)', () => {
                // 2025-06-15 - 2y = 2023-06-15
                expect(
                    evaluator.evalCondition(
                        { field: 1, op: 'eq', value: '-2y' },
                        { now, values: { '1': '2023-06-15T00:00:00.000Z' } },
                    ),
                ).toBe(true)
            })

            it('resolves -2y does not match wrong date (eq)', () => {
                expect(
                    evaluator.evalCondition(
                        { field: 1, op: 'eq', value: '-2y' },
                        { now, values: { '1': '2023-06-16T00:00:00.000Z' } },
                    ),
                ).toBe(false)
            })

            it('resolves +1y with gte (boundary)', () => {
                // +1y = 2026-06-15
                expect(
                    evaluator.evalCondition(
                        { field: 1, op: 'gte', value: '+1y' },
                        { now, values: { '1': '2026-06-15T00:00:00.000Z' } },
                    ),
                ).toBe(true)
                expect(
                    evaluator.evalCondition(
                        { field: 1, op: 'gte', value: '+1y' },
                        { now, values: { '1': '2026-06-14T00:00:00.000Z' } },
                    ),
                ).toBe(false)
            })

            it('resolves -1y with gt (boundary)', () => {
                // -1y = 2024-06-15; field must be > 2024-06-15
                expect(
                    evaluator.evalCondition(
                        { field: 1, op: 'gt', value: '-1y' },
                        { now, values: { '1': '2024-06-16T00:00:00.000Z' } },
                    ),
                ).toBe(true)
                expect(
                    evaluator.evalCondition(
                        { field: 1, op: 'gt', value: '-1y' },
                        { now, values: { '1': '2024-06-15T00:00:00.000Z' } },
                    ),
                ).toBe(false)
            })

            it('date range check with and+gte+lte using years', () => {
                // range: -1y..+1y → 2024-06-15..2026-06-15
                const cond: Condition = {
                    and: [
                        { field: 1, op: 'gte', value: '-1y' },
                        { field: 1, op: 'lte', value: '+1y' },
                    ],
                }
                // inside range
                expect(evaluator.evalCondition(cond, { now, values: { '1': '2025-06-15T00:00:00.000Z' } })).toBe(true)
                // on lower boundary
                expect(evaluator.evalCondition(cond, { now, values: { '1': '2024-06-15T00:00:00.000Z' } })).toBe(true)
                // on upper boundary
                expect(evaluator.evalCondition(cond, { now, values: { '1': '2026-06-15T00:00:00.000Z' } })).toBe(true)
                // below range
                expect(evaluator.evalCondition(cond, { now, values: { '1': '2024-06-14T00:00:00.000Z' } })).toBe(false)
                // above range
                expect(evaluator.evalCondition(cond, { now, values: { '1': '2026-06-16T00:00:00.000Z' } })).toBe(false)
            })
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
            expect(evaluator.evalCondition({ field: 1, op: 'set' }, { now, values: { '1': fileValue } })).toBe(true)
        })

        it('set returns false when file field is null', () => {
            expect(evaluator.evalCondition({ field: 1, op: 'set' }, { now, values: { '1': null } })).toBe(false)
        })

        it('notset returns true when file field is null', () => {
            expect(evaluator.evalCondition({ field: 1, op: 'notset' }, { now, values: { '1': null } })).toBe(true)
        })

        it('notset returns true when file field is undefined', () => {
            expect(evaluator.evalCondition({ field: 1, op: 'notset' }, { now, values: {} })).toBe(true)
        })

        it('notset returns false when file field has a file object', () => {
            expect(evaluator.evalCondition({ field: 1, op: 'notset' }, { now, values: { '1': fileValue } })).toBe(false)
        })
    })

    describe('type mismatch', () => {
        it('returns false for lt with mismatched types (number vs boolean)', () => {
            expect(evaluator.evalCondition({ field: 1, op: 'lt', value: 10 }, { now, values: { '1': true } })).toBe(
                false,
            )
        })

        it('returns false for gt with mismatched types (string vs number)', () => {
            const result = evaluator.evalCondition({ field: 1, op: 'gt', value: 'abc' }, { now, values: { '1': 10 } })
            // Number vs string → NaN comparison
            expect(result).toBe(false)
        })
    })

    describe('missing values', () => {
        it('undefined field value with eq returns false', () => {
            expect(evaluator.evalCondition({ field: 1, op: 'eq', value: 'a' }, { now, values: {} })).toBe(false)
        })

        it('undefined field value with ne returns true', () => {
            expect(evaluator.evalCondition({ field: 1, op: 'ne', value: 'a' }, { now, values: {} })).toBe(true)
        })
    })

    describe('eq/ne with relative date string values', () => {
        it('eq with +0d resolves to today ISO string and matches', () => {
            const todayIso = now.toISOString()
            expect(
                evaluator.evalCondition({ field: 1, op: 'eq', value: '+0d' }, { now, values: { '1': todayIso } }),
            ).toBe(true)
        })

        it('eq with +0d does not match a different date', () => {
            expect(
                evaluator.evalCondition(
                    { field: 1, op: 'eq', value: '+0d' },
                    { now, values: { '1': '2000-01-01T00:00:00.000Z' } },
                ),
            ).toBe(false)
        })

        it('ne with +0d returns false when field matches resolved date', () => {
            const todayIso = now.toISOString()
            expect(
                evaluator.evalCondition({ field: 1, op: 'ne', value: '+0d' }, { now, values: { '1': todayIso } }),
            ).toBe(false)
        })

        it('ne with +0d returns true when field does not match resolved date', () => {
            expect(
                evaluator.evalCondition(
                    { field: 1, op: 'ne', value: '+0d' },
                    { now, values: { '1': '2000-01-01T00:00:00.000Z' } },
                ),
            ).toBe(true)
        })
    })

    describe('compound conditions with empty arrays', () => {
        it('and with empty array returns true (vacuous truth)', () => {
            const cond: Condition = { and: [] }
            expect(evaluator.evalCondition(cond, { now, values: {} })).toBe(true)
        })

        it('or with empty array returns false', () => {
            const cond: Condition = { or: [] }
            expect(evaluator.evalCondition(cond, { now, values: {} })).toBe(false)
        })
    })

    describe('in/notin when field value is itself an array', () => {
        it('in returns false when field value is an array (no deep equality)', () => {
            expect(
                evaluator.evalCondition(
                    { field: 1, op: 'in', value: [['a', 'b'], 'c'] },
                    { now, values: { '1': ['a', 'b'] } },
                ),
            ).toBe(false)
        })

        it('notin returns true when field value is an array (not found by reference)', () => {
            expect(
                evaluator.evalCondition(
                    { field: 1, op: 'notin', value: ['a', 'b', 'c'] },
                    { now, values: { '1': ['a', 'b'] } },
                ),
            ).toBe(true)
        })
    })
})
