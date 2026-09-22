import { FormValuesEditor } from './form-values-editor'
import type { FileValue } from './types/file-value'
import type { ContentItem, FormDefinition } from './types/form-definition'
import type { FormDocument, FormValues } from './types/form-values'
import type { SustainabilityValue } from './types/sustainability-value'

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

const simpleDef = baseDef([
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
])

const defWithSection = baseDef([
    { id: 1, type: 'string', label: 'Name' },
    {
        id: 10,
        type: 'section',
        title: 'Details',
        content: [{ id: 2, type: 'number', label: 'Age' }],
    },
])

describe('FormValuesEditor', () => {
    it('creates a blank document with correct id and version when no doc provided', () => {
        const editor = new FormValuesEditor(simpleDef)
        const result = editor.toJSON()
        expect(result.form.id).toBe('test-form')
        expect(result.form.version).toBe('1.0.0')
        expect(result.form.submittedAt).toBeDefined()
        expect(result.values).toEqual({})
    })

    it('deep-clones the provided document (mutations do not leak back)', () => {
        const original = doc({ '1': 'Alice' })
        const editor = new FormValuesEditor(simpleDef, original)
        editor.setFieldValue(1, 'Bob')
        expect(original.values['1']).toBe('Alice')
    })

    it('deep-clones the provided document (external mutations do not leak in)', () => {
        const original = doc({ '1': 'Alice' })
        const editor = new FormValuesEditor(simpleDef, original)
        original.values['1'] = 'Tampered'
        expect(editor.getFieldValue(1)).toBe('Alice')
    })

    describe('getFieldValue / setFieldValue / clearFieldValue', () => {
        it('set and get a string value', () => {
            const editor = new FormValuesEditor(simpleDef)
            editor.setFieldValue(1, 'Alice')
            expect(editor.getFieldValue(1)).toBe('Alice')
        })

        it('set and get a number value', () => {
            const editor = new FormValuesEditor(simpleDef)
            editor.setFieldValue(2, 30)
            expect(editor.getFieldValue(2)).toBe(30)
        })

        it('set and get a boolean value', () => {
            const editor = new FormValuesEditor(simpleDef)
            editor.setFieldValue(3, true)
            expect(editor.getFieldValue(3)).toBe(true)
        })

        it('set and get a date value', () => {
            const editor = new FormValuesEditor(simpleDef)
            editor.setFieldValue(4, '2000-01-15')
            expect(editor.getFieldValue(4)).toBe('2000-01-15')
        })

        it('set and get a select value', () => {
            const editor = new FormValuesEditor(simpleDef)
            editor.setFieldValue(5, 'r')
            expect(editor.getFieldValue(5)).toBe('r')
        })

        it('throws for unknown fieldId', () => {
            const editor = new FormValuesEditor(simpleDef)
            expect(() => editor.setFieldValue(999, 'x')).toThrow('not found')
        })

        it('throws for section id', () => {
            const editor = new FormValuesEditor(defWithSection)
            expect(() => editor.setFieldValue(10, 'x')).toThrow('section')
        })

        it('clearFieldValue removes the key', () => {
            const editor = new FormValuesEditor(simpleDef)
            editor.setFieldValue(1, 'Alice')
            editor.clearFieldValue(1)
            expect(editor.getFieldValue(1)).toBeUndefined()
            expect('1' in editor.toJSON().values).toBe(false)
        })

        it('getFieldValue returns undefined for unset fields', () => {
            const editor = new FormValuesEditor(simpleDef)
            expect(editor.getFieldValue(1)).toBeUndefined()
        })
    })

    describe('array operations', () => {
        it('addArrayItem appends to array (auto-initializes if needed)', () => {
            const editor = new FormValuesEditor(simpleDef)
            editor.addArrayItem(6, 'tag1')
            editor.addArrayItem(6, 'tag2')
            expect(editor.getFieldValue(6)).toEqual(['tag1', 'tag2'])
        })

        it('addArrayItem appends undefined by default', () => {
            const editor = new FormValuesEditor(simpleDef)
            editor.addArrayItem(6)
            expect(editor.getFieldValue(6)).toEqual([undefined])
        })

        it('removeArrayItem removes at index', () => {
            const editor = new FormValuesEditor(simpleDef)
            editor.addArrayItem(6, 'a').addArrayItem(6, 'b').addArrayItem(6, 'c')
            editor.removeArrayItem(6, 1)
            expect(editor.getFieldValue(6)).toEqual(['a', 'c'])
        })

        it('removeArrayItem throws on out-of-bounds', () => {
            const editor = new FormValuesEditor(simpleDef)
            editor.addArrayItem(6, 'a')
            expect(() => editor.removeArrayItem(6, 5)).toThrow('out of bounds')
        })

        it('removeArrayItem throws on negative index', () => {
            const editor = new FormValuesEditor(simpleDef)
            editor.addArrayItem(6, 'a')
            expect(() => editor.removeArrayItem(6, -1)).toThrow('out of bounds')
        })

        it('moveArrayItem reorders items', () => {
            const editor = new FormValuesEditor(simpleDef)
            editor.addArrayItem(6, 'a').addArrayItem(6, 'b').addArrayItem(6, 'c')
            editor.moveArrayItem(6, 0, 2)
            expect(editor.getFieldValue(6)).toEqual(['b', 'c', 'a'])
        })

        it('moveArrayItem throws on out-of-bounds fromIndex', () => {
            const editor = new FormValuesEditor(simpleDef)
            editor.addArrayItem(6, 'a')
            expect(() => editor.moveArrayItem(6, 5, 0)).toThrow('out of bounds')
        })

        it('moveArrayItem throws on out-of-bounds toIndex', () => {
            const editor = new FormValuesEditor(simpleDef)
            editor.addArrayItem(6, 'a')
            expect(() => editor.moveArrayItem(6, 0, 5)).toThrow('out of bounds')
        })

        it('setArrayItem sets value at index', () => {
            const editor = new FormValuesEditor(simpleDef)
            editor.addArrayItem(6, 'a').addArrayItem(6, 'b')
            editor.setArrayItem(6, 1, 'B')
            expect(editor.getFieldValue(6)).toEqual(['a', 'B'])
        })

        it('setArrayItem throws on out-of-bounds', () => {
            const editor = new FormValuesEditor(simpleDef)
            editor.addArrayItem(6, 'a')
            expect(() => editor.setArrayItem(6, 3, 'x')).toThrow('out of bounds')
        })

        it('all array operations throw for non-array fields', () => {
            const editor = new FormValuesEditor(simpleDef)
            expect(() => editor.addArrayItem(1, 'x')).toThrow('not an array')
            expect(() => editor.removeArrayItem(1, 0)).toThrow('not an array')
            expect(() => editor.moveArrayItem(1, 0, 1)).toThrow('not an array')
            expect(() => editor.setArrayItem(1, 0, 'x')).toThrow('not an array')
        })

        it('removeArrayItem throws when array not yet initialized', () => {
            const editor = new FormValuesEditor(simpleDef)
            expect(() => editor.removeArrayItem(6, 0)).toThrow('does not currently hold an array')
        })
    })

    describe('array_obj fields', () => {
        const objDef = baseDef([
            {
                id: 10,
                type: 'array_obj',
                label: 'Directors',
                items: [
                    { id: 11, type: 'string', label: 'Name', validation: { required: true } },
                    { id: 12, type: 'date', label: 'Appointed' },
                    { id: 13, type: 'static', text: 'Checked against filings' },
                ],
                validation: { minItems: 1 },
            },
        ])

        const rows = (editor: FormValuesEditor) => editor.getFieldValue(10) as Record<string, unknown>[]

        it('addArrayItem appends an empty row object', () => {
            const editor = new FormValuesEditor(objDef, doc())
            editor.addArrayItem(10)
            expect(rows(editor)).toEqual([{}])
        })

        it('addArrayItem still honours an explicit row value', () => {
            const editor = new FormValuesEditor(objDef, doc())
            editor.addArrayItem(10, { '11': 'Jane' })
            expect(rows(editor)).toEqual([{ '11': 'Jane' }])
        })

        it('remove / move / set work on rows', () => {
            const editor = new FormValuesEditor(objDef, doc({ '10': [{ '11': 'A' }, { '11': 'B' }, { '11': 'C' }] }))
            editor.moveArrayItem(10, 2, 0).removeArrayItem(10, 2).setArrayItem(10, 1, { '11': 'Z' })
            expect(rows(editor)).toEqual([{ '11': 'C' }, { '11': 'Z' }])
        })

        it('setArrayObjValue writes one cell', () => {
            const editor = new FormValuesEditor(objDef, doc({ '10': [{}] }))
            editor.setArrayObjValue(10, 0, 11, 'Jane').setArrayObjValue(10, 0, 12, '2024-01-05')
            expect(rows(editor)).toEqual([{ '11': 'Jane', '12': '2024-01-05' }])
        })

        it('getArrayObjValue reads one cell', () => {
            const editor = new FormValuesEditor(objDef, doc({ '10': [{ '11': 'Jane' }] }))
            expect(editor.getArrayObjValue(10, 0, 11)).toBe('Jane')
            expect(editor.getArrayObjValue(10, 0, 12)).toBeUndefined()
        })

        it('clearArrayObjValue removes one cell', () => {
            const editor = new FormValuesEditor(objDef, doc({ '10': [{ '11': 'Jane', '12': '2024-01-05' }] }))
            editor.clearArrayObjValue(10, 0, 11)
            expect(rows(editor)).toEqual([{ '12': '2024-01-05' }])
        })

        it('replaces a row that is not an object before writing', () => {
            const editor = new FormValuesEditor(objDef, doc({ '10': [null] }))
            editor.setArrayObjValue(10, 0, 11, 'Jane')
            expect(rows(editor)).toEqual([{ '11': 'Jane' }])
        })

        it('throws for a static sub-field', () => {
            const editor = new FormValuesEditor(objDef, doc({ '10': [{}] }))
            expect(() => editor.setArrayObjValue(10, 0, 13, 'x')).toThrow('static field')
        })

        it('throws for a sub-field of another field', () => {
            const editor = new FormValuesEditor(objDef, doc({ '10': [{}] }))
            expect(() => editor.setArrayObjValue(10, 0, 99, 'x')).toThrow('does not belong')
        })

        it('throws for an out-of-bounds row', () => {
            const editor = new FormValuesEditor(objDef, doc({ '10': [] }))
            expect(() => editor.setArrayObjValue(10, 0, 11, 'x')).toThrow('out of bounds')
        })

        it('throws when the field is not an array_obj', () => {
            const editor = new FormValuesEditor(simpleDef, doc())
            expect(() => editor.setArrayObjValue(1, 0, 2, 'x')).toThrow('not an array_obj')
        })

        it('validates sub-fields per row', () => {
            const editor = new FormValuesEditor(objDef, doc({ '10': [{ '11': 'Jane' }, {}] }))
            const result = editor.validate()
            expect(result.valid).toBe(false)
            expect(result.fieldErrors.get(10)).toEqual([
                expect.objectContaining({ fieldId: 10, rule: 'REQUIRED', itemIndex: 1, itemFieldId: 11 }),
            ])
        })

        it('round-trips a document through toJSON', () => {
            const original = doc({ '10': [{ '11': 'Jane', '12': '2024-01-05' }] })
            expect(new FormValuesEditor(objDef, original).toJSON()).toEqual(original)
        })
    })

    describe('setSubmittedAt', () => {
        it('updates document submittedAt', () => {
            const editor = new FormValuesEditor(simpleDef)
            editor.setSubmittedAt('2026-01-01T00:00:00.000Z')
            expect(editor.toJSON().form.submittedAt).toBe('2026-01-01T00:00:00.000Z')
        })
    })

    describe('validate', () => {
        it('returns valid result for correct values', () => {
            const def = baseDef([{ id: 1, type: 'string', label: 'Name', validation: { required: true } }])
            const editor = new FormValuesEditor(def)
            editor.setFieldValue(1, 'Alice')
            const result = editor.validate()
            expect(result.valid).toBe(true)
            expect(result.fieldErrors.size).toBe(0)
        })

        it('returns errors for required field missing', () => {
            const def = baseDef([{ id: 1, type: 'string', label: 'Name', validation: { required: true } }])
            const editor = new FormValuesEditor(def)
            // do not set value
            const result = editor.validate()
            expect(result.valid).toBe(false)
            expect(result.fieldErrors.size).toBeGreaterThan(0)
            expect(result.fieldErrors.get(1)?.some((e) => e.rule === 'REQUIRED')).toBe(true)
        })

        it('returns errors for number below min', () => {
            const def = baseDef([{ id: 1, type: 'number', label: 'Age', validation: { min: 18 } }])
            const editor = new FormValuesEditor(def)
            editor.setFieldValue(1, 10)
            const result = editor.validate()
            expect(result.valid).toBe(false)
            expect(result.fieldErrors.get(1)?.some((e) => e.rule === 'MIN')).toBe(true)
        })
    })

    describe('visibility', () => {
        const conditionalDef = baseDef([
            { id: 1, type: 'boolean', label: 'Toggle' },
            {
                id: 2,
                type: 'string',
                label: 'Conditional',
                condition: { field: 1, op: 'eq', value: true },
            },
        ])

        it('getVisibilityMap reflects conditional visibility', () => {
            const editor = new FormValuesEditor(conditionalDef)
            editor.setFieldValue(1, false)
            const map = editor.getVisibilityMap()
            expect(map.get(2)).toBe(false)
        })

        it('getVisibilityMap shows field when condition met', () => {
            const editor = new FormValuesEditor(conditionalDef)
            editor.setFieldValue(1, true)
            const map = editor.getVisibilityMap()
            expect(map.get(2)).toBe(true)
        })

        it('isVisible returns correct boolean', () => {
            const editor = new FormValuesEditor(conditionalDef)
            editor.setFieldValue(1, false)
            expect(editor.isVisible(2)).toBe(false)
            editor.setFieldValue(1, true)
            expect(editor.isVisible(2)).toBe(true)
        })

        it('unconditional fields are always visible', () => {
            const editor = new FormValuesEditor(conditionalDef)
            expect(editor.isVisible(1)).toBe(true)
        })
    })

    describe('output', () => {
        it('toJSON returns deep clone', () => {
            const editor = new FormValuesEditor(simpleDef)
            editor.setFieldValue(1, 'Alice')
            const doc1 = editor.toJSON()
            const doc2 = editor.toJSON()
            expect(doc1).toEqual(doc2)
            expect(doc1).not.toBe(doc2)
        })

        it('further edits do not affect returned document', () => {
            const editor = new FormValuesEditor(simpleDef)
            editor.setFieldValue(1, 'Alice')
            const snapshot = editor.toJSON()
            editor.setFieldValue(1, 'Bob')
            expect(snapshot.values['1']).toBe('Alice')
        })

        it('mutating returned document does not affect editor', () => {
            const editor = new FormValuesEditor(simpleDef)
            editor.setFieldValue(1, 'Alice')
            const snapshot = editor.toJSON()
            snapshot.values['1'] = 'Tampered'
            expect(editor.getFieldValue(1)).toBe('Alice')
        })
    })

    describe('fluent chaining', () => {
        it('setFieldValue returns this', () => {
            const editor = new FormValuesEditor(simpleDef)
            expect(editor.setFieldValue(1, 'Alice')).toBe(editor)
        })

        it('clearFieldValue returns this', () => {
            const editor = new FormValuesEditor(simpleDef)
            expect(editor.clearFieldValue(1)).toBe(editor)
        })

        it('addArrayItem returns this', () => {
            const editor = new FormValuesEditor(simpleDef)
            expect(editor.addArrayItem(6, 'tag')).toBe(editor)
        })

        it('removeArrayItem returns this', () => {
            const editor = new FormValuesEditor(simpleDef)
            editor.addArrayItem(6, 'tag')
            expect(editor.removeArrayItem(6, 0)).toBe(editor)
        })

        it('moveArrayItem returns this', () => {
            const editor = new FormValuesEditor(simpleDef)
            editor.addArrayItem(6, 'a').addArrayItem(6, 'b')
            expect(editor.moveArrayItem(6, 0, 1)).toBe(editor)
        })

        it('setArrayItem returns this', () => {
            const editor = new FormValuesEditor(simpleDef)
            editor.addArrayItem(6, 'a')
            expect(editor.setArrayItem(6, 0, 'b')).toBe(editor)
        })

        it('setSubmittedAt returns this', () => {
            const editor = new FormValuesEditor(simpleDef)
            expect(editor.setSubmittedAt('2026-01-01T00:00:00.000Z')).toBe(editor)
        })

        it('chains multiple operations fluently', () => {
            const result = new FormValuesEditor(simpleDef)
                .setFieldValue(1, 'Alice')
                .setFieldValue(2, 30)
                .setFieldValue(3, true)
                .setSubmittedAt('2026-01-01T00:00:00.000Z')
                .addArrayItem(6, 'tag1')
                .addArrayItem(6, 'tag2')
                .toJSON()

            expect(result.values['1']).toBe('Alice')
            expect(result.values['2']).toBe(30)
            expect(result.values['3']).toBe(true)
            expect(result.values['6']).toEqual(['tag1', 'tag2'])
            expect(result.form.submittedAt).toBe('2026-01-01T00:00:00.000Z')
        })
    })

    describe('setFieldValue / getFieldValue (additional)', () => {
        const defWithFile = baseDef([
            { id: 1, type: 'file', label: 'Attachment' },
            {
                id: 2,
                type: 'array',
                label: 'Tags',
                item: { type: 'string', label: 'Tag' },
            },
            { id: 3, type: 'string', label: 'Name' },
        ])

        it('set and get a file value', () => {
            const fileVal: FileValue = {
                name: 'report.pdf',
                mimeType: 'application/pdf',
                size: 12345,
                url: 'https://example.com/report.pdf',
            }
            const editor = new FormValuesEditor(defWithFile)
            editor.setFieldValue(1, fileVal)
            expect(editor.getFieldValue(1)).toEqual(fileVal)
        })

        it('set array field directly via setFieldValue', () => {
            const editor = new FormValuesEditor(defWithFile)
            editor.setFieldValue(2, ['a', 'b', 'c'])
            expect(editor.getFieldValue(2)).toEqual(['a', 'b', 'c'])
        })

        it('overwrite an existing value', () => {
            const editor = new FormValuesEditor(defWithFile)
            editor.setFieldValue(3, 'Alice')
            expect(editor.getFieldValue(3)).toBe('Alice')
            editor.setFieldValue(3, 'Bob')
            expect(editor.getFieldValue(3)).toBe('Bob')
        })

        it('set value to null', () => {
            const editor = new FormValuesEditor(defWithFile)
            editor.setFieldValue(3, 'Alice')
            editor.setFieldValue(3, null)
            expect(editor.getFieldValue(3)).toBeNull()
        })

        it('set value to undefined', () => {
            const editor = new FormValuesEditor(defWithFile)
            editor.setFieldValue(3, 'Alice')
            editor.setFieldValue(3, undefined)
            expect(editor.getFieldValue(3)).toBeUndefined()
        })
    })

    describe('clearFieldValue (additional)', () => {
        it('clearing an already-clear field does not throw', () => {
            const editor = new FormValuesEditor(simpleDef)
            expect(() => editor.clearFieldValue(1)).not.toThrow()
            expect(editor.getFieldValue(1)).toBeUndefined()
        })

        it('clearing a field inside a section', () => {
            const editor = new FormValuesEditor(defWithSection)
            editor.setFieldValue(2, 42)
            expect(editor.getFieldValue(2)).toBe(42)
            editor.clearFieldValue(2)
            expect(editor.getFieldValue(2)).toBeUndefined()
            expect('2' in editor.toJSON().values).toBe(false)
        })
    })

    describe('array operations (additional)', () => {
        it('moveArrayItem with same from/to index is a no-op', () => {
            const editor = new FormValuesEditor(simpleDef)
            editor.addArrayItem(6, 'a').addArrayItem(6, 'b').addArrayItem(6, 'c')
            editor.moveArrayItem(6, 1, 1)
            expect(editor.getFieldValue(6)).toEqual(['a', 'b', 'c'])
        })

        it('removeArrayItem that empties the array leaves an empty array', () => {
            const editor = new FormValuesEditor(simpleDef)
            editor.addArrayItem(6, 'only')
            editor.removeArrayItem(6, 0)
            expect(editor.getFieldValue(6)).toEqual([])
        })

        it('multiple sequential operations — add several, remove middle, verify state', () => {
            const editor = new FormValuesEditor(simpleDef)
            editor
                .addArrayItem(6, 'a')
                .addArrayItem(6, 'b')
                .addArrayItem(6, 'c')
                .addArrayItem(6, 'd')
                .addArrayItem(6, 'e')
            expect(editor.getFieldValue(6)).toEqual(['a', 'b', 'c', 'd', 'e'])

            editor.removeArrayItem(6, 2) // remove 'c'
            expect(editor.getFieldValue(6)).toEqual(['a', 'b', 'd', 'e'])

            editor.removeArrayItem(6, 1) // remove 'b'
            expect(editor.getFieldValue(6)).toEqual(['a', 'd', 'e'])

            editor.setArrayItem(6, 1, 'D')
            expect(editor.getFieldValue(6)).toEqual(['a', 'D', 'e'])

            editor.moveArrayItem(6, 2, 0)
            expect(editor.getFieldValue(6)).toEqual(['e', 'a', 'D'])
        })
    })

    describe('setSubmittedAt (additional)', () => {
        it('overwrite existing submittedAt', () => {
            const editor = new FormValuesEditor(simpleDef)
            editor.setSubmittedAt('2025-01-01T00:00:00.000Z')
            expect(editor.toJSON().form.submittedAt).toBe('2025-01-01T00:00:00.000Z')
            editor.setSubmittedAt('2026-06-15T12:00:00.000Z')
            expect(editor.toJSON().form.submittedAt).toBe('2026-06-15T12:00:00.000Z')
        })

        it('invalid date string is accepted by editor (validation catches it)', () => {
            const editor = new FormValuesEditor(simpleDef)
            editor.setSubmittedAt('not-a-date')
            expect(editor.toJSON().form.submittedAt).toBe('not-a-date')
            const result = editor.validate()
            expect(result.valid).toBe(false)
            expect(result.documentErrors?.some((e) => e.code === 'FORM_SUBMITTED_AT_INVALID')).toBe(true)
        })
    })

    describe('validate (additional)', () => {
        it('hidden conditional field with required does not produce errors', () => {
            const def = baseDef([
                { id: 1, type: 'boolean', label: 'Toggle' },
                {
                    id: 2,
                    type: 'string',
                    label: 'Hidden Required',
                    validation: { required: true },
                    condition: { field: 1, op: 'eq', value: true },
                },
            ])
            const editor = new FormValuesEditor(def)
            editor.setFieldValue(1, false) // condition false → field 2 hidden
            const result = editor.validate()
            expect(result.valid).toBe(true)
            expect(result.fieldErrors.has(2)).toBe(false)
        })

        it('string field with minLength violation', () => {
            const def = baseDef([{ id: 1, type: 'string', label: 'Name', validation: { minLength: 5 } }])
            const editor = new FormValuesEditor(def)
            editor.setFieldValue(1, 'ab')
            const result = editor.validate()
            expect(result.valid).toBe(false)
            expect(result.fieldErrors.get(1)?.some((e) => e.rule === 'MIN_LENGTH')).toBe(true)
        })

        it('string field with maxLength violation', () => {
            const def = baseDef([{ id: 1, type: 'string', label: 'Name', validation: { maxLength: 3 } }])
            const editor = new FormValuesEditor(def)
            editor.setFieldValue(1, 'toolong')
            const result = editor.validate()
            expect(result.valid).toBe(false)
            expect(result.fieldErrors.get(1)?.some((e) => e.rule === 'MAX_LENGTH')).toBe(true)
        })

        it('string field with pattern violation', () => {
            const def = baseDef([{ id: 1, type: 'string', label: 'Code', validation: { pattern: '^[A-Z]+$' } }])
            const editor = new FormValuesEditor(def)
            editor.setFieldValue(1, 'abc123')
            const result = editor.validate()
            expect(result.valid).toBe(false)
            expect(result.fieldErrors.get(1)?.some((e) => e.rule === 'PATTERN')).toBe(true)
        })

        it('date field with minDate violation', () => {
            const def = baseDef([
                { id: 1, type: 'date', label: 'Start', validation: { minDate: '2025-06-01T00:00:00.000Z' } },
            ])
            const editor = new FormValuesEditor(def)
            editor.setFieldValue(1, '2025-01-01')
            const result = editor.validate()
            expect(result.valid).toBe(false)
            expect(result.fieldErrors.get(1)?.some((e) => e.rule === 'MIN_DATE')).toBe(true)
        })

        it('date field with maxDate violation', () => {
            const def = baseDef([
                { id: 1, type: 'date', label: 'End', validation: { maxDate: '2025-06-01T00:00:00.000Z' } },
            ])
            const editor = new FormValuesEditor(def)
            editor.setFieldValue(1, '2025-12-31')
            const result = editor.validate()
            expect(result.valid).toBe(false)
            expect(result.fieldErrors.get(1)?.some((e) => e.rule === 'MAX_DATE')).toBe(true)
        })

        it('array field with minItems violation', () => {
            const def = baseDef([
                {
                    id: 1,
                    type: 'array',
                    label: 'Items',
                    item: { type: 'string', label: 'Item' },
                    validation: { minItems: 2 },
                },
            ])
            const editor = new FormValuesEditor(def)
            editor.addArrayItem(1, 'only-one')
            const result = editor.validate()
            expect(result.valid).toBe(false)
            expect(result.fieldErrors.get(1)?.some((e) => e.rule === 'MIN_ITEMS')).toBe(true)
        })

        it('array field with maxItems violation', () => {
            const def = baseDef([
                {
                    id: 1,
                    type: 'array',
                    label: 'Items',
                    item: { type: 'string', label: 'Item' },
                    validation: { maxItems: 1 },
                },
            ])
            const editor = new FormValuesEditor(def)
            editor.addArrayItem(1, 'a').addArrayItem(1, 'b')
            const result = editor.validate()
            expect(result.valid).toBe(false)
            expect(result.fieldErrors.get(1)?.some((e) => e.rule === 'MAX_ITEMS')).toBe(true)
        })

        it('missing submittedAt produces document error', () => {
            const def = baseDef([{ id: 1, type: 'string', label: 'Name' }])
            const d: FormDocument = {
                form: { id: 'test-form', version: '1.0.0', submittedAt: '' },
                values: {},
            }
            const editor = new FormValuesEditor(def, d)
            const result = editor.validate()
            expect(result.valid).toBe(false)
            expect(result.documentErrors).toBeDefined()
            expect(result.documentErrors?.some((e) => e.code === 'FORM_SUBMITTED_AT_MISSING')).toBe(true)
        })

        it('boolean required violation', () => {
            const def = baseDef([{ id: 1, type: 'boolean', label: 'Accept', validation: { required: true } }])
            const editor = new FormValuesEditor(def)
            // do not set value
            const result = editor.validate()
            expect(result.valid).toBe(false)
            expect(result.fieldErrors.get(1)?.some((e) => e.rule === 'REQUIRED')).toBe(true)
        })
    })

    describe('visibility (additional)', () => {
        it('section visibility with conditional section', () => {
            const def = baseDef([
                { id: 1, type: 'boolean', label: 'Show Section' },
                {
                    id: 10,
                    type: 'section',
                    title: 'Conditional Section',
                    condition: { field: 1, op: 'eq', value: true },
                    content: [{ id: 2, type: 'string', label: 'Inner' }],
                },
            ])
            const editor = new FormValuesEditor(def)
            editor.setFieldValue(1, false)
            expect(editor.isVisible(10)).toBe(false)
            expect(editor.isVisible(2)).toBe(false)

            editor.setFieldValue(1, true)
            expect(editor.isVisible(10)).toBe(true)
            expect(editor.isVisible(2)).toBe(true)
        })

        it('visibility after value change — show then hide', () => {
            const def = baseDef([
                { id: 1, type: 'boolean', label: 'Toggle' },
                {
                    id: 2,
                    type: 'string',
                    label: 'Conditional',
                    condition: { field: 1, op: 'eq', value: true },
                },
            ])
            const editor = new FormValuesEditor(def)

            editor.setFieldValue(1, true)
            expect(editor.isVisible(2)).toBe(true)

            editor.setFieldValue(1, false)
            expect(editor.isVisible(2)).toBe(false)
        })
    })

    describe('toJSON (additional)', () => {
        it('toJSON with array values returns deep clone', () => {
            const editor = new FormValuesEditor(simpleDef)
            editor.addArrayItem(6, 'a').addArrayItem(6, 'b')
            const snapshot = editor.toJSON()
            expect(snapshot.values['6']).toEqual(['a', 'b'])

            // mutate the snapshot array
            ;(snapshot.values['6'] as string[]).push('c')
            expect(editor.getFieldValue(6)).toEqual(['a', 'b'])
        })

        it('toJSON with file values returns deep clone of nested objects', () => {
            const defWithFile = baseDef([{ id: 1, type: 'file', label: 'Upload' }])
            const fileVal: FileValue = {
                name: 'doc.pdf',
                mimeType: 'application/pdf',
                size: 999,
                url: 'https://example.com/doc.pdf',
            }
            const editor = new FormValuesEditor(defWithFile)
            editor.setFieldValue(1, fileVal)
            const snapshot = editor.toJSON()
            expect(snapshot.values['1']).toEqual(fileVal)

            // mutate the snapshot's file object
            ;(snapshot.values['1'] as FileValue).name = 'tampered.pdf'
            expect((editor.getFieldValue(1) as FileValue).name).toBe('doc.pdf')
        })
    })

    describe('suggestions', () => {
        const suggestion = (value: unknown, confidence = 0.5, source = 'extracted from page 1') => ({
            value,
            confidence,
            source,
        })

        it('sets and reads a suggestion', () => {
            const editor = new FormValuesEditor(simpleDef)
            editor.setSuggestion(1, suggestion('Acme Ltd'))
            expect(editor.getSuggestion(1)).toEqual(suggestion('Acme Ltd'))
        })

        it('returns undefined for a field without a suggestion', () => {
            expect(new FormValuesEditor(simpleDef).getSuggestion(1)).toBeUndefined()
        })

        it('returns every suggestion via getSuggestions', () => {
            const editor = new FormValuesEditor(simpleDef)
            editor.setSuggestion(1, suggestion('Acme Ltd')).setSuggestion(2, suggestion(42))
            expect(editor.getSuggestions()).toEqual({ '1': suggestion('Acme Ltd'), '2': suggestion(42) })
        })

        it('returns an empty map for a document with no suggestions', () => {
            expect(new FormValuesEditor(simpleDef).getSuggestions()).toEqual({})
        })

        it('throws when setting a suggestion on an unknown field', () => {
            expect(() => new FormValuesEditor(simpleDef).setSuggestion(99, suggestion('x'))).toThrow(
                'Field with id 99 not found',
            )
        })

        it('throws when setting a suggestion on a section', () => {
            const def = baseDef([
                { id: 1, type: 'section', title: 'Details', content: [{ id: 2, type: 'string', label: 'Name' }] },
            ])
            expect(() => new FormValuesEditor(def).setSuggestion(1, suggestion('x'))).toThrow(
                'Item 1 is a section, not a field',
            )
        })

        it('throws when confidence is outside 0..1', () => {
            expect(() => new FormValuesEditor(simpleDef).setSuggestion(1, suggestion('x', 1.5))).toThrow(
                /confidence must be a number between 0 and 1/,
            )
        })

        it('clears a suggestion', () => {
            const editor = new FormValuesEditor(simpleDef)
            editor.setSuggestion(1, suggestion('Acme Ltd')).clearSuggestion(1)
            expect(editor.getSuggestion(1)).toBeUndefined()
        })

        it('accepts a suggestion into the value and keeps the suggestion', () => {
            const editor = new FormValuesEditor(simpleDef)
            editor.setSuggestion(1, suggestion('Acme Ltd')).acceptSuggestion(1)
            expect(editor.getFieldValue(1)).toBe('Acme Ltd')
            expect(editor.getSuggestion(1)).toEqual(suggestion('Acme Ltd'))
        })

        it('rejects a suggestion without touching the value', () => {
            const editor = new FormValuesEditor(simpleDef)
            editor.setFieldValue(1, 'typed').setSuggestion(1, suggestion('Acme Ltd')).rejectSuggestion(1)
            expect(editor.getFieldValue(1)).toBe('typed')
            expect(editor.getSuggestion(1)).toBeUndefined()
        })

        it('does not alias an accepted array value to the suggestion', () => {
            const editor = new FormValuesEditor(simpleDef)
            editor
                .setSuggestion(6, suggestion(['a', 'b']))
                .acceptSuggestion(6)
                .addArrayItem(6, 'c')
            expect(editor.getSuggestion(6)?.value).toEqual(['a', 'b'])
            expect(editor.getFieldValue(6)).toEqual(['a', 'b', 'c'])
        })

        it('emits no suggestions key for a document that never had one', () => {
            const snapshot = new FormValuesEditor(simpleDef, doc({ '1': 'typed' })).toJSON()
            expect('suggestions' in snapshot).toBe(false)
        })

        it('drops the suggestions key again once the last suggestion is rejected', () => {
            const editor = new FormValuesEditor(simpleDef, doc({ '1': 'typed' }))
            editor.setSuggestion(1, suggestion('Acme Ltd')).rejectSuggestion(1)
            expect('suggestions' in editor.toJSON()).toBe(false)
        })

        it('preserves existing suggestions from a loaded document', () => {
            const existing = { ...doc({ '1': 'typed' }), suggestions: { '1': suggestion('Acme Ltd') } }
            expect(new FormValuesEditor(simpleDef, existing).getSuggestion(1)).toEqual(suggestion('Acme Ltd'))
        })
    })
    describe('static and multiselect fields', () => {
        const def = baseDef([
            { id: 1, type: 'static', text: 'Read this.' },
            {
                id: 2,
                type: 'multiselect',
                label: 'Programmes',
                options: [
                    { value: 'aml', label: 'AML' },
                    { value: 'kyc', label: 'KYC' },
                ],
                validation: { required: true },
            },
        ])

        it('setFieldValue throws for a static field', () => {
            const editor = new FormValuesEditor(def, doc())
            expect(() => editor.setFieldValue(1, 'anything')).toThrow('Item 1 is a static field and holds no value')
        })

        it('setSuggestion throws for a static field', () => {
            const editor = new FormValuesEditor(def, doc())
            expect(() => editor.setSuggestion(1, { value: 'x', confidence: 0.5, source: 'doc' })).toThrow(
                'Item 1 is a static field and holds no value',
            )
        })

        it('writes a multiselect value wholesale', () => {
            const editor = new FormValuesEditor(def, doc())
            editor.setFieldValue(2, ['aml', 'kyc'])
            expect(editor.getFieldValue(2)).toEqual(['aml', 'kyc'])
            expect(editor.validate().valid).toBe(true)
        })

        it('reports an empty multiselect as required', () => {
            const editor = new FormValuesEditor(def, doc())
            editor.setFieldValue(2, [])
            expect(editor.validate().fieldErrors.get(2)?.[0]?.rule).toBe('REQUIRED')
        })

        it('rejects array item operations on a multiselect field', () => {
            const editor = new FormValuesEditor(def, doc({ '2': ['aml'] }))
            expect(() => editor.addArrayItem(2, 'kyc')).toThrow()
            expect(() => editor.removeArrayItem(2, 0)).toThrow()
            expect(() => editor.moveArrayItem(2, 0, 1)).toThrow()
        })

        it('never writes a key for a static field', () => {
            const editor = new FormValuesEditor(def, doc())
            editor.setFieldValue(2, ['aml'])
            expect(Object.keys(editor.toJSON().values)).toEqual(['2'])
        })

        it('accepts a suggestion on a multiselect field as a whole array', () => {
            const editor = new FormValuesEditor(def, doc())
            editor.setSuggestion(2, { value: ['aml', 'kyc'], confidence: 0.9, source: 'Licence register' })
            editor.acceptSuggestion(2)
            expect(editor.getFieldValue(2)).toEqual(['aml', 'kyc'])
        })
    })

    describe('blockchain and sustainability fields', () => {
        const ADDRESS = 'eip155:1/erc20:0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48'
        const def = baseDef([
            { id: 1, type: 'blockchain', label: 'Token', validation: { required: true } },
            { id: 2, type: 'sustainability', label: 'Footprint', validation: { required: true } },
            { id: 3, type: 'array', label: 'Assets', item: { type: 'blockchain', label: 'Asset' } },
        ])

        it('writes and reads a blockchain address', () => {
            const editor = new FormValuesEditor(def, doc())
            editor.setFieldValue(1, ADDRESS)
            expect(editor.getFieldValue(1)).toBe(ADDRESS)
        })

        it('writes a sustainability object wholesale', () => {
            const editor = new FormValuesEditor(def, doc())
            const value: SustainabilityValue = { address: ADDRESS, ccri: 'CCRI-1', cmc: '3408' }
            editor.setFieldValue(2, value)
            expect(editor.getFieldValue(2)).toEqual(value)
        })

        it('reports a sustainability value with a blank address as required', () => {
            const editor = new FormValuesEditor(def, doc({ '1': ADDRESS }))
            editor.setFieldValue(2, { address: '', ccri: 'CCRI-1', cmc: '' })
            expect(editor.validate().fieldErrors.get(2)?.[0]?.rule).toBe('REQUIRED')
        })

        it('supports array item operations on a blockchain array', () => {
            const editor = new FormValuesEditor(def, doc())
            editor.addArrayItem(3, ADDRESS)
            editor.addArrayItem(3, 'eip155:1/erc20:0xdead')
            editor.moveArrayItem(3, 0, 1)
            expect(editor.getFieldValue(3)).toEqual(['eip155:1/erc20:0xdead', ADDRESS])
        })

        it('accepts a suggestion on a sustainability field as a whole object', () => {
            const editor = new FormValuesEditor(def, doc())
            const value: SustainabilityValue = { address: ADDRESS, ccri: 'CCRI-1', cmc: '3408' }
            editor.setSuggestion(2, { value, confidence: 0.75, source: 'prospectus.pdf, p.12' })
            editor.acceptSuggestion(2)
            expect(editor.getFieldValue(2)).toEqual(value)
        })
    })
})
