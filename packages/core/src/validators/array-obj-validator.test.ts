import { FieldValidator } from '../field-validator'
import type { ArrayObjItemDef } from '../types/array-obj-item-def'
import type { FieldEntry } from '../types/field-entry'
import type { ArrayObjValidation } from '../types/validation/array-obj'

const NAME_ID = 101
const ROLE_ID = 102
const NOTE_ID = 103
const FIELD_ID = 10

const items: ArrayObjItemDef[] = [
    { id: NAME_ID, type: 'string', label: 'Name', validation: { required: true } },
    { id: ROLE_ID, type: 'number', label: 'Share', validation: { min: 0, max: 100 } },
    { id: NOTE_ID, type: 'static', text: 'Directors are checked against your filings.' },
]

const makeEntry = (validation?: ArrayObjValidation): FieldEntry => ({
    id: FIELD_ID,
    type: 'array_obj',
    condition: undefined,
    validation,
    parentId: undefined,
    options: undefined,
    item: undefined,
    items,
    label: 'Directors',
    title: undefined,
})

const validate = (value: unknown, validation?: ArrayObjValidation) => {
    const registry = new Map<number, FieldEntry>([[FIELD_ID, makeEntry(validation)]])
    const result = new FieldValidator(registry).validate({ [String(FIELD_ID)]: value }, new Map())
    return result.fieldErrors.get(FIELD_ID) ?? []
}

describe('ArrayObjValidator', () => {
    it('produces no errors for an absent value', () => {
        expect(validate(undefined)).toEqual([])
        expect(validate(null)).toEqual([])
    })

    it('reports TYPE when the value is not an array', () => {
        const errors = validate({ [NAME_ID]: 'Jane' })
        expect(errors).toHaveLength(1)
        expect(errors[0]).toMatchObject({ fieldId: FIELD_ID, rule: 'TYPE' })
        expect(errors[0]?.itemIndex).toBeUndefined()
    })

    it('reports MIN_ITEMS and MAX_ITEMS against the row count', () => {
        const row = { [NAME_ID]: 'Jane' }
        expect(validate([], { minItems: 1 })[0]).toMatchObject({
            rule: 'MIN_ITEMS',
            params: { minItems: 1, actual: 0 },
        })
        expect(validate([row, row], { maxItems: 1 })[0]).toMatchObject({
            rule: 'MAX_ITEMS',
            params: { maxItems: 1, actual: 2 },
        })
    })

    it('reports TYPE with an itemIndex for a row that is not an object', () => {
        const errors = validate(['Jane'])
        expect(errors).toHaveLength(1)
        expect(errors[0]).toMatchObject({ fieldId: FIELD_ID, rule: 'TYPE', itemIndex: 0 })
        expect(errors[0]?.itemFieldId).toBeUndefined()
    })

    it('addresses a sub-field error by container id, row index and sub-field id', () => {
        const errors = validate([{ [NAME_ID]: 'Jane' }, { [ROLE_ID]: 50 }])
        expect(errors).toEqual([
            expect.objectContaining({
                fieldId: FIELD_ID,
                rule: 'REQUIRED',
                itemIndex: 1,
                itemFieldId: NAME_ID,
            }),
        ])
    })

    it('prefixes the sub-field label onto the message', () => {
        expect(validate([{}])[0]?.message).toMatch(/^Name: /)
    })

    it('reads an absent row as an empty one so required sub-fields still report', () => {
        const errors = validate([undefined, null])
        expect(errors).toHaveLength(2)
        expect(errors.map((e) => e.itemIndex)).toEqual([0, 1])
        expect(errors.every((e) => e.rule === 'REQUIRED' && e.itemFieldId === NAME_ID)).toBe(true)
    })

    it('validates every sub-field of every row', () => {
        const errors = validate([{ [NAME_ID]: 'Jane', [ROLE_ID]: 500 }, { [ROLE_ID]: -1 }])
        expect(errors).toEqual([
            expect.objectContaining({ rule: 'MAX', itemIndex: 0, itemFieldId: ROLE_ID }),
            expect.objectContaining({ rule: 'REQUIRED', itemIndex: 1, itemFieldId: NAME_ID }),
            expect.objectContaining({ rule: 'MIN', itemIndex: 1, itemFieldId: ROLE_ID }),
        ])
    })

    it('never validates a static sub-field', () => {
        const errors = validate([{ [NAME_ID]: 'Jane', [NOTE_ID]: 'stray value' }])
        expect(errors).toEqual([])
    })

    it('combines row-count errors with sub-field errors in one pass', () => {
        const errors = validate([{}], { minItems: 2 })
        expect(errors.map((e) => e.rule)).toEqual(['MIN_ITEMS', 'REQUIRED'])
    })
})
