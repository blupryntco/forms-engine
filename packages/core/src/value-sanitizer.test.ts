import { FormEngine } from './form-engine'
import type { ContentItem, FormDefinition } from './types/form-definition'
import type { FormDocument, FormValues } from './types/form-values'
import type { FormSuggestions } from './types/suggestion'

const baseDef = (content: ContentItem[]): FormDefinition => ({
    id: 'test-form',
    version: '1.0.0',
    title: 'Test Form',
    content,
})

const SUBMITTED_AT = '2025-06-15T00:00:00.000Z'

const doc = (values: FormValues, suggestions?: FormSuggestions): FormDocument => ({
    form: { id: 'test-form', version: '1.0.0', submittedAt: SUBMITTED_AT },
    values,
    ...(suggestions ? { suggestions } : {}),
})

// 1 toggles 2 and section 10; 3 is static; 20 is an array_obj with value
// sub-field 21 and static sub-field 22.
const def = baseDef([
    { id: 1, type: 'boolean', label: 'Show' },
    { id: 2, type: 'string', label: 'Details', condition: { field: 1, op: 'eq', value: true } },
    { id: 3, type: 'static', text: 'Note' },
    {
        id: 10,
        type: 'section',
        title: 'Extra',
        condition: { field: 1, op: 'eq', value: true },
        content: [{ id: 11, type: 'string', label: 'Inner' }],
    },
    {
        id: 20,
        type: 'array_obj',
        label: 'Rows',
        items: [
            { id: 21, type: 'string', label: 'Name' },
            { id: 22, type: 'static', text: 'Caption' },
        ],
    },
])

const engine = new FormEngine(def)

describe('FormEngine.sanitize', () => {
    it('drops unknown and non-numeric keys', () => {
        const result = engine.sanitize(doc({ '1': false, '99': 'x', foo: 'y', '01': 'z' }))
        expect(result.values).toEqual({ '1': false })
    })

    it('drops values on section and static ids', () => {
        const result = engine.sanitize(doc({ '1': true, '2': 'a', '3': 'x', '10': 'y', '11': 'b' }))
        expect(result.values).toEqual({ '1': true, '2': 'a', '11': 'b' })
    })

    it('drops hidden field values, including fields inside a hidden section', () => {
        const result = engine.sanitize(doc({ '1': false, '2': 'a', '11': 'b' }))
        expect(result.values).toEqual({ '1': false })
    })

    it('drops a top-level value keyed by an array_obj sub-field id', () => {
        expect(engine.sanitize(doc({ '21': 'x' })).values).toEqual({})
    })

    it('drops undeclared and static keys from array_obj rows', () => {
        const result = engine.sanitize(doc({ '20': [{ '21': 'Jane', '22': 'x', extra: 1 }, {}] }))
        expect(result.values).toEqual({ '20': [{ '21': 'Jane' }, {}] })
    })

    it('keeps values of the wrong type for validate to report', () => {
        expect(engine.sanitize(doc({ '20': 'not-an-array' })).values).toEqual({ '20': 'not-an-array' })
        expect(engine.sanitize(doc({ '20': ['row', null] })).values).toEqual({ '20': ['row', null] })
    })

    it('resolves visibility against options.now, not submittedAt', () => {
        const dateDef = baseDef([
            { id: 1, type: 'date', label: 'Deadline' },
            { id: 2, type: 'string', label: 'Late', condition: { field: 1, op: 'lt', value: '+0d' } },
        ])
        const dateEngine = new FormEngine(dateDef)
        const d = doc({ '1': '2026-01-10', '2': 'reason' })

        expect(dateEngine.sanitize(d).values).toEqual({ '1': '2026-01-10' })
        expect(dateEngine.sanitize(d, { now: new Date('2026-02-01T00:00:00Z') }).values).toEqual(d.values)
    })

    it('cleans suggestions by the same rules', () => {
        const result = engine.sanitize(
            doc(
                { '1': false },
                {
                    '1': { value: true, confidence: 1, source: 's' },
                    '2': { value: 'hidden', confidence: 1, source: 's' },
                    '3': { value: 'static', confidence: 1, source: 's' },
                    '99': { value: 'unknown', confidence: 1, source: 's' },
                    '20': { value: [{ '21': 'Jane', extra: 1 }], confidence: 1, source: 's' },
                },
            ),
        )
        expect(result.suggestions).toEqual({
            '1': { value: true, confidence: 1, source: 's' },
            '20': { value: [{ '21': 'Jane' }], confidence: 1, source: 's' },
        })
    })

    it('drops the suggestions key when nothing is left', () => {
        const result = engine.sanitize(doc({}, { '99': { value: 'x', confidence: 1, source: 's' } }))
        expect(result).not.toHaveProperty('suggestions')
    })

    it('does not mutate or share objects with the input', () => {
        const input = doc({ '1': true, '20': [{ '21': 'Jane', extra: 1 }], '99': 'x' })
        const snapshot = JSON.parse(JSON.stringify(input))
        const result = engine.sanitize(input)

        expect(input).toEqual(snapshot)
        expect(result.form).not.toBe(input.form)
        expect(result.values['20']).not.toBe(input.values['20'])
    })

    it('throws RangeError for an invalid now', () => {
        expect(() => engine.sanitize(doc({}), { now: new Date('garbage') })).toThrow(RangeError)
    })
})

describe('FormEngine.validate strict', () => {
    const dirty = doc({
        '1': false,
        '2': 'hidden',
        '3': 'static',
        '99': 'unknown',
        '20': [{ '21': 'Jane', extra: 1 }],
    })

    it('keeps the default behaviour without strict', () => {
        expect(engine.validate(dirty).valid).toBe(true)
    })

    it('reports every stray value with strict', () => {
        const result = engine.validate(dirty, { strict: true })
        expect(result.valid).toBe(false)
        expect(result.documentErrors).toEqual(
            expect.arrayContaining([
                expect.objectContaining({ code: 'HIDDEN_FIELD_VALUE', itemId: 2 }),
                expect.objectContaining({ code: 'NON_VALUE_ITEM_VALUE', itemId: 3 }),
                expect.objectContaining({ code: 'UNKNOWN_VALUE_KEY', params: { key: '99' } }),
                expect.objectContaining({
                    code: 'UNKNOWN_ROW_KEY',
                    itemId: 20,
                    params: { itemIndex: 0, key: 'extra' },
                }),
            ]),
        )
        expect(result.documentErrors).toHaveLength(4)
    })

    it('still reports field errors next to stray values', () => {
        const strictDef = baseDef([{ id: 1, type: 'string', label: 'Name', validation: { required: true } }])
        const result = new FormEngine(strictDef).validate(doc({ '99': 'x' }), { strict: true })
        expect(result.fieldErrors.get(1)?.[0]?.rule).toBe('REQUIRED')
        expect(result.documentErrors?.[0]?.code).toBe('UNKNOWN_VALUE_KEY')
    })

    it('passes strict validation after sanitize', () => {
        expect(engine.validate(engine.sanitize(dirty), { strict: true }).valid).toBe(true)
    })

    it('ignores suggestions', () => {
        const d = doc({}, { '99': { value: 'x', confidence: 1, source: 's' } })
        expect(engine.validate(d, { strict: true }).valid).toBe(true)
    })
})
