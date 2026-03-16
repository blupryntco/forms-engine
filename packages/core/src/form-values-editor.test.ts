import { FormValuesEditor } from './form-values-editor'
import type { ContentItem, FormDefinition } from './types/form-definition'
import type { FormDocument, FormValues } from './types/form-values'

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
})
