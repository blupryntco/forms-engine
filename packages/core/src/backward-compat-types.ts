/**
 * Backward compatibility at the type level.
 *
 * **This file is checked by `pnpm check-types`, not by Jest.** It contains no
 * assertions and is never imported at runtime; `tsc --noEmit` covering `src` is
 * what makes it a gate. (Jest would not catch these: the shared tsconfig sets
 * `isolatedModules: true`, which puts ts-jest in transpile-only mode.)
 *
 * The 4.0.1 types are transcribed inline rather than imported from the published
 * package, so the old contract lives in the repo where a reviewer can read it.
 * Source: `git show main:packages/core/src/types/`.
 */

import { FormDefinitionEditor } from './form-definition-editor'
import { FormEngine } from './form-engine'
import { FormValuesEditor } from './form-values-editor'
import type { ContentItem, FieldContentItem } from './types/form-definition'

// ---------------------------------------------------------------------------
// The 4.0.1 public shapes, verbatim.
// ---------------------------------------------------------------------------

type LegacyFieldType = 'string' | 'number' | 'boolean' | 'date' | 'select' | 'array' | 'file'

type LegacyCondition =
    | { field: number; op: 'set' | 'notset' }
    | { field: number; op: 'eq' | 'ne' | 'lt' | 'gt' | 'lte' | 'gte'; value: unknown }
    | { field: number; op: 'in' | 'notin'; value: unknown[] }
    | { and: LegacyCondition[] }
    | { or: LegacyCondition[] }

type LegacyArrayItemDef = {
    type: Exclude<LegacyFieldType, 'array'>
    label: string
    description?: string
    validation?: Record<string, unknown>
    options?: { value: string | number; label: string }[]
}

type LegacyFieldContentItem = {
    id: number
    type: LegacyFieldType
    label: string
    description?: string
    condition?: LegacyCondition
    validation?: Record<string, unknown>
    options?: { value: string | number; label: string }[]
    item?: LegacyArrayItemDef
}

type LegacySectionContentItem = {
    id: number
    type: 'section'
    title: string
    description?: string
    condition?: LegacyCondition
    content: LegacyContentItem[]
}

type LegacyContentItem = LegacyFieldContentItem | LegacySectionContentItem

type LegacyFormDefinition = {
    id: string
    version: string
    title: string
    description?: string
    content: LegacyContentItem[]
}

type LegacyFormDocument = {
    form: { id: string; version: string; submittedAt: string }
    values: Record<string, unknown>
}

// ---------------------------------------------------------------------------
// A definition and document as a 4.0.1-era app would have written them.
// ---------------------------------------------------------------------------

const legacyDefinition = {
    id: 'legacy',
    version: '1.0.0',
    title: 'Legacy form',
    description: 'Authored against 4.0.1',
    content: [
        { id: 1, type: 'string', label: 'Name', validation: { required: true, minLength: 2 } },
        { id: 2, type: 'number', label: 'Age', validation: { min: 0, max: 130 } },
        { id: 3, type: 'boolean', label: 'Active' },
        { id: 4, type: 'date', label: 'Joined', validation: { minDate: '-1m' } },
        {
            id: 5,
            type: 'select',
            label: 'Colour',
            options: [
                { value: 'r', label: 'Red' },
                { value: 'g', label: 'Green' },
            ],
        },
        { id: 6, type: 'array', label: 'Tags', item: { type: 'string', label: 'Tag' } },
        { id: 7, type: 'file', label: 'Evidence', validation: { required: true } },
        {
            id: 8,
            type: 'section',
            title: 'Conditional',
            condition: { field: 3, op: 'eq', value: true },
            content: [{ id: 9, type: 'string', label: 'Why?', condition: { field: 1, op: 'set' } }],
        },
    ],
} satisfies LegacyFormDefinition

const legacyDocument = {
    form: { id: 'legacy', version: '1.0.0', submittedAt: '2025-06-15T00:00:00.000Z' },
    values: { '1': 'Alice', '3': true, '6': ['a'], '7': null },
} satisfies LegacyFormDocument

