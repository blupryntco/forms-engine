/**
 * Backward compatibility of the editors' serialisation.
 *
 * A legacy definition or document that passes through `FormDefinitionEditor` /
 * `FormValuesEditor` must come out byte-identical: no `items: []` injected into
 * a plain `array` field, no `kind` hint, no `suggestions: {}` block, no metadata
 * keys materialised as `undefined`.
 *
 * `toStrictEqual` throughout, never `toEqual` -- `toEqual` treats
 * `{ suggestions: undefined }` as equal to `{}`, which is exactly the kind of
 * injection this file exists to catch.
 */

import { LEGACY_CORPUS } from './__fixtures__/backward_compatibility'
import { FormDefinitionEditor } from './form-definition-editor'
import { FormValuesEditor } from './form-values-editor'

const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T

describe.each(LEGACY_CORPUS)('backward compatibility round-trip -- $slug', ({ definition, document }) => {
    it('FormDefinitionEditor round-trips the definition unchanged', () => {
        const original = clone(definition)

        expect(new FormDefinitionEditor(clone(definition)).toJSON()).toStrictEqual(original)
    })

    it('FormValuesEditor round-trips the document unchanged', () => {
        const original = clone(document)
        const result = new FormValuesEditor(clone(definition), clone(document)).toJSON()

        expect(result).toStrictEqual(original)
    })

    it('never adds a suggestions block to a document that had none', () => {
        const editor = new FormValuesEditor(clone(definition), clone(document))

        expect('suggestions' in editor.toJSON()).toBe(false)
    })

    it('survives a no-op write cycle without drift', () => {
        const original = clone(document)
        const editor = new FormValuesEditor(clone(definition), clone(document))

        const [firstId] = Object.keys(original.values)
        if (firstId !== undefined) {
            const id = Number(firstId)
            const before = editor.getFieldValue(id)
            editor.setFieldValue(id, 'scratch')
            editor.setFieldValue(id, before)
        }

        expect(editor.toJSON()).toStrictEqual(original)
    })

    it('does not mutate the definition object it was handed', () => {
        const input = clone(definition)
        const untouched = clone(definition)

        new FormDefinitionEditor(input).toJSON()
        new FormValuesEditor(input, clone(document)).toJSON()

        expect(input).toStrictEqual(untouched)
    })
})
