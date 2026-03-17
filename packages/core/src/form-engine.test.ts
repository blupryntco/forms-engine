import { FormEngine } from './form-engine'
import { SimpleCondition } from './types/conditions'
import { DocumentError } from './types/errors'
import type { ContentItem, FormDefinition } from './types/form-definition'
import type { FormSnapshot } from './types/form-snapshot'
import type { FormDocument, FormValues } from './types/form-values'

// ── Helpers ──

const baseDef = (content: ContentItem[]): FormDefinition => ({
    id: 'test-form',
    version: '1.0.0',
    title: 'Test Form',
    content,
})

const SUBMITTED_AT = '2025-06-15T00:00:00.000Z'

const doc = (values: FormValues = {}, submittedAt: string = SUBMITTED_AT): FormDocument => ({
    form: { id: 'test-form', version: '1.0.0', submittedAt },
    values,
})

describe('FormEngine', () => {
    describe('construction', () => {
        it('rejects empty content array (schema requires minItems: 1)', () => {
            expect(() => new FormEngine(baseDef([]))).toThrow(DocumentError)
            try {
                new FormEngine(baseDef([]))
            } catch (e) {
                expect((e as DocumentError).errors[0]?.code).toBe('SCHEMA_INVALID')
            }
        })

        it('constructs with a single string field', () => {
            const engine = new FormEngine(baseDef([{ id: 1, type: 'string', label: 'Name' }]))
            expect(engine.contentOrder).toEqual([1])
            expect(engine.getFieldDef(1)?.type).toBe('string')
        })

        it('constructs with all field types', () => {
            const engine = new FormEngine(
                baseDef([
                    { id: 1, type: 'string', label: 'Name' },
                    { id: 2, type: 'number', label: 'Age' },
                    { id: 3, type: 'boolean', label: 'Active' },
                    { id: 4, type: 'date', label: 'DOB' },
                    {
                        id: 5,
                        type: 'select',
                        label: 'Color',
                        options: [
                            { value: 'r', label: 'Red' },
                            { value: 'g', label: 'Green' },
                        ],
                    },
                    {
                        id: 6,
                        type: 'array',
                        label: 'Tags',
                        item: { type: 'string', label: 'Tag' },
                    },
                ]),
            )
            expect(engine.contentOrder).toEqual([1, 2, 3, 4, 5, 6])
        })

        it('preserves depth-first document order through nested sections', () => {
            const engine = new FormEngine(
                baseDef([
                    { id: 1, type: 'string', label: 'A' },
                    {
                        id: 10,
                        type: 'section',
                        title: 'S1',
                        content: [
                            { id: 2, type: 'string', label: 'B' },
                            {
                                id: 20,
                                type: 'section',
                                title: 'S1.1',
                                content: [{ id: 3, type: 'string', label: 'C' }],
                            },
                        ],
                    },
                    { id: 4, type: 'string', label: 'D' },
                ]),
            )
            expect(engine.contentOrder).toEqual([1, 10, 2, 20, 3, 4])
        })

        it('sets parentId for nested fields', () => {
            const engine = new FormEngine(
                baseDef([
                    {
                        id: 10,
                        type: 'section',
                        title: 'S',
                        content: [{ id: 1, type: 'string', label: 'A' }],
                    },
                ]),
            )
            expect(engine.getFieldDef(1)?.parentId).toBe(10)
            expect(engine.getFieldDef(10)?.parentId).toBeUndefined()
        })

        it('stores select options in registry', () => {
            const engine = new FormEngine(
                baseDef([
                    {
                        id: 1,
                        type: 'select',
                        label: 'X',
                        options: [{ value: 'a', label: 'A' }],
                    },
                ]),
            )
            expect(engine.getFieldDef(1)?.options).toEqual([{ value: 'a', label: 'A' }])
        })

        it('stores array item def in registry', () => {
            const engine = new FormEngine(
                baseDef([
                    {
                        id: 1,
                        type: 'array',
                        label: 'Arr',
                        item: { type: 'number', label: 'Num' },
                    },
                ]),
            )
            expect(engine.getFieldDef(1)?.item?.type).toBe('number')
        })

        it('stores label for fields and title for sections', () => {
            const engine = new FormEngine(
                baseDef([
                    { id: 1, type: 'string', label: 'My Field' },
                    {
                        id: 2,
                        type: 'section',
                        title: 'My Section',
                        content: [{ id: 3, type: 'string', label: 'Inner' }],
                    },
                ]),
            )
            expect(engine.getFieldDef(1)?.label).toBe('My Field')
            expect(engine.getFieldDef(1)?.title).toBeUndefined()
            expect(engine.getFieldDef(2)?.title).toBe('My Section')
            expect(engine.getFieldDef(2)?.label).toBeUndefined()
        })

        it('constructs with max nesting depth (3 levels)', () => {
            const engine = new FormEngine(
                baseDef([
                    {
                        id: 1,
                        type: 'section',
                        title: 'L1',
                        content: [
                            {
                                id: 2,
                                type: 'section',
                                title: 'L2',
                                content: [
                                    {
                                        id: 3,
                                        type: 'section',
                                        title: 'L3',
                                        content: [{ id: 4, type: 'string', label: 'Deep' }],
                                    },
                                ],
                            },
                        ],
                    },
                ]),
            )
            expect(engine.contentOrder).toEqual([1, 2, 3, 4])
        })
    })

    describe('schema validation', () => {
        it('rejects non-object input', () => {
            expect(() => new FormEngine(null as unknown as FormDefinition)).toThrow(DocumentError)
            expect(() => new FormEngine('string' as unknown as FormDefinition)).toThrow(DocumentError)
        })

        it('rejects missing required top-level fields', () => {
            expect(() => new FormEngine({} as unknown as FormDefinition)).toThrow(DocumentError)
        })

        it('rejects invalid version format', () => {
            expect(
                () =>
                    new FormEngine({
                        id: 'x',
                        version: 'abc',
                        title: 'T',
                        content: [{ id: 1, type: 'string', label: 'A' }],
                    } as unknown as FormDefinition),
            ).toThrow(DocumentError)
        })

        it('rejects empty content array', () => {
            try {
                new FormEngine(baseDef([]))
            } catch (e) {
                expect(e).toBeInstanceOf(DocumentError)
                expect((e as DocumentError).errors.every((i) => i.code === 'SCHEMA_INVALID')).toBe(true)
            }
        })

        it('rejects additional top-level properties', () => {
            expect(
                () =>
                    new FormEngine({
                        ...baseDef([{ id: 1, type: 'string', label: 'A' }]),
                        extra: true,
                    } as unknown as FormDefinition),
            ).toThrow(DocumentError)
        })

        it('rejects field with non-integer id', () => {
            expect(() => new FormEngine(baseDef([{ id: 1.5, type: 'string', label: 'A' }]))).toThrow(DocumentError)
        })

        it('rejects field with zero id', () => {
            expect(() => new FormEngine(baseDef([{ id: 0, type: 'string', label: 'A' }]))).toThrow(DocumentError)
        })

        it('rejects select without options', () => {
            expect(() => new FormEngine(baseDef([{ id: 1, type: 'select', label: 'S' }]))).toThrow(DocumentError)
        })

        it('rejects array without item', () => {
            expect(() => new FormEngine(baseDef([{ id: 1, type: 'array', label: 'A' }]))).toThrow(DocumentError)
        })

        it('rejects section with empty content', () => {
            expect(() => new FormEngine(baseDef([{ id: 1, type: 'section', title: 'S', content: [] }]))).toThrow(
                DocumentError,
            )
        })

        it('rejects unknown field type', () => {
            expect(
                () => new FormEngine(baseDef([{ id: 1, type: 'unknown', label: 'A' }] as unknown as ContentItem[])),
            ).toThrow(DocumentError)
        })

        it('valid definition passes schema validation', () => {
            expect(
                () =>
                    new FormEngine(
                        baseDef([
                            { id: 1, type: 'string', label: 'A' },
                            { id: 2, type: 'number', label: 'B' },
                        ]),
                    ),
            ).not.toThrow()
        })
    })

    describe('semantic errors', () => {
        it('throws on duplicate ids', () => {
            expect(
                () =>
                    new FormEngine(
                        baseDef([
                            { id: 1, type: 'string', label: 'A' },
                            { id: 1, type: 'number', label: 'B' },
                        ]),
                    ),
            ).toThrow(DocumentError)
            try {
                new FormEngine(
                    baseDef([
                        { id: 1, type: 'string', label: 'A' },
                        { id: 1, type: 'number', label: 'B' },
                    ]),
                )
            } catch (e) {
                expect(e).toBeInstanceOf(DocumentError)
                expect((e as DocumentError).errors.some((i) => i.code === 'DUPLICATE_ID')).toBe(true)
            }
        })

        it('throws on nesting depth > 3', () => {
            try {
                new FormEngine(
                    baseDef([
                        {
                            id: 1,
                            type: 'section',
                            title: 'L1',
                            content: [
                                {
                                    id: 2,
                                    type: 'section',
                                    title: 'L2',
                                    content: [
                                        {
                                            id: 3,
                                            type: 'section',
                                            title: 'L3',
                                            content: [
                                                {
                                                    id: 4,
                                                    type: 'section',
                                                    title: 'L4',
                                                    content: [{ id: 5, type: 'string', label: 'Deep' }],
                                                },
                                            ],
                                        },
                                    ],
                                },
                            ],
                        },
                    ]),
                )
                fail('Expected DocumentError')
            } catch (e) {
                expect(e).toBeInstanceOf(DocumentError)
                expect((e as DocumentError).errors.some((i) => i.code === 'NESTING_DEPTH')).toBe(true)
            }
        })

        it('throws on unknown field reference in condition', () => {
            try {
                new FormEngine(
                    baseDef([
                        {
                            id: 1,
                            type: 'string',
                            label: 'A',
                            condition: { field: 999, op: 'set' },
                        },
                    ]),
                )
                fail('Expected DocumentError')
            } catch (e) {
                expect(e).toBeInstanceOf(DocumentError)
                expect((e as DocumentError).errors.some((i) => i.code === 'UNKNOWN_FIELD_REF')).toBe(true)
            }
        })

        it('throws when condition references a section', () => {
            try {
                new FormEngine(
                    baseDef([
                        {
                            id: 10,
                            type: 'section',
                            title: 'S',
                            content: [{ id: 11, type: 'string', label: 'Inner' }],
                        },
                        {
                            id: 1,
                            type: 'string',
                            label: 'A',
                            condition: { field: 10, op: 'set' },
                        },
                    ]),
                )
                fail('Expected DocumentError')
            } catch (e) {
                expect(e).toBeInstanceOf(DocumentError)
                expect((e as DocumentError).errors.some((i) => i.code === 'CONDITION_REFS_SECTION')).toBe(true)
            }
        })

        it('throws on string minLength > maxLength', () => {
            try {
                new FormEngine(
                    baseDef([
                        {
                            id: 1,
                            type: 'string',
                            label: 'A',
                            validation: { minLength: 10, maxLength: 5 },
                        },
                    ]),
                )
                fail('Expected DocumentError')
            } catch (e) {
                expect(e).toBeInstanceOf(DocumentError)
                expect((e as DocumentError).errors.some((i) => i.code === 'INVALID_MIN_MAX')).toBe(true)
            }
        })

        it('throws on number min > max', () => {
            try {
                new FormEngine(
                    baseDef([
                        {
                            id: 1,
                            type: 'number',
                            label: 'N',
                            validation: { min: 100, max: 10 },
                        },
                    ]),
                )
                fail('Expected DocumentError')
            } catch (e) {
                expect(e).toBeInstanceOf(DocumentError)
                expect((e as DocumentError).errors.some((i) => i.code === 'INVALID_MIN_MAX')).toBe(true)
            }
        })

        it('throws on absolute date minDate > maxDate', () => {
            try {
                new FormEngine(
                    baseDef([
                        {
                            id: 1,
                            type: 'date',
                            label: 'D',
                            validation: { minDate: '2025-12-31T00:00:00.000Z', maxDate: '2025-01-01T00:00:00.000Z' },
                        },
                    ]),
                )
                fail('Expected DocumentError')
            } catch (e) {
                expect(e).toBeInstanceOf(DocumentError)
                expect((e as DocumentError).errors.some((i) => i.code === 'INVALID_MIN_MAX')).toBe(true)
            }
        })

        it('throws on array minItems > maxItems', () => {
            try {
                new FormEngine(
                    baseDef([
                        {
                            id: 1,
                            type: 'array',
                            label: 'Arr',
                            item: { type: 'string', label: 'S' },
                            validation: { minItems: 5, maxItems: 2 },
                        },
                    ]),
                )
                fail('Expected DocumentError')
            } catch (e) {
                expect(e).toBeInstanceOf(DocumentError)
                expect((e as DocumentError).errors.some((i) => i.code === 'INVALID_MIN_MAX')).toBe(true)
            }
        })

        it('throws on invalid regex pattern', () => {
            try {
                new FormEngine(
                    baseDef([
                        {
                            id: 1,
                            type: 'string',
                            label: 'S',
                            validation: { pattern: '[invalid(' },
                        },
                    ]),
                )
                fail('Expected DocumentError')
            } catch (e) {
                expect(e).toBeInstanceOf(DocumentError)
                expect((e as DocumentError).errors.some((i) => i.code === 'INVALID_REGEX')).toBe(true)
            }
        })

        it('throws on circular condition dependency', () => {
            try {
                new FormEngine(
                    baseDef([
                        {
                            id: 1,
                            type: 'string',
                            label: 'A',
                            condition: { field: 2, op: 'set' },
                        },
                        {
                            id: 2,
                            type: 'string',
                            label: 'B',
                            condition: { field: 1, op: 'set' },
                        },
                    ]),
                )
                fail('Expected DocumentError')
            } catch (e) {
                expect(e).toBeInstanceOf(DocumentError)
                expect((e as DocumentError).errors.some((i) => i.code === 'CIRCULAR_DEPENDENCY')).toBe(true)
            }
        })

        it('throws on transitive circular dependency (A→B→C→A)', () => {
            try {
                new FormEngine(
                    baseDef([
                        {
                            id: 1,
                            type: 'string',
                            label: 'A',
                            condition: { field: 3, op: 'set' },
                        },
                        {
                            id: 2,
                            type: 'string',
                            label: 'B',
                            condition: { field: 1, op: 'set' },
                        },
                        {
                            id: 3,
                            type: 'string',
                            label: 'C',
                            condition: { field: 2, op: 'set' },
                        },
                    ]),
                )
                fail('Expected DocumentError')
            } catch (e) {
                expect(e).toBeInstanceOf(DocumentError)
                expect((e as DocumentError).errors.some((i) => i.code === 'CIRCULAR_DEPENDENCY')).toBe(true)
            }
        })

        it('collects multiple issues in a single throw', () => {
            try {
                new FormEngine(
                    baseDef([
                        { id: 1, type: 'string', label: 'A' },
                        { id: 1, type: 'string', label: 'A dup' },
                        {
                            id: 2,
                            type: 'string',
                            label: 'B',
                            validation: { minLength: 10, maxLength: 2 },
                        },
                    ]),
                )
                fail('Expected DocumentError')
            } catch (e) {
                expect(e).toBeInstanceOf(DocumentError)
                const issues = (e as DocumentError).errors
                expect(issues.length).toBeGreaterThanOrEqual(2)
                const codes = issues.map((i) => i.code)
                expect(codes).toContain('DUPLICATE_ID')
                expect(codes).toContain('INVALID_MIN_MAX')
            }
        })

        it('DocumentError has descriptive message', () => {
            try {
                new FormEngine(
                    baseDef([
                        { id: 1, type: 'string', label: 'A' },
                        { id: 1, type: 'string', label: 'A dup' },
                    ]),
                )
            } catch (e) {
                expect(e).toBeInstanceOf(DocumentError)
                expect((e as DocumentError).message).toContain('Document validation failed')
                expect((e as DocumentError).name).toBe('DocumentError')
            }
        })
    })

    describe('getFieldDef', () => {
        const engine = new FormEngine(
            baseDef([
                { id: 1, type: 'string', label: 'A' },
                { id: 10, type: 'section', title: 'S', content: [{ id: 2, type: 'number', label: 'B' }] },
            ]),
        )

        it('returns entry for a known field', () => {
            const entry = engine.getFieldDef(1)
            expect(entry).toBeDefined()
            expect(entry?.type).toBe('string')
            expect(entry?.id).toBe(1)
        })

        it('returns entry for a section', () => {
            expect(engine.getFieldDef(10)?.type).toBe('section')
        })

        it('returns undefined for unknown id', () => {
            expect(engine.getFieldDef(999)).toBeUndefined()
        })
    })

    describe('isVisible', () => {
        it('unconditional field is always visible', () => {
            const engine = new FormEngine(baseDef([{ id: 1, type: 'string', label: 'A' }]))
            expect(engine.isVisible(1, doc({}))).toBe(true)
        })

        it('returns false for unknown id', () => {
            const engine = new FormEngine(baseDef([{ id: 1, type: 'string', label: 'A' }]))
            expect(engine.isVisible(999, doc({}))).toBe(false)
        })

        describe('simple condition operators', () => {
            const makeEngine = (op: SimpleCondition['op'], value?: unknown) => {
                const condition: SimpleCondition = value !== undefined ? { field: 1, op, value } : { field: 1, op }
                return new FormEngine(
                    baseDef([
                        { id: 1, type: 'string', label: 'Ctrl' },
                        { id: 2, type: 'string', label: 'Dep', condition },
                    ]),
                )
            }

            it('set: visible when field has a value', () => {
                const engine = makeEngine('set')
                expect(engine.isVisible(2, doc({ '1': 'hello' }))).toBe(true)
                expect(engine.isVisible(2, doc({}))).toBe(false)
                expect(engine.isVisible(2, doc({ '1': '' }))).toBe(false)
                expect(engine.isVisible(2, doc({ '1': null }))).toBe(false)
            })

            it('notset: visible when field has no value', () => {
                const engine = makeEngine('notset')
                expect(engine.isVisible(2, doc({}))).toBe(true)
                expect(engine.isVisible(2, doc({ '1': '' }))).toBe(true)
                expect(engine.isVisible(2, doc({ '1': 'x' }))).toBe(false)
            })

            it('eq: visible when field equals value', () => {
                const engine = makeEngine('eq', 'yes')
                expect(engine.isVisible(2, doc({ '1': 'yes' }))).toBe(true)
                expect(engine.isVisible(2, doc({ '1': 'no' }))).toBe(false)
            })

            it('ne: visible when field does not equal value', () => {
                const engine = makeEngine('ne', 'yes')
                expect(engine.isVisible(2, doc({ '1': 'no' }))).toBe(true)
                expect(engine.isVisible(2, doc({ '1': 'yes' }))).toBe(false)
            })

            it('gt / lt / gte / lte with numbers', () => {
                const engine = (op: SimpleCondition['op']) =>
                    new FormEngine(
                        baseDef([
                            { id: 1, type: 'number', label: 'N' },
                            {
                                id: 2,
                                type: 'string',
                                label: 'D',
                                condition: { field: 1, op, value: 10 },
                            },
                        ]),
                    )

                expect(engine('gt').isVisible(2, doc({ '1': 15 }))).toBe(true)
                expect(engine('gt').isVisible(2, doc({ '1': 10 }))).toBe(false)
                expect(engine('gt').isVisible(2, doc({ '1': 5 }))).toBe(false)

                expect(engine('lt').isVisible(2, doc({ '1': 5 }))).toBe(true)
                expect(engine('lt').isVisible(2, doc({ '1': 10 }))).toBe(false)

                expect(engine('gte').isVisible(2, doc({ '1': 10 }))).toBe(true)
                expect(engine('gte').isVisible(2, doc({ '1': 9 }))).toBe(false)

                expect(engine('lte').isVisible(2, doc({ '1': 10 }))).toBe(true)
                expect(engine('lte').isVisible(2, doc({ '1': 11 }))).toBe(false)
            })

            it('in: visible when field value is in the array', () => {
                const engine = makeEngine('in', ['a', 'b', 'c'])
                expect(engine.isVisible(2, doc({ '1': 'b' }))).toBe(true)
                expect(engine.isVisible(2, doc({ '1': 'z' }))).toBe(false)
            })

            it('notin: visible when field value is not in the array', () => {
                const engine = makeEngine('notin', ['a', 'b'])
                expect(engine.isVisible(2, doc({ '1': 'z' }))).toBe(true)
                expect(engine.isVisible(2, doc({ '1': 'a' }))).toBe(false)
            })
        })

        describe('compound conditions', () => {
            it('and: all must be true', () => {
                const engine = new FormEngine(
                    baseDef([
                        { id: 1, type: 'string', label: 'A' },
                        { id: 2, type: 'string', label: 'B' },
                        {
                            id: 3,
                            type: 'string',
                            label: 'C',
                            condition: {
                                and: [
                                    { field: 1, op: 'set' },
                                    { field: 2, op: 'set' },
                                ],
                            },
                        },
                    ]),
                )
                expect(engine.isVisible(3, doc({ '1': 'x', '2': 'y' }))).toBe(true)
                expect(engine.isVisible(3, doc({ '1': 'x' }))).toBe(false)
                expect(engine.isVisible(3, doc({}))).toBe(false)
            })

            it('or: at least one must be true', () => {
                const engine = new FormEngine(
                    baseDef([
                        { id: 1, type: 'string', label: 'A' },
                        { id: 2, type: 'string', label: 'B' },
                        {
                            id: 3,
                            type: 'string',
                            label: 'C',
                            condition: {
                                or: [
                                    { field: 1, op: 'set' },
                                    { field: 2, op: 'set' },
                                ],
                            },
                        },
                    ]),
                )
                expect(engine.isVisible(3, doc({ '1': 'x' }))).toBe(true)
                expect(engine.isVisible(3, doc({ '2': 'y' }))).toBe(true)
                expect(engine.isVisible(3, doc({}))).toBe(false)
            })

            it('nested compound: and inside or', () => {
                const engine = new FormEngine(
                    baseDef([
                        { id: 1, type: 'string', label: 'A' },
                        { id: 2, type: 'string', label: 'B' },
                        { id: 3, type: 'string', label: 'C' },
                        {
                            id: 4,
                            type: 'string',
                            label: 'D',
                            condition: {
                                or: [
                                    {
                                        and: [
                                            { field: 1, op: 'set' },
                                            { field: 2, op: 'set' },
                                        ],
                                    },
                                    { field: 3, op: 'eq', value: 'override' },
                                ],
                            },
                        },
                    ]),
                )
                // and branch passes
                expect(engine.isVisible(4, doc({ '1': 'x', '2': 'y' }))).toBe(true)
                // or branch passes
                expect(engine.isVisible(4, doc({ '3': 'override' }))).toBe(true)
                // neither
                expect(engine.isVisible(4, doc({ '1': 'x' }))).toBe(false)
            })
        })

        describe('parent section visibility', () => {
            it('hidden parent hides children', () => {
                const engine = new FormEngine(
                    baseDef([
                        { id: 1, type: 'boolean', label: 'Toggle' },
                        {
                            id: 10,
                            type: 'section',
                            title: 'S',
                            condition: { field: 1, op: 'eq', value: true },
                            content: [{ id: 2, type: 'string', label: 'Child' }],
                        },
                    ]),
                )
                expect(engine.isVisible(2, doc({ '1': true }))).toBe(true)
                expect(engine.isVisible(2, doc({ '1': false }))).toBe(false)
                expect(engine.isVisible(2, doc({}))).toBe(false)
            })

            it('grandchild hidden when grandparent is hidden', () => {
                const engine = new FormEngine(
                    baseDef([
                        { id: 1, type: 'boolean', label: 'Toggle' },
                        {
                            id: 10,
                            type: 'section',
                            title: 'L1',
                            condition: { field: 1, op: 'eq', value: true },
                            content: [
                                {
                                    id: 20,
                                    type: 'section',
                                    title: 'L2',
                                    content: [{ id: 2, type: 'string', label: 'Deep' }],
                                },
                            ],
                        },
                    ]),
                )
                expect(engine.isVisible(2, doc({ '1': true }))).toBe(true)
                expect(engine.isVisible(2, doc({ '1': false }))).toBe(false)
            })
        })
    })

    describe('getVisibilityMap', () => {
        it('returns all-visible map for unconditional form', () => {
            const engine = new FormEngine(
                baseDef([
                    { id: 1, type: 'string', label: 'A' },
                    { id: 2, type: 'number', label: 'B' },
                ]),
            )
            const map = engine.getVisibilityMap(doc({}))
            expect(map.get(1)).toBe(true)
            expect(map.get(2)).toBe(true)
        })

        it('respects simple condition', () => {
            const engine = new FormEngine(
                baseDef([
                    { id: 1, type: 'string', label: 'Ctrl' },
                    {
                        id: 2,
                        type: 'string',
                        label: 'Dep',
                        condition: { field: 1, op: 'set' },
                    },
                ]),
            )
            expect(engine.getVisibilityMap(doc({ '1': 'x' })).get(2)).toBe(true)
            expect(engine.getVisibilityMap(doc({})).get(2)).toBe(false)
        })

        it('cascades parent → child hiding', () => {
            const engine = new FormEngine(
                baseDef([
                    { id: 1, type: 'boolean', label: 'Toggle' },
                    {
                        id: 10,
                        type: 'section',
                        title: 'S',
                        condition: { field: 1, op: 'eq', value: true },
                        content: [{ id: 2, type: 'string', label: 'Child' }],
                    },
                ]),
            )
            const hidden = engine.getVisibilityMap(doc({ '1': false }))
            expect(hidden.get(10)).toBe(false)
            expect(hidden.get(2)).toBe(false)

            const shown = engine.getVisibilityMap(doc({ '1': true }))
            expect(shown.get(10)).toBe(true)
            expect(shown.get(2)).toBe(true)
        })

        it('applies hidden-field rule: reference to hidden field → treated as not set', () => {
            // Field 1 controls field 2 visibility. Field 2 controls field 3 visibility.
            // If field 1 is not set → field 2 hidden → field 3 sees field 2 as "not set"
            const engine = new FormEngine(
                baseDef([
                    { id: 1, type: 'string', label: 'A' },
                    {
                        id: 2,
                        type: 'string',
                        label: 'B',
                        condition: { field: 1, op: 'set' },
                    },
                    {
                        id: 3,
                        type: 'string',
                        label: 'C',
                        condition: { field: 2, op: 'set' },
                    },
                ]),
            )
            // field 1 not set → field 2 hidden → hidden-field rule → field 2 "not set" → field 3 hidden
            const map1 = engine.getVisibilityMap(doc({ '2': 'has-value' }))
            expect(map1.get(2)).toBe(false)
            expect(map1.get(3)).toBe(false) // hidden-field rule: field 2 is hidden, treated as not set

            // field 1 set → field 2 visible → field 2 has value → field 3 visible
            const map2 = engine.getVisibilityMap(doc({ '1': 'x', '2': 'y' }))
            expect(map2.get(2)).toBe(true)
            expect(map2.get(3)).toBe(true)
        })

        it('hidden-field rule: notset on a hidden field returns true', () => {
            const engine = new FormEngine(
                baseDef([
                    { id: 1, type: 'string', label: 'Gate' },
                    {
                        id: 2,
                        type: 'string',
                        label: 'Controlled',
                        condition: { field: 1, op: 'set' },
                    },
                    {
                        id: 3,
                        type: 'string',
                        label: 'ShowIfNotSet',
                        condition: { field: 2, op: 'notset' },
                    },
                ]),
            )
            // field 1 not set → field 2 hidden → notset(field 2) = true → field 3 visible
            const map = engine.getVisibilityMap(doc({}))
            expect(map.get(2)).toBe(false)
            expect(map.get(3)).toBe(true)
        })

        it('rejects empty form at schema level', () => {
            expect(() => new FormEngine(baseDef([]))).toThrow(DocumentError)
        })
    })

    describe('getAffectedIds', () => {
        it('returns direct dependents', () => {
            const engine = new FormEngine(
                baseDef([
                    { id: 1, type: 'string', label: 'Ctrl' },
                    {
                        id: 2,
                        type: 'string',
                        label: 'Dep',
                        condition: { field: 1, op: 'set' },
                    },
                ]),
            )
            expect(engine.getAffectedIds(1)).toEqual(new Set([2]))
        })

        it('returns transitive dependents', () => {
            const engine = new FormEngine(
                baseDef([
                    { id: 1, type: 'string', label: 'A' },
                    {
                        id: 2,
                        type: 'string',
                        label: 'B',
                        condition: { field: 1, op: 'set' },
                    },
                    {
                        id: 3,
                        type: 'string',
                        label: 'C',
                        condition: { field: 2, op: 'set' },
                    },
                ]),
            )
            const affected = engine.getAffectedIds(1)
            expect(affected.has(2)).toBe(true)
            expect(affected.has(3)).toBe(true)
        })

        it('returns empty set for fields with no dependents', () => {
            const engine = new FormEngine(
                baseDef([
                    { id: 1, type: 'string', label: 'A' },
                    { id: 2, type: 'string', label: 'B' },
                ]),
            )
            expect(engine.getAffectedIds(1).size).toBe(0)
            expect(engine.getAffectedIds(2).size).toBe(0)
        })

        it('returns empty set for non-existent field', () => {
            const engine = new FormEngine(baseDef([{ id: 1, type: 'string', label: 'A' }]))
            expect(engine.getAffectedIds(999).size).toBe(0)
        })

        it('returns same instance on repeated calls (cached)', () => {
            const engine = new FormEngine(
                baseDef([
                    { id: 1, type: 'string', label: 'A' },
                    {
                        id: 2,
                        type: 'string',
                        label: 'B',
                        condition: { field: 1, op: 'set' },
                    },
                ]),
            )
            const a = engine.getAffectedIds(1)
            const b = engine.getAffectedIds(1)
            expect(a).toBe(b) // same reference
        })

        it('handles multiple fields depending on the same source', () => {
            const engine = new FormEngine(
                baseDef([
                    { id: 1, type: 'string', label: 'Ctrl' },
                    { id: 2, type: 'string', label: 'D1', condition: { field: 1, op: 'set' } },
                    { id: 3, type: 'string', label: 'D2', condition: { field: 1, op: 'eq', value: 'x' } },
                    { id: 4, type: 'string', label: 'D3', condition: { field: 1, op: 'ne', value: 'y' } },
                ]),
            )
            const affected = engine.getAffectedIds(1)
            expect(affected).toEqual(new Set([2, 3, 4]))
        })
    })

    describe('validate: hidden fields skipped', () => {
        it('hidden required field produces no error', () => {
            const engine = new FormEngine(
                baseDef([
                    { id: 1, type: 'boolean', label: 'Toggle' },
                    {
                        id: 2,
                        type: 'string',
                        label: 'Name',
                        validation: { required: true },
                        condition: { field: 1, op: 'eq', value: true },
                    },
                ]),
            )
            // field 2 is hidden (field 1 is not true) → no validation errors
            const result = engine.validate(doc({ '1': false }))
            expect(result.valid).toBe(true)
        })

        it('hidden field with invalid value produces no error', () => {
            const engine = new FormEngine(
                baseDef([
                    { id: 1, type: 'boolean', label: 'Toggle' },
                    {
                        id: 2,
                        type: 'number',
                        label: 'Amount',
                        validation: { min: 0, max: 100 },
                        condition: { field: 1, op: 'eq', value: true },
                    },
                ]),
            )
            // field 2 is hidden, value is out of range → no error
            const result = engine.validate(doc({ '1': false, '2': 999 }))
            expect(result.valid).toBe(true)
        })

        it('field inside hidden section produces no error', () => {
            const engine = new FormEngine(
                baseDef([
                    { id: 1, type: 'boolean', label: 'Toggle' },
                    {
                        id: 10,
                        type: 'section',
                        title: 'S',
                        condition: { field: 1, op: 'eq', value: true },
                        content: [
                            {
                                id: 2,
                                type: 'string',
                                label: 'Name',
                                validation: { required: true },
                            },
                        ],
                    },
                ]),
            )
            const result = engine.validate(doc({ '1': false }))
            expect(result.valid).toBe(true)
        })

        it('same field validates when visible', () => {
            const engine = new FormEngine(
                baseDef([
                    { id: 1, type: 'boolean', label: 'Toggle' },
                    {
                        id: 2,
                        type: 'string',
                        label: 'Name',
                        validation: { required: true },
                        condition: { field: 1, op: 'eq', value: true },
                    },
                ]),
            )
            // field 2 is visible, but value is missing → required error
            const result = engine.validate(doc({ '1': true }))
            expect(result.valid).toBe(false)
            expect(result.fieldErrors.has(2)).toBe(true)
            expect(result.fieldErrors.get(2)?.[0]?.rule).toBe('REQUIRED')
        })
    })

    describe('validate: sections not validated', () => {
        it('rejects section with empty content at schema level', () => {
            expect(
                () => new FormEngine(baseDef([{ id: 1, type: 'section', title: 'Empty Section', content: [] }])),
            ).toThrow(DocumentError)
        })

        it('section id in values is ignored', () => {
            const engine = new FormEngine(
                baseDef([
                    {
                        id: 10,
                        type: 'section',
                        title: 'S',
                        content: [{ id: 1, type: 'string', label: 'A' }],
                    },
                ]),
            )
            // Providing a value keyed by section id should have no effect
            expect(engine.validate(doc({ '10': 'garbage', '1': 'valid' })).valid).toBe(true)
        })
    })

    describe('validate: fields without validation rules', () => {
        it('field with no validation accepts any value', () => {
            const engine = new FormEngine(baseDef([{ id: 1, type: 'string', label: 'A' }]))
            expect(engine.validate(doc({ '1': 'anything' })).valid).toBe(true)
            expect(engine.validate(doc({})).valid).toBe(true)
        })

        it('number field with no validation accepts any number', () => {
            const engine = new FormEngine(baseDef([{ id: 1, type: 'number', label: 'N' }]))
            expect(engine.validate(doc({ '1': -999999 })).valid).toBe(true)
        })
    })

    describe('validate: error aggregation', () => {
        it('aggregates errors from multiple fields', () => {
            const engine = new FormEngine(
                baseDef([
                    { id: 1, type: 'string', label: 'Name', validation: { required: true } },
                    { id: 2, type: 'number', label: 'Age', validation: { required: true } },
                    { id: 3, type: 'boolean', label: 'Active', validation: { required: true } },
                ]),
            )
            const result = engine.validate(doc({}))
            expect(result.valid).toBe(false)
            expect(result.fieldErrors.size).toBe(3)
            const fieldIds = [...result.fieldErrors.keys()].sort()
            expect(fieldIds).toEqual([1, 2, 3])
        })

        it('partial errors: some fields valid, some invalid', () => {
            const engine = new FormEngine(
                baseDef([
                    { id: 1, type: 'string', label: 'Name', validation: { required: true } },
                    { id: 2, type: 'number', label: 'Age', validation: { required: true } },
                ]),
            )
            const result = engine.validate(doc({ '1': 'Alice' }))
            expect(result.valid).toBe(false)
            expect(result.fieldErrors.size).toBe(1)
            expect(result.fieldErrors.has(2)).toBe(true)
        })
    })

    describe('validate: submittedAt as reference date', () => {
        it('submittedAt affects relative date resolution', () => {
            const engine = new FormEngine(
                baseDef([{ id: 1, type: 'date', label: 'D', validation: { minDate: '-7d', maxDate: '+7d' } }]),
            )
            // With SUBMITTED_AT = 2025-06-15, range is [2025-06-08, 2025-06-22]
            expect(engine.validate(doc({ '1': '2025-06-15' }, SUBMITTED_AT)).valid).toBe(true)
            expect(engine.validate(doc({ '1': '2025-06-01' }, SUBMITTED_AT)).valid).toBe(false)
            expect(engine.validate(doc({ '1': '2025-06-30' }, SUBMITTED_AT)).valid).toBe(false)
        })
    })

    describe('end-to-end realistic form', () => {
        // A "job application" form with conditional sections
        const jobApplicationForm: FormDefinition = {
            id: 'job-application',
            version: '1.0.0',
            title: 'Job Application',
            content: [
                {
                    id: 1,
                    type: 'string',
                    label: 'Full Name',
                    validation: { required: true, minLength: 2, maxLength: 100 },
                },
                {
                    id: 2,
                    type: 'string',
                    label: 'Email',
                    validation: { required: true, pattern: '^[^@]+@[^@]+$', patternMessage: 'Invalid email' },
                },
                {
                    id: 3,
                    type: 'number',
                    label: 'Years of Experience',
                    validation: { required: true, min: 0, max: 50 },
                },
                {
                    id: 4,
                    type: 'select',
                    label: 'Position',
                    options: [
                        { value: 'dev', label: 'Developer' },
                        { value: 'design', label: 'Designer' },
                        { value: 'pm', label: 'Project Manager' },
                    ],
                    validation: { required: true },
                },
                // Conditional section: only shown for "dev" position
                {
                    id: 100,
                    type: 'section',
                    title: 'Developer Details',
                    condition: { field: 4, op: 'eq', value: 'dev' },
                    content: [
                        {
                            id: 5,
                            type: 'array',
                            label: 'Programming Languages',
                            item: { type: 'string', label: 'Language', validation: { minLength: 1 } },
                            validation: { minItems: 1, maxItems: 10 },
                        },
                        {
                            id: 6,
                            type: 'boolean',
                            label: 'Open Source Contributor',
                        },
                        // Show GitHub profile only if open source contributor
                        {
                            id: 7,
                            type: 'string',
                            label: 'GitHub Profile',
                            validation: { required: true, pattern: '^https://github\\.com/.+' },
                            condition: { field: 6, op: 'eq', value: true },
                        },
                    ],
                },
                // Conditional section: shown for senior applicants (>= 5 years)
                {
                    id: 200,
                    type: 'section',
                    title: 'Senior Details',
                    condition: { field: 3, op: 'gte', value: 5 },
                    content: [
                        {
                            id: 8,
                            type: 'date',
                            label: 'Available From',
                            validation: { required: true, minDate: '+0d' },
                        },
                        { id: 9, type: 'string', label: 'Leadership Experience' },
                    ],
                },
            ],
        }

        const jobDoc = (values: FormValues = {}, submittedAt: string = SUBMITTED_AT): FormDocument => ({
            form: { id: 'job-application', version: '1.0.0', submittedAt },
            values,
        })

        let engine: FormEngine

        beforeEach(() => {
            engine = new FormEngine(jobApplicationForm)
        })

        it('has correct content order', () => {
            expect(engine.contentOrder).toEqual([1, 2, 3, 4, 100, 5, 6, 7, 200, 8, 9])
        })

        it('valid application for a developer', () => {
            const values: FormValues = {
                '1': 'John Doe',
                '2': 'john@example.com',
                '3': 3,
                '4': 'dev',
                '5': ['TypeScript', 'Rust'],
                '6': true,
                '7': 'https://github.com/johndoe',
            }
            const result = engine.validate(jobDoc(values, SUBMITTED_AT))
            expect(result.valid).toBe(true)
        })

        it('developer without programming languages fails', () => {
            const values: FormValues = {
                '1': 'John Doe',
                '2': 'john@example.com',
                '3': 3,
                '4': 'dev',
                '5': [],
                '6': false,
            }
            const result = engine.validate(jobDoc(values, SUBMITTED_AT))
            expect(result.valid).toBe(false)
            expect(result.fieldErrors.get(5)?.some((e) => e.rule === 'MIN_ITEMS')).toBe(true)
        })

        it('developer with OSS contribution but no GitHub profile fails', () => {
            const values: FormValues = {
                '1': 'John Doe',
                '2': 'john@example.com',
                '3': 3,
                '4': 'dev',
                '5': ['Go'],
                '6': true,
                // '7' missing
            }
            const result = engine.validate(jobDoc(values, SUBMITTED_AT))
            expect(result.valid).toBe(false)
            expect(result.fieldErrors.get(7)?.some((e) => e.rule === 'REQUIRED')).toBe(true)
        })

        it('designer does not need developer details — hidden fields skipped', () => {
            const values: FormValues = {
                '1': 'Jane Doe',
                '2': 'jane@example.com',
                '3': 2,
                '4': 'design',
            }
            const result = engine.validate(jobDoc(values, SUBMITTED_AT))
            expect(result.valid).toBe(true)
            // Developer section fields should be hidden
            const vis = engine.getVisibilityMap(jobDoc(values))
            expect(vis.get(100)).toBe(false) // section
            expect(vis.get(5)).toBe(false) // array inside section
            expect(vis.get(7)).toBe(false) // nested conditional
        })

        it('senior applicant sees senior section', () => {
            const values: FormValues = {
                '1': 'Senior Dev',
                '2': 'senior@example.com',
                '3': 10,
                '4': 'pm',
            }
            const vis = engine.getVisibilityMap(jobDoc(values))
            expect(vis.get(200)).toBe(true)
            expect(vis.get(8)).toBe(true)
            expect(vis.get(9)).toBe(true)
        })

        it('junior applicant does not see senior section', () => {
            const values: FormValues = {
                '1': 'Junior Dev',
                '2': 'junior@example.com',
                '3': 2,
                '4': 'dev',
            }
            const vis = engine.getVisibilityMap(jobDoc(values))
            expect(vis.get(200)).toBe(false)
            expect(vis.get(8)).toBe(false)
        })

        it('invalid email produces pattern error', () => {
            const values: FormValues = {
                '1': 'Name',
                '2': 'not-an-email',
                '3': 1,
                '4': 'pm',
            }
            const result = engine.validate(jobDoc(values, SUBMITTED_AT))
            expect(result.valid).toBe(false)
            const emailErr = result.fieldErrors.get(2)?.[0]
            expect(emailErr?.rule).toBe('PATTERN')
            expect(emailErr?.message).toBe('Invalid email')
        })

        it('getAffectedIds for position field includes developer section', () => {
            const affected = engine.getAffectedIds(4)
            expect(affected.has(100)).toBe(true)
        })

        it('getAffectedIds for experience field includes senior section', () => {
            const affected = engine.getAffectedIds(3)
            expect(affected.has(200)).toBe(true)
        })

        it('changing toggle value from dev to design changes visibility map', () => {
            const devValues: FormValues = { '1': 'Name', '2': 'a@b', '3': 2, '4': 'dev' }
            const designValues: FormValues = { '1': 'Name', '2': 'a@b', '3': 2, '4': 'design' }

            const devVis = engine.getVisibilityMap(jobDoc(devValues))
            const designVis = engine.getVisibilityMap(jobDoc(designValues))

            expect(devVis.get(100)).toBe(true)
            expect(designVis.get(100)).toBe(false)
        })
    })

    describe('edge cases', () => {
        it('extra values not in schema are ignored', () => {
            const engine = new FormEngine(
                baseDef([{ id: 1, type: 'string', label: 'A', validation: { required: true } }]),
            )
            const result = engine.validate(doc({ '1': 'ok', '999': 'extra', foo: 'bar' }))
            expect(result.valid).toBe(true)
        })

        it('field with validation but no value and not required → valid', () => {
            const engine = new FormEngine(
                baseDef([
                    { id: 1, type: 'string', label: 'A', validation: { minLength: 5, pattern: '^x' } },
                    { id: 2, type: 'number', label: 'B', validation: { min: 10 } },
                    { id: 3, type: 'date', label: 'C', validation: { minDate: '2025-01-01T00:00:00.000Z' } },
                ]),
            )
            expect(engine.validate(doc({})).valid).toBe(true)
        })

        it('condition referencing a field in a different section works', () => {
            const engine = new FormEngine(
                baseDef([
                    {
                        id: 10,
                        type: 'section',
                        title: 'Section A',
                        content: [{ id: 1, type: 'string', label: 'Control Field' }],
                    },
                    {
                        id: 20,
                        type: 'section',
                        title: 'Section B',
                        content: [
                            {
                                id: 2,
                                type: 'string',
                                label: 'Dependent',
                                condition: { field: 1, op: 'eq', value: 'show' },
                            },
                        ],
                    },
                ]),
            )
            expect(engine.isVisible(2, doc({ '1': 'show' }))).toBe(true)
            expect(engine.isVisible(2, doc({ '1': 'hide' }))).toBe(false)
        })

        it('multiple fields depending on the same control field', () => {
            const engine = new FormEngine(
                baseDef([
                    { id: 1, type: 'number', label: 'Score' },
                    { id: 2, type: 'string', label: 'Low', condition: { field: 1, op: 'lt', value: 50 } },
                    { id: 3, type: 'string', label: 'High', condition: { field: 1, op: 'gte', value: 50 } },
                ]),
            )
            const lowMap = engine.getVisibilityMap(doc({ '1': 30 }))
            expect(lowMap.get(2)).toBe(true)
            expect(lowMap.get(3)).toBe(false)

            const highMap = engine.getVisibilityMap(doc({ '1': 75 }))
            expect(highMap.get(2)).toBe(false)
            expect(highMap.get(3)).toBe(true)

            // At boundary
            const boundaryMap = engine.getVisibilityMap(doc({ '1': 50 }))
            expect(boundaryMap.get(2)).toBe(false) // not < 50
            expect(boundaryMap.get(3)).toBe(true) // >= 50
        })

        it('condition with eq on boolean value', () => {
            const engine = new FormEngine(
                baseDef([
                    { id: 1, type: 'boolean', label: 'Toggle' },
                    {
                        id: 2,
                        type: 'string',
                        label: 'S',
                        condition: { field: 1, op: 'eq', value: true },
                    },
                ]),
            )
            expect(engine.isVisible(2, doc({ '1': true }))).toBe(true)
            expect(engine.isVisible(2, doc({ '1': false }))).toBe(false)
            expect(engine.isVisible(2, doc({}))).toBe(false)
        })

        it('condition with in operator and numeric values', () => {
            const engine = new FormEngine(
                baseDef([
                    { id: 1, type: 'number', label: 'Status' },
                    {
                        id: 2,
                        type: 'string',
                        label: 'Active',
                        condition: { field: 1, op: 'in', value: [1, 2, 3] },
                    },
                ]),
            )
            expect(engine.isVisible(2, doc({ '1': 2 }))).toBe(true)
            expect(engine.isVisible(2, doc({ '1': 5 }))).toBe(false)
        })

        it('validate with only sections (containing fields) returns valid', () => {
            const engine = new FormEngine(
                baseDef([
                    { id: 1, type: 'section', title: 'A', content: [{ id: 3, type: 'string', label: 'X' }] },
                    { id: 2, type: 'section', title: 'B', content: [{ id: 4, type: 'string', label: 'Y' }] },
                ]),
            )
            expect(engine.validate(doc({})).valid).toBe(true)
        })

        it('date string comparison in conditions (gt/lt)', () => {
            const engine = new FormEngine(
                baseDef([
                    { id: 1, type: 'date', label: 'D' },
                    {
                        id: 2,
                        type: 'string',
                        label: 'After',
                        condition: { field: 1, op: 'gt', value: '2025-06-15' },
                    },
                ]),
            )
            expect(engine.isVisible(2, doc({ '1': '2025-07-01' }))).toBe(true)
            expect(engine.isVisible(2, doc({ '1': '2025-06-01' }))).toBe(false)
        })

        it('condition on self is treated as circular dependency', () => {
            expect(
                () =>
                    new FormEngine(
                        baseDef([
                            {
                                id: 1,
                                type: 'string',
                                label: 'A',
                                condition: { field: 1, op: 'set' },
                            },
                        ]),
                    ),
            ).toThrow(DocumentError)
        })

        it('deeply nested compound condition', () => {
            const engine = new FormEngine(
                baseDef([
                    { id: 1, type: 'string', label: 'A' },
                    { id: 2, type: 'number', label: 'B' },
                    { id: 3, type: 'boolean', label: 'C' },
                    {
                        id: 4,
                        type: 'string',
                        label: 'Result',
                        condition: {
                            and: [
                                {
                                    or: [
                                        { field: 1, op: 'eq', value: 'x' },
                                        { field: 1, op: 'eq', value: 'y' },
                                    ],
                                },
                                { field: 2, op: 'gte', value: 10 },
                                { field: 3, op: 'eq', value: true },
                            ],
                        },
                    },
                ]),
            )
            // All conditions met
            expect(engine.isVisible(4, doc({ '1': 'x', '2': 15, '3': true }))).toBe(true)
            expect(engine.isVisible(4, doc({ '1': 'y', '2': 10, '3': true }))).toBe(true)
            // One fails
            expect(engine.isVisible(4, doc({ '1': 'z', '2': 15, '3': true }))).toBe(false)
            expect(engine.isVisible(4, doc({ '1': 'x', '2': 5, '3': true }))).toBe(false)
            expect(engine.isVisible(4, doc({ '1': 'x', '2': 15, '3': false }))).toBe(false)
        })
    })

    describe('visibility', () => {
        it('toggling visibility changes which fields get validated', () => {
            const engine = new FormEngine(
                baseDef([
                    {
                        id: 1,
                        type: 'select',
                        label: 'Type',
                        options: [
                            { value: 'personal', label: 'Personal' },
                            { value: 'business', label: 'Business' },
                        ],
                        validation: { required: true },
                    },
                    {
                        id: 2,
                        type: 'string',
                        label: 'Company Name',
                        validation: { required: true, minLength: 2 },
                        condition: { field: 1, op: 'eq', value: 'business' },
                    },
                    {
                        id: 3,
                        type: 'string',
                        label: 'Personal Name',
                        validation: { required: true, minLength: 2 },
                        condition: { field: 1, op: 'eq', value: 'personal' },
                    },
                ]),
            )

            // Business selected: company name required, personal name hidden
            const biz = engine.validate(doc({ '1': 'business', '2': 'Acme Corp' }))
            expect(biz.valid).toBe(true)

            const bizMissing = engine.validate(doc({ '1': 'business' }))
            expect(bizMissing.valid).toBe(false)
            expect(bizMissing.fieldErrors.size).toBe(1)
            expect(bizMissing.fieldErrors.has(2)).toBe(true)

            // Personal selected: personal name required, company name hidden
            const personal = engine.validate(doc({ '1': 'personal', '3': 'John' }))
            expect(personal.valid).toBe(true)

            const personalMissing = engine.validate(doc({ '1': 'personal' }))
            expect(personalMissing.valid).toBe(false)
            expect(personalMissing.fieldErrors.has(3)).toBe(true)
        })

        it('cascading hide: parent condition hides children for validation', () => {
            const engine = new FormEngine(
                baseDef([
                    { id: 1, type: 'boolean', label: 'Show Details' },
                    {
                        id: 10,
                        type: 'section',
                        title: 'Details',
                        condition: { field: 1, op: 'eq', value: true },
                        content: [
                            { id: 2, type: 'string', label: 'Detail 1', validation: { required: true } },
                            { id: 3, type: 'string', label: 'Detail 2', validation: { required: true } },
                        ],
                    },
                ]),
            )

            // Section hidden → children not validated
            expect(engine.validate(doc({ '1': false })).valid).toBe(true)

            // Section shown → children validated
            const result = engine.validate(doc({ '1': true }))
            expect(result.valid).toBe(false)
            expect(result.fieldErrors.size).toBe(2)
        })

        it('multi-level conditional: grandchild visibility affects validation', () => {
            // Field 1 → section 100 → field 2 (OSS contributor) → field 3 (GitHub)
            const engine = new FormEngine(
                baseDef([
                    { id: 1, type: 'boolean', label: 'Is Dev' },
                    {
                        id: 100,
                        type: 'section',
                        title: 'Dev Info',
                        condition: { field: 1, op: 'eq', value: true },
                        content: [
                            { id: 2, type: 'boolean', label: 'OSS' },
                            {
                                id: 3,
                                type: 'string',
                                label: 'GitHub',
                                validation: { required: true },
                                condition: { field: 2, op: 'eq', value: true },
                            },
                        ],
                    },
                ]),
            )

            // Not a dev → everything hidden → valid
            expect(engine.validate(doc({ '1': false })).valid).toBe(true)

            // Dev, not OSS → field 3 hidden → valid
            expect(engine.validate(doc({ '1': true, '2': false })).valid).toBe(true)

            // Dev, OSS, no GitHub → field 3 visible + required → error
            const result = engine.validate(doc({ '1': true, '2': true }))
            expect(result.valid).toBe(false)
            expect(result.fieldErrors.has(3)).toBe(true)

            // Dev, OSS, with GitHub → valid
            expect(engine.validate(doc({ '1': true, '2': true, '3': 'https://github.com/user' })).valid).toBe(true)
        })
    })

    describe('form document compatibility', () => {
        const engine = new FormEngine(
            baseDef([
                { id: 1, type: 'string', label: 'Name', validation: { required: true } },
                { id: 2, type: 'number', label: 'Age' },
            ]),
        )

        // ── validate() checks ──

        it('mismatched form.id → documentErrors contains FORM_ID_MISMATCH, valid: false', () => {
            const d: FormDocument = {
                form: { id: 'wrong-id', version: '1.0.0', submittedAt: SUBMITTED_AT },
                values: { '1': 'Alice' },
            }
            const result = engine.validate(d)
            expect(result.valid).toBe(false)
            expect(result.documentErrors).toBeDefined()
            expect(result.documentErrors?.length).toBe(1)
            expect(result.documentErrors?.[0]?.code).toBe('FORM_ID_MISMATCH')
        })

        it('mismatched form.version → documentErrors contains FORM_VERSION_MISMATCH, valid: false', () => {
            const d: FormDocument = {
                form: { id: 'test-form', version: '9.9.9', submittedAt: SUBMITTED_AT },
                values: { '1': 'Alice' },
            }
            const result = engine.validate(d)
            expect(result.valid).toBe(false)
            expect(result.documentErrors).toBeDefined()
            expect(result.documentErrors?.length).toBe(1)
            expect(result.documentErrors?.[0]?.code).toBe('FORM_VERSION_MISMATCH')
        })

        it('both id and version mismatched → documentErrors has 2 entries', () => {
            const d: FormDocument = {
                form: { id: 'wrong-id', version: '9.9.9', submittedAt: SUBMITTED_AT },
                values: { '1': 'Alice' },
            }
            const result = engine.validate(d)
            expect(result.valid).toBe(false)
            expect(result.documentErrors).toBeDefined()
            expect(result.documentErrors?.length).toBe(2)
            const rules = result.documentErrors?.map((e) => e.code)
            expect(rules).toContain('FORM_ID_MISMATCH')
            expect(rules).toContain('FORM_VERSION_MISMATCH')
        })

        it('matching id and version → no documentErrors', () => {
            const result = engine.validate(doc({ '1': 'Alice' }))
            expect(result.valid).toBe(true)
            expect(result.documentErrors).toBeUndefined()
        })

        it('field errors still returned alongside document errors', () => {
            const d: FormDocument = {
                form: { id: 'wrong-id', version: '1.0.0', submittedAt: SUBMITTED_AT },
                values: {},
            }
            const result = engine.validate(d)
            expect(result.valid).toBe(false)
            // document error present
            expect(result.documentErrors).toBeDefined()
            expect(result.documentErrors?.some((e) => e.code === 'FORM_ID_MISMATCH')).toBe(true)
            // field error present (required field 1 is missing)
            expect(result.fieldErrors.size).toBeGreaterThanOrEqual(1)
            expect(result.fieldErrors.get(1)?.some((e) => e.rule === 'REQUIRED')).toBe(true)
        })

        it('createFormDocument() produces documents that pass without document errors', () => {
            const d = engine.createFormDocument({ '1': 'Alice' })
            const result = engine.validate(d)
            expect(result.valid).toBe(true)
            expect(result.documentErrors).toBeUndefined()
        })

        it('error params contain expected and actual values for id mismatch', () => {
            const d: FormDocument = {
                form: { id: 'other-form', version: '1.0.0', submittedAt: SUBMITTED_AT },
                values: { '1': 'Alice' },
            }
            const result = engine.validate(d)
            const err = result.documentErrors?.find((e) => e.code === 'FORM_ID_MISMATCH')
            expect(err?.params).toBeDefined()
            expect(err?.params?.expected).toBe('test-form')
            expect(err?.params?.actual).toBe('other-form')
        })

        it('error params contain expected and actual values for version mismatch', () => {
            const d: FormDocument = {
                form: { id: 'test-form', version: '2.0.0', submittedAt: SUBMITTED_AT },
                values: { '1': 'Alice' },
            }
            const result = engine.validate(d)
            const err = result.documentErrors?.find((e) => e.code === 'FORM_VERSION_MISMATCH')
            expect(err?.params).toBeDefined()
            expect(err?.params?.expected).toBe('1.0.0')
            expect(err?.params?.actual).toBe('2.0.0')
        })

        it('mismatched id with matching version → only FORM_ID_MISMATCH', () => {
            const d: FormDocument = {
                form: { id: 'wrong-id', version: '1.0.0', submittedAt: SUBMITTED_AT },
                values: { '1': 'Alice' },
            }
            const result = engine.validate(d)
            expect(result.documentErrors?.length).toBe(1)
            expect(result.documentErrors?.[0]?.code).toBe('FORM_ID_MISMATCH')
        })

        it('mismatched version with matching id → only FORM_VERSION_MISMATCH', () => {
            const d: FormDocument = {
                form: { id: 'test-form', version: '3.0.0', submittedAt: SUBMITTED_AT },
                values: { '1': 'Alice' },
            }
            const result = engine.validate(d)
            expect(result.documentErrors?.length).toBe(1)
            expect(result.documentErrors?.[0]?.code).toBe('FORM_VERSION_MISMATCH')
        })
    })

    describe('submittedAt', () => {
        it('submittedAt is parsed and used as now for relative date validation', () => {
            const engine = new FormEngine(
                baseDef([{ id: 1, type: 'date', label: 'D', validation: { minDate: '-7d', maxDate: '+7d' } }]),
            )
            // submittedAt = 2025-06-15 → range is [2025-06-08, 2025-06-22]
            expect(engine.validate(doc({ '1': '2025-06-15' }, SUBMITTED_AT)).valid).toBe(true)
            expect(engine.validate(doc({ '1': '2025-06-01' }, SUBMITTED_AT)).valid).toBe(false)
            expect(engine.validate(doc({ '1': '2025-06-30' }, SUBMITTED_AT)).valid).toBe(false)
        })

        it('malformed submittedAt falls back gracefully and produces FORM_SUBMITTED_AT_INVALID', () => {
            const engine = new FormEngine(
                baseDef([{ id: 1, type: 'date', label: 'D', validation: { minDate: '-9999d', maxDate: '+9999d' } }]),
            )
            // Malformed submittedAt → falls back to new Date(), but produces document error
            const result = engine.validate(doc({ '1': '2025-06-15' }, 'not-a-date'))
            expect(result.valid).toBe(false)
            expect(result.documentErrors).toBeDefined()
            expect(result.documentErrors?.some((e) => e.code === 'FORM_SUBMITTED_AT_INVALID')).toBe(true)
        })

        it('createFormDocument() includes submittedAt', () => {
            const engine = new FormEngine(baseDef([{ id: 1, type: 'string', label: 'A' }]))
            const before = new Date().toISOString()
            const d = engine.createFormDocument({ '1': 'hello' })
            const after = new Date().toISOString()

            expect(d.form.submittedAt).toBeDefined()
            expect(typeof d.form.submittedAt).toBe('string')
            // submittedAt should be between before and after timestamps
            expect(d.form.submittedAt >= before).toBe(true)
            expect(d.form.submittedAt <= after).toBe(true)
        })

        it('missing submittedAt produces FORM_SUBMITTED_AT_MISSING document error', () => {
            const engine = new FormEngine(baseDef([{ id: 1, type: 'string', label: 'A' }]))
            const d = {
                form: { id: 'test-form', version: '1.0.0', submittedAt: '' },
                values: { '1': 'hello' },
            } as FormDocument
            const result = engine.validate(d)
            expect(result.valid).toBe(false)
            expect(result.documentErrors).toBeDefined()
            expect(result.documentErrors?.some((e) => e.code === 'FORM_SUBMITTED_AT_MISSING')).toBe(true)
        })

        it('invalid submittedAt produces FORM_SUBMITTED_AT_INVALID document error', () => {
            const engine = new FormEngine(baseDef([{ id: 1, type: 'string', label: 'A' }]))
            const d: FormDocument = {
                form: { id: 'test-form', version: '1.0.0', submittedAt: 'garbage-date' },
                values: { '1': 'hello' },
            }
            const result = engine.validate(d)
            expect(result.valid).toBe(false)
            expect(result.documentErrors).toBeDefined()
            expect(result.documentErrors?.some((e) => e.code === 'FORM_SUBMITTED_AT_INVALID')).toBe(true)
            const err = result.documentErrors?.find((e) => e.code === 'FORM_SUBMITTED_AT_INVALID')
            expect(err?.params).toBeDefined()
            expect(err?.params?.actual).toBe('garbage-date')
        })
    })

    describe('dumpDocument / loadDocument', () => {
        const definition = baseDef([
            { id: 1, type: 'string', label: 'Name' },
            { id: 2, type: 'number', label: 'Age' },
            { id: 3, type: 'boolean', label: 'Active' },
            { id: 4, type: 'date', label: 'DOB' },
            {
                id: 5,
                type: 'select',
                label: 'Color',
                options: [
                    { value: 'r', label: 'Red' },
                    { value: 'g', label: 'Green' },
                ],
            },
        ])

        it('dumpDocument() returns snapshot with definition and document', () => {
            const engine = new FormEngine(definition)
            const d = doc({ '1': 'Alice' })
            const snapshot = engine.dumpDocument(d)

            expect(snapshot.definition).toEqual(definition)
            expect(snapshot.document).toEqual(d)
        })

        it('dumpDocument() → loadDocument()', () => {
            const engine = new FormEngine(definition)
            const d = doc({ '1': 'Bob', '2': 42 })
            const snapshot = engine.dumpDocument(d)
            const loaded = engine.loadDocument(snapshot)

            expect(loaded).toEqual(d)
        })

        it('loadDocument() succeeds with matching id and version', () => {
            const engine = new FormEngine(definition)
            const d = doc({ '1': 'Charlie' })
            const snapshot: FormSnapshot = { definition, document: d }

            expect(() => engine.loadDocument(snapshot)).not.toThrow()
            const loaded = engine.loadDocument(snapshot)
            const result = engine.validate(loaded)
            expect(result.valid).toBe(true)
        })

        it('loadDocument() throws on definition id mismatch', () => {
            const engine = new FormEngine(definition)
            const d = doc({ '1': 'Dave' })
            const mismatchedDef = { ...definition, id: 'wrong-id' }
            const snapshot: FormSnapshot = { definition: mismatchedDef, document: d }

            expect(() => engine.loadDocument(snapshot)).toThrow(DocumentError)
            try {
                engine.loadDocument(snapshot)
            } catch (e) {
                expect(e).toBeInstanceOf(DocumentError)
                const err = e as DocumentError
                expect(err.errors.some((e) => e.code === 'FORM_ID_MISMATCH')).toBe(true)
            }
        })

        it('loadDocument() throws on definition version mismatch', () => {
            const engine = new FormEngine(definition)
            const d = doc({ '1': 'Eve' })
            const mismatchedDef = { ...definition, version: '9.9.9' }
            const snapshot: FormSnapshot = { definition: mismatchedDef, document: d }

            expect(() => engine.loadDocument(snapshot)).toThrow(DocumentError)
            try {
                engine.loadDocument(snapshot)
            } catch (e) {
                expect(e).toBeInstanceOf(DocumentError)
                const err = e as DocumentError
                expect(err.errors.some((e) => e.code === 'FORM_VERSION_MISMATCH')).toBe(true)
            }
        })

        it('loadDocument() preserves all field values', () => {
            const engine = new FormEngine(definition)
            const values: FormValues = {
                '1': 'Frank',
                '2': 99,
                '3': true,
                '4': '1990-01-15',
                '5': 'r',
            }
            const d = doc(values)
            const snapshot = engine.dumpDocument(d)
            const loaded = engine.loadDocument(snapshot)

            expect(loaded.values).toEqual(values)
            expect(loaded.values['1']).toBe('Frank')
            expect(loaded.values['2']).toBe(99)
            expect(loaded.values['3']).toBe(true)
            expect(loaded.values['4']).toBe('1990-01-15')
            expect(loaded.values['5']).toBe('r')
        })
    })
})
