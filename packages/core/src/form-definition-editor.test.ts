import { FormDefinitionEditor } from './form-definition-editor'
import type { ContentItem, FieldContentItem, FormDefinition, SectionContentItem } from './types/form-definition'

const emptyDef = (): FormDefinition => ({
    id: 'test-form',
    version: '1.0.0',
    title: 'Test Form',
    content: [],
})

const defWith = (content: ContentItem[]): FormDefinition => ({
    id: 'test-form',
    version: '1.0.0',
    title: 'Test Form',
    content,
})

describe('FormDefinitionEditor', () => {
    it('deep-clones the input definition', () => {
        const original = defWith([{ id: 1, type: 'string', label: 'Name' }])
        const editor = new FormDefinitionEditor(original)
        editor.setTitle('Changed')
        expect(original.title).toBe('Test Form')
    })

    describe('meta', () => {
        it('setTitle', () => {
            const editor = new FormDefinitionEditor(emptyDef())
            editor.setTitle('New Title')
            expect(editor.toJSON().title).toBe('New Title')
        })

        it('setDescription — set and clear', () => {
            const editor = new FormDefinitionEditor(emptyDef())
            editor.setDescription('Desc')
            expect(editor.toJSON().description).toBe('Desc')
            editor.setDescription(undefined)
            expect(editor.toJSON().description).toBeUndefined()
        })

        it('setVersion', () => {
            const editor = new FormDefinitionEditor(emptyDef())
            editor.setVersion('2.0.0')
            expect(editor.toJSON().version).toBe('2.0.0')
        })

        it('setId', () => {
            const editor = new FormDefinitionEditor(emptyDef())
            editor.setId('new-id')
            expect(editor.toJSON().id).toBe('new-id')
        })
    })

    describe('nextId', () => {
        it('returns 1 for empty form', () => {
            const editor = new FormDefinitionEditor(emptyDef())
            expect(editor.nextId()).toBe(1)
        })

        it('returns max + 1 for populated form', () => {
            const editor = new FormDefinitionEditor(
                defWith([
                    { id: 5, type: 'string', label: 'A' },
                    { id: 3, type: 'string', label: 'B' },
                ]),
            )
            expect(editor.nextId()).toBe(6)
        })

        it('considers nested section ids', () => {
            const editor = new FormDefinitionEditor(
                defWith([
                    {
                        id: 10,
                        type: 'section',
                        title: 'S',
                        content: [{ id: 20, type: 'string', label: 'A' }],
                    },
                ]),
            )
            expect(editor.nextId()).toBe(21)
        })
    })

    describe('addField', () => {
        it('adds a field at top level with explicit id', () => {
            const editor = new FormDefinitionEditor(emptyDef())
            editor.addField({ id: 1, type: 'string', label: 'Name' })
            const def = editor.toJSON()
            expect(def.content).toHaveLength(1)
            expect(def.content[0]).toEqual({ id: 1, type: 'string', label: 'Name' })
        })

        it('auto-assigns id when omitted', () => {
            const editor = new FormDefinitionEditor(defWith([{ id: 3, type: 'string', label: 'A' }]))
            editor.addField({ type: 'number', label: 'B' })
            const def = editor.toJSON()
            expect(def.content[1]).toMatchObject({ id: 4, type: 'number', label: 'B' })
        })

        it('adds field into a section', () => {
            const editor = new FormDefinitionEditor(defWith([{ id: 10, type: 'section', title: 'S', content: [] }]))
            editor.addField({ id: 1, type: 'string', label: 'Inside' }, 10)
            const section = editor.toJSON().content[0] as { content: ContentItem[] }
            expect(section.content).toHaveLength(1)
            expect(section.content[0]).toMatchObject({ id: 1, label: 'Inside' })
        })

        it('inserts at specific index', () => {
            const editor = new FormDefinitionEditor(
                defWith([
                    { id: 1, type: 'string', label: 'A' },
                    { id: 2, type: 'string', label: 'C' },
                ]),
            )
            editor.addField({ id: 3, type: 'string', label: 'B' }, undefined, 1)
            const ids = editor.toJSON().content.map((c) => c.id)
            expect(ids).toEqual([1, 3, 2])
        })

        it('throws on duplicate id', () => {
            const editor = new FormDefinitionEditor(defWith([{ id: 1, type: 'string', label: 'A' }]))
            expect(() => editor.addField({ id: 1, type: 'number', label: 'B' })).toThrow(
                'Item with id 1 already exists',
            )
        })

        it('throws when parent is not a section', () => {
            const editor = new FormDefinitionEditor(defWith([{ id: 1, type: 'string', label: 'A' }]))
            expect(() => editor.addField({ id: 2, type: 'string', label: 'B' }, 1)).toThrow('not a section')
        })

        it('throws when parent does not exist', () => {
            const editor = new FormDefinitionEditor(emptyDef())
            expect(() => editor.addField({ id: 1, type: 'string', label: 'A' }, 99)).toThrow('not found')
        })

        it('adds field with all properties (select)', () => {
            const editor = new FormDefinitionEditor(emptyDef())
            editor.addField({
                id: 1,
                type: 'select',
                label: 'Color',
                description: 'Pick a color',
                options: [
                    { value: 'r', label: 'Red' },
                    { value: 'g', label: 'Green' },
                ],
                validation: { required: true },
                condition: { field: 99, op: 'set' },
            })
            const field = editor.toJSON().content[0]
            expect(field).toMatchObject({
                type: 'select',
                description: 'Pick a color',
                options: [
                    { value: 'r', label: 'Red' },
                    { value: 'g', label: 'Green' },
                ],
                validation: { required: true },
                condition: { field: 99, op: 'set' },
            })
        })

        it('adds array field with item definition', () => {
            const editor = new FormDefinitionEditor(emptyDef())
            editor.addField({
                id: 1,
                type: 'array',
                label: 'Tags',
                item: { type: 'string', label: 'Tag' },
                validation: { minItems: 1, maxItems: 5 },
            })
            const field = editor.toJSON().content[0] as FieldContentItem
            expect(field?.item).toEqual({ type: 'string', label: 'Tag' })
            expect(field?.validation).toEqual({ minItems: 1, maxItems: 5 })
        })
    })

    describe('addSection', () => {
        it('adds a section at top level', () => {
            const editor = new FormDefinitionEditor(emptyDef())
            editor.addSection({ id: 1, type: 'section', title: 'S1' })
            const def = editor.toJSON()
            expect(def.content).toHaveLength(1)
            expect(def.content[0]).toMatchObject({ id: 1, type: 'section', title: 'S1', content: [] })
        })

        it('auto-assigns id', () => {
            const editor = new FormDefinitionEditor(defWith([{ id: 5, type: 'string', label: 'A' }]))
            editor.addSection({ type: 'section', title: 'S' })
            expect(editor.toJSON().content[1]).toMatchObject({ id: 6, type: 'section' })
        })

        it('adds nested section', () => {
            const editor = new FormDefinitionEditor(defWith([{ id: 1, type: 'section', title: 'Parent', content: [] }]))
            editor.addSection({ id: 2, type: 'section', title: 'Child' }, 1)
            const parent = editor.toJSON().content[0] as { content: ContentItem[] }
            expect(parent.content).toHaveLength(1)
            expect(parent.content[0]).toMatchObject({ id: 2, title: 'Child' })
        })

        it('adds section with pre-populated content', () => {
            const editor = new FormDefinitionEditor(emptyDef())
            editor.addSection({
                id: 1,
                type: 'section',
                title: 'S',
                content: [{ id: 2, type: 'string', label: 'Inside' }],
            })
            const section = editor.toJSON().content[0] as { content: ContentItem[] }
            expect(section.content).toHaveLength(1)
        })

        it('throws on duplicate id', () => {
            const editor = new FormDefinitionEditor(defWith([{ id: 1, type: 'section', title: 'S', content: [] }]))
            expect(() => editor.addSection({ id: 1, type: 'section', title: 'S2' })).toThrow('already exists')
        })
    })

    describe('updateField', () => {
        it('updates label and description', () => {
            const editor = new FormDefinitionEditor(defWith([{ id: 1, type: 'string', label: 'Old' }]))
            editor.updateField(1, { label: 'New', description: 'Desc' })
            const field = editor.toJSON().content[0]
            expect(field).toMatchObject({ label: 'New', description: 'Desc' })
        })

        it('updates validation', () => {
            const editor = new FormDefinitionEditor(defWith([{ id: 1, type: 'string', label: 'Name' }]))
            editor.updateField(1, { validation: { required: true, minLength: 2 } })
            expect((editor.toJSON().content[0] as FieldContentItem).validation).toEqual({
                required: true,
                minLength: 2,
            })
        })

        it('throws for non-existent id', () => {
            const editor = new FormDefinitionEditor(emptyDef())
            expect(() => editor.updateField(99, { label: 'X' })).toThrow('not found')
        })

        it('throws when targeting a section', () => {
            const editor = new FormDefinitionEditor(defWith([{ id: 1, type: 'section', title: 'S', content: [] }]))
            expect(() => editor.updateField(1, { label: 'X' })).toThrow('section')
        })
    })

    describe('updateSection', () => {
        it('updates title and description', () => {
            const editor = new FormDefinitionEditor(defWith([{ id: 1, type: 'section', title: 'Old', content: [] }]))
            editor.updateSection(1, { title: 'New', description: 'Desc' })
            const section = editor.toJSON().content[0]
            expect(section).toMatchObject({ title: 'New', description: 'Desc' })
        })

        it('throws for non-section', () => {
            const editor = new FormDefinitionEditor(defWith([{ id: 1, type: 'string', label: 'A' }]))
            expect(() => editor.updateSection(1, { title: 'X' })).toThrow('not a section')
        })
    })

    describe('removeItem', () => {
        it('removes a top-level field', () => {
            const editor = new FormDefinitionEditor(
                defWith([
                    { id: 1, type: 'string', label: 'A' },
                    { id: 2, type: 'string', label: 'B' },
                ]),
            )
            editor.removeItem(1)
            expect(editor.toJSON().content).toHaveLength(1)
            expect(editor.toJSON().content[0]?.id).toBe(2)
        })

        it('removes a nested field', () => {
            const editor = new FormDefinitionEditor(
                defWith([
                    {
                        id: 10,
                        type: 'section',
                        title: 'S',
                        content: [
                            { id: 1, type: 'string', label: 'A' },
                            { id: 2, type: 'string', label: 'B' },
                        ],
                    },
                ]),
            )
            editor.removeItem(1)
            const section = editor.toJSON().content[0] as { content: ContentItem[] }
            expect(section.content).toHaveLength(1)
            expect(section.content[0]?.id).toBe(2)
        })

        it('removes a section with all descendants', () => {
            const editor = new FormDefinitionEditor(
                defWith([
                    {
                        id: 10,
                        type: 'section',
                        title: 'S',
                        content: [{ id: 1, type: 'string', label: 'A' }],
                    },
                ]),
            )
            editor.removeItem(10)
            expect(editor.toJSON().content).toHaveLength(0)
            expect(editor.getItem(1)).toBeUndefined()
        })

        it('throws for non-existent id', () => {
            const editor = new FormDefinitionEditor(emptyDef())
            expect(() => editor.removeItem(99)).toThrow('not found')
        })
    })

    describe('moveItem', () => {
        it('moves field from top-level into a section', () => {
            const editor = new FormDefinitionEditor(
                defWith([
                    { id: 1, type: 'string', label: 'A' },
                    { id: 10, type: 'section', title: 'S', content: [] },
                ]),
            )
            editor.moveItem(1, 10)
            const def = editor.toJSON()
            expect(def.content).toHaveLength(1)
            const section = def.content[0] as { content: ContentItem[] }
            expect(section.content).toHaveLength(1)
            expect(section.content[0]?.id).toBe(1)
        })

        it('moves field from section to top-level', () => {
            const editor = new FormDefinitionEditor(
                defWith([
                    {
                        id: 10,
                        type: 'section',
                        title: 'S',
                        content: [{ id: 1, type: 'string', label: 'A' }],
                    },
                ]),
            )
            editor.moveItem(1, undefined)
            const def = editor.toJSON()
            expect(def.content).toHaveLength(2)
            expect(def.content[1]?.id).toBe(1)
        })

        it('moves field to specific index', () => {
            const editor = new FormDefinitionEditor(
                defWith([
                    { id: 1, type: 'string', label: 'A' },
                    { id: 2, type: 'string', label: 'B' },
                    { id: 3, type: 'string', label: 'C' },
                ]),
            )
            editor.moveItem(3, undefined, 0)
            const ids = editor.toJSON().content.map((c) => c.id)
            expect(ids).toEqual([3, 1, 2])
        })

        it('prevents moving section into itself', () => {
            const editor = new FormDefinitionEditor(defWith([{ id: 1, type: 'section', title: 'S', content: [] }]))
            expect(() => editor.moveItem(1, 1)).toThrow('into itself')
        })

        it('prevents moving section into its own descendant', () => {
            const editor = new FormDefinitionEditor(
                defWith([
                    {
                        id: 1,
                        type: 'section',
                        title: 'Parent',
                        content: [{ id: 2, type: 'section', title: 'Child', content: [] }],
                    },
                ]),
            )
            expect(() => editor.moveItem(1, 2)).toThrow('descendant')
        })
    })

    describe('listing', () => {
        const editor = new FormDefinitionEditor(
            defWith([
                { id: 1, type: 'string', label: 'Name' },
                {
                    id: 10,
                    type: 'section',
                    title: 'Details',
                    content: [
                        { id: 2, type: 'number', label: 'Age' },
                        { id: 3, type: 'boolean', label: 'Active' },
                    ],
                },
                { id: 4, type: 'date', label: 'DOB' },
            ]),
        )

        it('listAll returns all items with parent info', () => {
            const all = editor.listAll()
            expect(all).toEqual([
                { id: 1, type: 'string', label: 'Name', title: undefined, parentId: undefined },
                { id: 10, type: 'section', label: undefined, title: 'Details', parentId: undefined },
                { id: 2, type: 'number', label: 'Age', title: undefined, parentId: 10 },
                { id: 3, type: 'boolean', label: 'Active', title: undefined, parentId: 10 },
                { id: 4, type: 'date', label: 'DOB', title: undefined, parentId: undefined },
            ])
        })

        it('listFields returns only fields', () => {
            const fields = editor.listFields()
            expect(fields).toHaveLength(4)
            expect(fields.every((f) => f.type !== 'section')).toBe(true)
        })

        it('listSections returns only sections', () => {
            const sections = editor.listSections()
            expect(sections).toHaveLength(1)
            expect(sections[0]?.id).toBe(10)
        })

        it('getItem returns the item', () => {
            const item = editor.getItem(2)
            expect(item).toMatchObject({ id: 2, type: 'number', label: 'Age' })
        })

        it('getItem returns undefined for unknown id', () => {
            expect(editor.getItem(999)).toBeUndefined()
        })
    })

    describe('setValidation', () => {
        it('sets validation on a string field', () => {
            const editor = new FormDefinitionEditor(defWith([{ id: 1, type: 'string', label: 'Name' }]))
            editor.setValidation(1, { required: true, minLength: 2, maxLength: 100 })
            expect((editor.toJSON().content[0] as FieldContentItem).validation).toEqual({
                required: true,
                minLength: 2,
                maxLength: 100,
            })
        })

        it('clears validation', () => {
            const editor = new FormDefinitionEditor(
                defWith([{ id: 1, type: 'string', label: 'Name', validation: { required: true } }]),
            )
            editor.setValidation(1, undefined)
            expect((editor.toJSON().content[0] as FieldContentItem).validation).toBeUndefined()
        })

        it('throws for sections', () => {
            const editor = new FormDefinitionEditor(defWith([{ id: 1, type: 'section', title: 'S', content: [] }]))
            expect(() => editor.setValidation(1, { required: true })).toThrow('Sections')
        })
    })

    describe('setCondition', () => {
        it('sets a simple condition', () => {
            const editor = new FormDefinitionEditor(
                defWith([
                    { id: 1, type: 'string', label: 'A' },
                    { id: 2, type: 'string', label: 'B' },
                ]),
            )
            editor.setCondition(2, { field: 1, op: 'set' })
            expect((editor.toJSON().content[1] as FieldContentItem).condition).toEqual({
                field: 1,
                op: 'set',
            })
        })

        it('sets a compound condition', () => {
            const editor = new FormDefinitionEditor(
                defWith([
                    { id: 1, type: 'string', label: 'A' },
                    { id: 2, type: 'number', label: 'B' },
                    { id: 3, type: 'string', label: 'C' },
                ]),
            )
            editor.setCondition(3, {
                and: [
                    { field: 1, op: 'set' },
                    { field: 2, op: 'gt', value: 10 },
                ],
            })
            expect((editor.toJSON().content[2] as FieldContentItem).condition).toEqual({
                and: [
                    { field: 1, op: 'set' },
                    { field: 2, op: 'gt', value: 10 },
                ],
            })
        })

        it('clears a condition', () => {
            const editor = new FormDefinitionEditor(
                defWith([
                    {
                        id: 1,
                        type: 'string',
                        label: 'A',
                        condition: { field: 2, op: 'set' },
                    },
                ]),
            )
            editor.setCondition(1, undefined)
            expect((editor.toJSON().content[0] as FieldContentItem).condition).toBeUndefined()
        })

        it('sets condition on a section', () => {
            const editor = new FormDefinitionEditor(
                defWith([
                    { id: 1, type: 'boolean', label: 'Toggle' },
                    { id: 10, type: 'section', title: 'S', content: [] },
                ]),
            )
            editor.setCondition(10, { field: 1, op: 'eq', value: true })
            expect((editor.toJSON().content[1] as FieldContentItem).condition).toEqual({
                field: 1,
                op: 'eq',
                value: true,
            })
        })
    })

    describe('setOptions', () => {
        it('sets options on a select field', () => {
            const editor = new FormDefinitionEditor(
                defWith([
                    {
                        id: 1,
                        type: 'select',
                        label: 'Color',
                        options: [{ value: 'r', label: 'Red' }],
                    },
                ]),
            )
            editor.setOptions(1, [
                { value: 'r', label: 'Red' },
                { value: 'g', label: 'Green' },
                { value: 'b', label: 'Blue' },
            ])
            expect((editor.toJSON().content[0] as FieldContentItem).options).toHaveLength(3)
        })

        it('throws for non-select field', () => {
            const editor = new FormDefinitionEditor(defWith([{ id: 1, type: 'string', label: 'A' }]))
            expect(() => editor.setOptions(1, [{ value: 'x', label: 'X' }])).toThrow('not a select')
        })
    })

    describe('setArrayItem', () => {
        it('sets item definition on an array field', () => {
            const editor = new FormDefinitionEditor(
                defWith([
                    {
                        id: 1,
                        type: 'array',
                        label: 'Tags',
                        item: { type: 'string', label: 'Tag' },
                    },
                ]),
            )
            editor.setArrayItem(1, {
                type: 'number',
                label: 'Score',
                validation: { min: 0, max: 100 },
            })
            expect((editor.toJSON().content[0] as FieldContentItem).item).toEqual({
                type: 'number',
                label: 'Score',
                validation: { min: 0, max: 100 },
            })
        })

        it('throws for non-array field', () => {
            const editor = new FormDefinitionEditor(defWith([{ id: 1, type: 'string', label: 'A' }]))
            expect(() => editor.setArrayItem(1, { type: 'string', label: 'X' })).toThrow('not an array')
        })
    })

    describe('setLabel', () => {
        it('sets label on a field', () => {
            const editor = new FormDefinitionEditor(defWith([{ id: 1, type: 'string', label: 'Old' }]))
            editor.setLabel(1, 'New')
            expect((editor.toJSON().content[0] as FieldContentItem).label).toBe('New')
        })

        it('throws for sections', () => {
            const editor = new FormDefinitionEditor(defWith([{ id: 1, type: 'section', title: 'S', content: [] }]))
            expect(() => editor.setLabel(1, 'X')).toThrow('title, not label')
        })
    })

    describe('setDescription_item', () => {
        it('sets description on a field', () => {
            const editor = new FormDefinitionEditor(defWith([{ id: 1, type: 'string', label: 'A' }]))
            editor.setFieldDescription(1, 'Help text')
            expect((editor.toJSON().content[0] as FieldContentItem).description).toBe('Help text')
        })

        it('clears description', () => {
            const editor = new FormDefinitionEditor(defWith([{ id: 1, type: 'string', label: 'A', description: 'D' }]))
            editor.setFieldDescription(1, undefined)
            expect((editor.toJSON().content[0] as FieldContentItem).description).toBeUndefined()
        })

        it('sets description on a section', () => {
            const editor = new FormDefinitionEditor(defWith([{ id: 1, type: 'section', title: 'S', content: [] }]))
            editor.setFieldDescription(1, 'Section help')
            expect((editor.toJSON().content[0] as SectionContentItem).description).toBe('Section help')
        })
    })

    describe('toJSON', () => {
        it('returns a deep clone (mutations do not leak)', () => {
            const editor = new FormDefinitionEditor(defWith([{ id: 1, type: 'string', label: 'A' }]))
            const json1 = editor.toJSON()
            editor.setTitle('Changed')
            const json2 = editor.toJSON()
            expect(json1.title).toBe('Test Form')
            expect(json2.title).toBe('Changed')
        })
    })

    describe('fluent chaining', () => {
        it('chains multiple operations', () => {
            const def = new FormDefinitionEditor(emptyDef())
                .setTitle('Employee Form')
                .setVersion('1.0.0')
                .addSection({ id: 1, type: 'section', title: 'Personal' })
                .addField({ id: 2, type: 'string', label: 'Name' }, 1)
                .addField({ id: 3, type: 'number', label: 'Age' }, 1)
                .setValidation(2, { required: true, minLength: 2 })
                .setValidation(3, { min: 0, max: 150 })
                .setCondition(3, { field: 2, op: 'set' })
                .addField({
                    id: 4,
                    type: 'select',
                    label: 'Role',
                    options: [
                        { value: 'dev', label: 'Developer' },
                        { value: 'mgr', label: 'Manager' },
                    ],
                })
                .toJSON()

            expect(def.title).toBe('Employee Form')
            expect(def.content).toHaveLength(2) // section + select
            const section = def.content[0] as { content: ContentItem[] }
            expect(section.content).toHaveLength(2) // name + age
        })
    })

    describe('addSection — additional', () => {
        it('inserts at specific index via index parameter', () => {
            const editor = new FormDefinitionEditor(
                defWith([
                    { id: 1, type: 'string', label: 'A' },
                    { id: 2, type: 'string', label: 'C' },
                ]),
            )
            editor.addSection({ id: 10, type: 'section', title: 'B' }, undefined, 1)
            const ids = editor.toJSON().content.map((c) => c.id)
            expect(ids).toEqual([1, 10, 2])
        })

        it('throws when parent is a field (non-section)', () => {
            const editor = new FormDefinitionEditor(defWith([{ id: 1, type: 'string', label: 'A' }]))
            expect(() => editor.addSection({ id: 2, type: 'section', title: 'S' }, 1)).toThrow('not a section')
        })

        it('throws when parent does not exist', () => {
            const editor = new FormDefinitionEditor(emptyDef())
            expect(() => editor.addSection({ id: 1, type: 'section', title: 'S' }, 99)).toThrow('not found')
        })

        it('adds section at 3-level deep nesting', () => {
            const editor = new FormDefinitionEditor(emptyDef())
            editor.addSection({ id: 1, type: 'section', title: 'L1' })
            editor.addSection({ id: 2, type: 'section', title: 'L2' }, 1)
            editor.addSection({ id: 3, type: 'section', title: 'L3' }, 2)
            const def = editor.toJSON()
            const l1 = def.content[0] as SectionContentItem
            const l2 = l1.content[0] as SectionContentItem
            const l3 = l2.content[0] as SectionContentItem
            expect(l3).toMatchObject({ id: 3, type: 'section', title: 'L3' })
        })
    })

    describe('moveItem — additional', () => {
        it('throws for non-existent item', () => {
            const editor = new FormDefinitionEditor(emptyDef())
            expect(() => editor.moveItem(99, undefined)).toThrow('not found')
        })

        it('moves item between two sections', () => {
            const editor = new FormDefinitionEditor(
                defWith([
                    {
                        id: 10,
                        type: 'section',
                        title: 'S1',
                        content: [{ id: 1, type: 'string', label: 'A' }],
                    },
                    { id: 20, type: 'section', title: 'S2', content: [] },
                ]),
            )
            editor.moveItem(1, 20)
            const def = editor.toJSON()
            const s1 = def.content[0] as SectionContentItem
            const s2 = def.content[1] as SectionContentItem
            expect(s1.content).toHaveLength(0)
            expect(s2.content).toHaveLength(1)
            expect(s2.content[0]?.id).toBe(1)
        })

        it('appends when index is out of bounds', () => {
            const editor = new FormDefinitionEditor(
                defWith([
                    { id: 1, type: 'string', label: 'A' },
                    { id: 2, type: 'string', label: 'B' },
                    { id: 3, type: 'string', label: 'C' },
                ]),
            )
            editor.moveItem(1, undefined, 999)
            const ids = editor.toJSON().content.map((c) => c.id)
            expect(ids).toEqual([2, 3, 1])
        })

        it('moves section with children to top-level', () => {
            const editor = new FormDefinitionEditor(
                defWith([
                    {
                        id: 10,
                        type: 'section',
                        title: 'Outer',
                        content: [
                            {
                                id: 20,
                                type: 'section',
                                title: 'Inner',
                                content: [{ id: 1, type: 'string', label: 'A' }],
                            },
                        ],
                    },
                ]),
            )
            editor.moveItem(20, undefined)
            const def = editor.toJSON()
            expect(def.content).toHaveLength(2)
            const outer = def.content[0] as SectionContentItem
            expect(outer.content).toHaveLength(0)
            const moved = def.content[1] as SectionContentItem
            expect(moved.id).toBe(20)
            expect(moved.content).toHaveLength(1)
            expect(moved.content[0]?.id).toBe(1)
        })

        it('no-op when moving to same position', () => {
            const editor = new FormDefinitionEditor(
                defWith([
                    { id: 1, type: 'string', label: 'A' },
                    { id: 2, type: 'string', label: 'B' },
                    { id: 3, type: 'string', label: 'C' },
                ]),
            )
            editor.moveItem(2, undefined, 1)
            const ids = editor.toJSON().content.map((c) => c.id)
            // After remove id=2 -> [1,3], then insert at 1 -> [1,2,3]
            expect(ids).toEqual([1, 2, 3])
        })
    })

    describe('item-not-found error paths', () => {
        it('setValidation throws for non-existent id', () => {
            const editor = new FormDefinitionEditor(emptyDef())
            expect(() => editor.setValidation(99, { required: true })).toThrow('not found')
        })

        it('setCondition throws for non-existent id', () => {
            const editor = new FormDefinitionEditor(emptyDef())
            expect(() => editor.setCondition(99, { field: 1, op: 'set' })).toThrow('not found')
        })

        it('setOptions throws for non-existent id', () => {
            const editor = new FormDefinitionEditor(emptyDef())
            expect(() => editor.setOptions(99, [{ value: 'x', label: 'X' }])).toThrow('not found')
        })

        it('setArrayItem throws for non-existent id', () => {
            const editor = new FormDefinitionEditor(emptyDef())
            expect(() => editor.setArrayItem(99, { type: 'string', label: 'X' })).toThrow('not found')
        })

        it('setLabel throws for non-existent id', () => {
            const editor = new FormDefinitionEditor(emptyDef())
            expect(() => editor.setLabel(99, 'X')).toThrow('not found')
        })

        it('setFieldDescription throws for non-existent id', () => {
            const editor = new FormDefinitionEditor(emptyDef())
            expect(() => editor.setFieldDescription(99, 'X')).toThrow('not found')
        })
    })

    describe('addField — additional', () => {
        it('appends when negative index is provided', () => {
            const editor = new FormDefinitionEditor(defWith([{ id: 1, type: 'string', label: 'A' }]))
            editor.addField({ id: 2, type: 'string', label: 'B' }, undefined, -1)
            const ids = editor.toJSON().content.map((c) => c.id)
            expect(ids).toEqual([1, 2])
        })

        it('appends when index is beyond bounds', () => {
            const editor = new FormDefinitionEditor(defWith([{ id: 1, type: 'string', label: 'A' }]))
            editor.addField({ id: 2, type: 'string', label: 'B' }, undefined, 100)
            const ids = editor.toJSON().content.map((c) => c.id)
            expect(ids).toEqual([1, 2])
        })

        it('adds field into 3-level deep section', () => {
            const editor = new FormDefinitionEditor(
                defWith([
                    {
                        id: 1,
                        type: 'section',
                        title: 'L1',
                        content: [
                            {
                                id: 2,
                                type: 'section',
                                title: 'L2',
                                content: [{ id: 3, type: 'section', title: 'L3', content: [] }],
                            },
                        ],
                    },
                ]),
            )
            editor.addField({ id: 10, type: 'string', label: 'Deep' }, 3)
            const l1 = editor.toJSON().content[0] as SectionContentItem
            const l2 = l1.content[0] as SectionContentItem
            const l3 = l2.content[0] as SectionContentItem
            expect(l3.content).toHaveLength(1)
            expect(l3.content[0]).toMatchObject({ id: 10, label: 'Deep' })
        })
    })

    describe('updateField — additional', () => {
        it('updates a nested field', () => {
            const editor = new FormDefinitionEditor(
                defWith([
                    {
                        id: 10,
                        type: 'section',
                        title: 'S',
                        content: [{ id: 1, type: 'string', label: 'Old' }],
                    },
                ]),
            )
            editor.updateField(1, { label: 'New' })
            const section = editor.toJSON().content[0] as SectionContentItem
            expect(section.content[0]).toMatchObject({ id: 1, label: 'New' })
        })

        it('no-op when updating with empty object', () => {
            const editor = new FormDefinitionEditor(defWith([{ id: 1, type: 'string', label: 'A' }]))
            editor.updateField(1, {})
            expect(editor.toJSON().content[0]).toMatchObject({ id: 1, type: 'string', label: 'A' })
        })
    })

    describe('updateSection — additional', () => {
        it('throws for non-existent id', () => {
            const editor = new FormDefinitionEditor(emptyDef())
            expect(() => editor.updateSection(99, { title: 'X' })).toThrow('not found')
        })
    })

    describe('removeItem — additional', () => {
        it('leaves empty content when removing last item from section', () => {
            const editor = new FormDefinitionEditor(
                defWith([
                    {
                        id: 10,
                        type: 'section',
                        title: 'S',
                        content: [{ id: 1, type: 'string', label: 'A' }],
                    },
                ]),
            )
            editor.removeItem(1)
            const section = editor.toJSON().content[0] as SectionContentItem
            expect(section.content).toEqual([])
        })

        it('removes item from 3-level deep structure', () => {
            const editor = new FormDefinitionEditor(
                defWith([
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
                                        content: [{ id: 10, type: 'string', label: 'Deep' }],
                                    },
                                ],
                            },
                        ],
                    },
                ]),
            )
            editor.removeItem(10)
            const l1 = editor.toJSON().content[0] as SectionContentItem
            const l2 = l1.content[0] as SectionContentItem
            const l3 = l2.content[0] as SectionContentItem
            expect(l3.content).toEqual([])
        })
    })

    describe('listing — additional', () => {
        it('listAll returns empty array for empty form', () => {
            const editor = new FormDefinitionEditor(emptyDef())
            expect(editor.listAll()).toEqual([])
        })

        it('listFields returns empty array for empty form', () => {
            const editor = new FormDefinitionEditor(emptyDef())
            expect(editor.listFields()).toEqual([])
        })

        it('listSections returns empty array for empty form', () => {
            const editor = new FormDefinitionEditor(emptyDef())
            expect(editor.listSections()).toEqual([])
        })

        it('listAll on 3-level deep structure returns correct parent ids', () => {
            const editor = new FormDefinitionEditor(
                defWith([
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
                                        content: [{ id: 10, type: 'string', label: 'Deep' }],
                                    },
                                ],
                            },
                        ],
                    },
                ]),
            )
            const all = editor.listAll()
            expect(all).toEqual([
                { id: 1, type: 'section', label: undefined, title: 'L1', parentId: undefined },
                { id: 2, type: 'section', label: undefined, title: 'L2', parentId: 1 },
                { id: 3, type: 'section', label: undefined, title: 'L3', parentId: 2 },
                { id: 10, type: 'string', label: 'Deep', title: undefined, parentId: 3 },
            ])
        })

        it('listFields on 3-level deep structure returns only fields', () => {
            const editor = new FormDefinitionEditor(
                defWith([
                    {
                        id: 1,
                        type: 'section',
                        title: 'L1',
                        content: [
                            {
                                id: 2,
                                type: 'section',
                                title: 'L2',
                                content: [{ id: 10, type: 'string', label: 'Deep' }],
                            },
                        ],
                    },
                ]),
            )
            const fields = editor.listFields()
            expect(fields).toHaveLength(1)
            expect(fields[0]).toMatchObject({ id: 10, parentId: 2 })
        })

        it('listSections on 3-level deep structure returns all sections', () => {
            const editor = new FormDefinitionEditor(
                defWith([
                    {
                        id: 1,
                        type: 'section',
                        title: 'L1',
                        content: [
                            {
                                id: 2,
                                type: 'section',
                                title: 'L2',
                                content: [{ id: 3, type: 'section', title: 'L3', content: [] }],
                            },
                        ],
                    },
                ]),
            )
            const sections = editor.listSections()
            expect(sections).toHaveLength(3)
            expect(sections.map((s) => s.id)).toEqual([1, 2, 3])
        })
    })

    // ─── LOWER PRIORITY ──────────────────────────────────────────────────

    describe('setOptions — additional', () => {
        it('sets empty options array', () => {
            const editor = new FormDefinitionEditor(
                defWith([
                    {
                        id: 1,
                        type: 'select',
                        label: 'Color',
                        options: [{ value: 'r', label: 'Red' }],
                    },
                ]),
            )
            editor.setOptions(1, [])
            expect((editor.toJSON().content[0] as FieldContentItem).options).toEqual([])
        })
    })

    describe('nextId — additional', () => {
        it('returns correct next id after removing items', () => {
            const editor = new FormDefinitionEditor(
                defWith([
                    { id: 1, type: 'string', label: 'A' },
                    { id: 5, type: 'string', label: 'B' },
                    { id: 3, type: 'string', label: 'C' },
                ]),
            )
            editor.removeItem(5)
            // max is now 3, so nextId should be 4
            expect(editor.nextId()).toBe(4)
        })
    })

    describe('setValidation — additional field types', () => {
        it('sets validation on a number field', () => {
            const editor = new FormDefinitionEditor(defWith([{ id: 1, type: 'number', label: 'Age' }]))
            editor.setValidation(1, { required: true, min: 0, max: 150 })
            expect((editor.toJSON().content[0] as FieldContentItem).validation).toEqual({
                required: true,
                min: 0,
                max: 150,
            })
        })

        it('sets validation on a date field', () => {
            const editor = new FormDefinitionEditor(defWith([{ id: 1, type: 'date', label: 'DOB' }]))
            editor.setValidation(1, { required: true, min: '2000-01-01', max: '2025-12-31' })
            expect((editor.toJSON().content[0] as FieldContentItem).validation).toEqual({
                required: true,
                min: '2000-01-01',
                max: '2025-12-31',
            })
        })

        it('sets validation on a boolean field', () => {
            const editor = new FormDefinitionEditor(defWith([{ id: 1, type: 'boolean', label: 'Agree' }]))
            editor.setValidation(1, { required: true })
            expect((editor.toJSON().content[0] as FieldContentItem).validation).toEqual({ required: true })
        })

        it('sets validation on an array field', () => {
            const editor = new FormDefinitionEditor(
                defWith([{ id: 1, type: 'array', label: 'Tags', item: { type: 'string', label: 'Tag' } }]),
            )
            editor.setValidation(1, { minItems: 1, maxItems: 10 })
            expect((editor.toJSON().content[0] as FieldContentItem).validation).toEqual({
                minItems: 1,
                maxItems: 10,
            })
        })
    })
})