// ---------------------------------------------------------------------------
// Every public entry point still accepts the 4.0.1 shapes.
// ---------------------------------------------------------------------------

const engine = new FormEngine(legacyDefinition)

engine.validate(legacyDocument)
engine.getVisibilityMap(legacyDocument)
engine.isVisible(9, legacyDocument)
engine.createFormDocument(legacyDocument.values)
engine.loadDocument(engine.dumpDocument(legacyDocument))
engine.getAffectedIds(3)
engine.getFieldDef(1)

const definitionEditor = new FormDefinitionEditor(legacyDefinition)

definitionEditor
    .setTitle('Renamed')
    .setDescription('Still fine')
    .setVersion('1.0.1')
    .setValidation(1, { required: true, maxLength: 40 })
    .setCondition(2, { field: 3, op: 'eq', value: true })
    .setOptions(5, [{ value: 'b', label: 'Blue' }])
    .setArrayItem(6, { type: 'string', label: 'Tag' })
    .setLabel(1, 'Full name')
    .toJSON()

const valuesEditor = new FormValuesEditor(legacyDefinition, legacyDocument)

valuesEditor.setFieldValue(1, 'Bob').clearFieldValue(2).addArrayItem(6, 'b').setArrayItem(6, 0, 'a').toJSON()

// A 4.0.1 renderer walks `ContentItem[]` and reads a field's label. This is the
// narrowing that CHANGES.md 3.6 flags: it needs the extra `'static'` guard now.
const walk = (items: ContentItem[]): string[] =>
    items.flatMap((item) => {
        if (item.type === 'section') return walk(item.content)
        if (item.type === 'static') return []
        const field: FieldContentItem = item
        return [field.label]
    })

walk(legacyDefinition.content as unknown as ContentItem[])

// ---------------------------------------------------------------------------
// The five intentional source-level breaks from CHANGES.md 3.6.
//
// `@ts-expect-error` fails when the error *stops* occurring, so each line is a
// tripwire in both directions: if one of these is ever fixed or widened, this
// file stops compiling and the migration notes need updating.
// ---------------------------------------------------------------------------

// 1. `ContentItem` now includes the static variant, so `!== 'section'` alone no
//    longer narrows to a field with a `label`.
const breakOne = (item: ContentItem): string => {
    if (item.type === 'section') return item.title
    // @ts-expect-error -- `label` is `string | undefined` on the static member
    const label: string = item.label
    return label
}

// 2. `FieldContentItem['type']` excludes `'static'`, so a `FieldType`-typed
//    variable can no longer be assigned into it.
type CurrentFieldType = import('./types/field-types').FieldType
const breakTwo = (type: CurrentFieldType): FieldContentItem => ({
    id: 1,
    // @ts-expect-error -- `'static'` is not assignable to FieldContentItem['type']
    type,
    label: 'x',
})

// 3. `ArrayItemDef` is a union including the static variant, so `.validation`
//    is no longer present on every member.
type CurrentArrayItemDef = import('./types/array-item-def').ArrayItemDef
const breakThree = (itemDef: CurrentArrayItemDef) =>
    // @ts-expect-error -- `validation` does not exist on the static member
    itemDef.validation

// 4. ...and neither is `label` guaranteed.
const breakFour = (itemDef: CurrentArrayItemDef): string =>
    // @ts-expect-error -- `label` is `string | undefined` on the static member
    itemDef.label

// 5. `FieldEntry` gained a required `items` property, so old literals no longer
//    typecheck. Only affects hand-built fixtures and mocks.
type CurrentFieldEntry = import('./types/field-entry').FieldEntry
// @ts-expect-error -- missing the new required `items` property
const breakFive: CurrentFieldEntry = {
    id: 1,
    type: 'string',
    condition: undefined,
    validation: undefined,
    parentId: undefined,
    options: undefined,
    item: undefined,
    label: 'Name',
    title: undefined,
}

export type { LegacyFormDefinition, LegacyFormDocument }
export { breakFive, breakFour, breakOne, breakThree, breakTwo, walk }
