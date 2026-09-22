import type { ArrayItemDef } from './types/array-item-def'
import type { ArrayObjItemDef, ArrayObjKind } from './types/array-obj-item-def'
import type { Condition } from './types/conditions'
import type {
    AnyFieldContentItem,
    ContentItem,
    FieldContentItem,
    FormDefinition,
    SectionContentItem,
    StaticFieldContentItem,
} from './types/form-definition'
import type { SelectOption } from './types/select-option'
import type { TypeSpecificValidation } from './types/validation/type-specific'

/**
 * Descriptor for a field to be added via the editor.
 * `id` is optional -- when omitted the editor auto-assigns the next available id.
 *
 * Written as an explicit union rather than `Omit<AnyFieldContentItem, 'id'>`
 * because `Omit` does not distribute over a union -- it would collapse to the
 * properties the two members share, dropping `label` and `text`.
 */
export type FieldDescriptor =
    | (Omit<FieldContentItem, 'id'> & { id?: number })
    | (Omit<StaticFieldContentItem, 'id'> & { id?: number })

/**
 * Descriptor for a section to be added via the editor.
 * `id` is optional -- when omitted the editor auto-assigns the next available id.
 * `content` defaults to an empty array (items are added separately).
 */
export type SectionDescriptor = Omit<SectionContentItem, 'id' | 'content'> & {
    id?: number
    content?: ContentItem[]
}

/**
 * Flat info about a content item returned by listing methods.
 */
export type ContentItemInfo = {
    id: number
    type: ContentItem['type']
    label?: string
    title?: string
    parentId: number | undefined
}

/**
 * Mutable editor for building and modifying a {@link FormDefinition}.
 *
 * Operates directly on the definition tree. All mutating methods return
 * `this` for fluent chaining.
 *
 * @example
 * ```ts
 * const editor = new FormDefinitionEditor({
 *   id: 'my-form', version: '1.0.0', title: 'My Form', content: [],
 * })
 * editor
 *   .addField({ type: 'string', label: 'Name', validation: { required: true } })
 *   .addSection({ type: 'section', title: 'Details' })
 *   .addField({ type: 'number', label: 'Age' }, 2) // into section id=2
 *
 * const definition = editor.toJSON()
 * ```
 */
export class FormDefinitionEditor {
    private definition: FormDefinition

    constructor(definition: FormDefinition) {
        this.definition = JSON.parse(JSON.stringify(definition))
    }

    setTitle(title: string): this {
        this.definition.title = title
        return this
    }

    setDescription(description: string | undefined): this {
        if (description === undefined) {
            delete this.definition.description
        } else {
            this.definition.description = description
        }
        return this
    }

    setVersion(version: string): this {
        this.definition.version = version
        return this
    }

    setId(id: string): this {
        this.definition.id = id
        return this
    }

    /**
     * Returns the next available numeric id (max existing + 1).
     *
     * `array_obj` sub-field ids share the form-wide id space, so they count
     * here too -- otherwise a new top-level field could collide with one.
     */
    nextId(): number {
        let max = 0
        this.walkAll(this.definition.content, (item) => {
            if (item.id > max) max = item.id
            if (item.type === 'array_obj') {
                for (const subField of item.items ?? []) {
                    if (subField.id > max) max = subField.id
                }
            }
        })
        return max + 1
    }

    /**
     * Adds a field to the form.
     *
     * @param descriptor - Field properties. `id` is auto-assigned if omitted.
     * @param parentId - Section id to add into. `undefined` for top-level.
     * @param index - Position within the parent's content array. Appends if omitted.
     * @returns `this` for chaining.
     * @throws If `parentId` references a non-existent or non-section item, or if the id already exists.
     */
    addField(descriptor: FieldDescriptor, parentId?: number, index?: number): this {
        const id = descriptor.id ?? this.nextId()
        this.assertIdAvailable(id)
        const field: AnyFieldContentItem = { ...descriptor, id }
        this.insertItem(field, parentId, index)
        return this
    }

    /**
     * Adds a section to the form.
     *
     * @param descriptor - Section properties. `id` is auto-assigned if omitted.
     * @param parentId - Parent section id. `undefined` for top-level.
     * @param index - Position within the parent's content array. Appends if omitted.
     * @returns `this` for chaining.
     * @throws If `parentId` references a non-existent or non-section item, or if the id already exists.
     */
    addSection(descriptor: SectionDescriptor, parentId?: number, index?: number): this {
        const id = descriptor.id ?? this.nextId()
        this.assertIdAvailable(id)
        const section: SectionContentItem = {
            ...descriptor,
            id,
            content: descriptor.content ?? [],
        }
        this.insertItem(section, parentId, index)
        return this
    }

    /**
     * Updates properties of an existing field.
     *
     * Cannot change `id` or `type`. Use {@link removeItem} + {@link addField}
     * to change the type.
     */
    updateField(id: number, updates: Partial<Omit<FieldContentItem, 'id' | 'type'> & { text: string }>): this {
        const item = this.findItem(id)
        if (!item) throw new Error(`Item with id ${id} not found`)
        if (item.type === 'section') throw new Error(`Item ${id} is a section, not a field`)
        Object.assign(item, updates)
        return this
    }

    /**
     * Updates properties of an existing section.
     *
     * Cannot change `id`, `type`, or `content` directly. Use add/remove methods
     * for content manipulation.
     */
    updateSection(id: number, updates: Partial<Omit<SectionContentItem, 'id' | 'type' | 'content'>>): this {
        const item = this.findItem(id)
        if (!item) throw new Error(`Item with id ${id} not found`)
        if (item.type !== 'section') throw new Error(`Item ${id} is not a section`)
        Object.assign(item, updates)
        return this
    }

    /**
     * Removes a field or section (and all its descendants) by id.
     *
     * @returns `this` for chaining.
     * @throws If the id is not found.
     */
    removeItem(id: number): this {
        const removed = this.removeFromContent(this.definition.content, id)
        if (!removed) throw new Error(`Item with id ${id} not found`)
        return this
    }

    /**
     * Moves an item to a new parent and/or position.
     *
     * @param id - Id of the item to move.
     * @param targetParentId - Destination section id, or `undefined` for top-level.
     * @param index - Position in the target content array. Appends if omitted.
     */
    moveItem(id: number, targetParentId: number | undefined, index?: number): this {
        const item = this.findItem(id)
        if (!item) throw new Error(`Item with id ${id} not found`)

        // Prevent moving a section into itself or its own descendant
        if (targetParentId !== undefined && item.type === 'section') {
            if (targetParentId === id) throw new Error('Cannot move a section into itself')
            const descendantIds = this.collectDescendantIds(item as SectionContentItem)
            if (descendantIds.has(targetParentId)) {
                throw new Error('Cannot move a section into its own descendant')
            }
        }

        const clone: ContentItem = JSON.parse(JSON.stringify(item))
        this.removeFromContent(this.definition.content, id)
        this.insertItem(clone, targetParentId, index)
        return this
    }

    /**
     * Returns a flat list of all content items (fields + sections) with parent info.
     */
    listAll(): ContentItemInfo[] {
        const result: ContentItemInfo[] = []
        this.walkAllWithParent(this.definition.content, undefined, (item, parentId) => {
            result.push({
                id: item.id,
                type: item.type,
                label: item.type !== 'section' ? item.label : undefined,
                title: item.type === 'section' ? item.title : undefined,
                parentId,
            })
        })
        return result
    }

    /**
     * Returns a flat list of all fields (excludes sections).
     */
    listFields(): ContentItemInfo[] {
        return this.listAll().filter((i) => i.type !== 'section')
    }

    /**
     * Returns a flat list of all sections.
     */
    listSections(): ContentItemInfo[] {
        return this.listAll().filter((i) => i.type === 'section')
    }

    /**
     * Returns the content item with the given id, or `undefined` if not found.
     */
    getItem(id: number): ContentItem | undefined {
        return this.findItem(id) ?? undefined
    }

    /**
     * Sets or clears the validation rules for a field.
     */
    setValidation(id: number, validation: TypeSpecificValidation | undefined): this {
        const item = this.findItem(id)
        if (!item) throw new Error(`Item with id ${id} not found`)

        if (item.type === 'section') throw new Error('Sections do not have validation')
        if (item.type === 'static') throw new Error('Static fields do not have validation')

        const field = item as FieldContentItem

        if (validation === undefined) delete field.validation
        else field.validation = validation

        return this
    }

    /**
     * Sets or clears the visibility condition for a field or section.
     */
    setCondition(id: number, condition: Condition | undefined): this {
        const item = this.findItem(id)
        if (!item) throw new Error(`Item with id ${id} not found`)

        if (condition === undefined) delete item.condition
        else item.condition = condition

        return this
    }

    /**
     * Sets the options for a `select` or `multiselect` field.
     */
    setOptions(id: number, options: SelectOption[]): this {
        const item = this.findItem(id)
        if (!item) throw new Error(`Item with id ${id} not found`)

        if (item.type !== 'select' && item.type !== 'multiselect')
            throw new Error(`Field ${id} is not a select or multiselect field`)

        const field = item as FieldContentItem
        field.options = options

        return this
    }

    /**
     * Sets the item definition for an `array` field.
     */
    setArrayItem(id: number, itemDef: ArrayItemDef): this {
        const item = this.findItem(id)
        if (!item) throw new Error(`Item with id ${id} not found`)

        if (item.type !== 'array') throw new Error(`Field ${id} is not an array field`)

        const field = item as FieldContentItem
        field.item = itemDef

        return this
    }

    /**
     * Replaces the whole sub-field list of an `array_obj` field.
     *
     * @throws If the id is not found or does not refer to an `array_obj` field.
     */
    setArrayItems(id: number, itemDefs: ArrayObjItemDef[]): this {
        this.assertArrayObjField(id).items = itemDefs
        return this
    }

    /**
     * Returns the sub-field list of an `array_obj` field.
     *
     * @throws If the id is not found or does not refer to an `array_obj` field.
     */
    getArrayItems(id: number): ArrayObjItemDef[] {
        return this.assertArrayObjField(id).items ?? []
    }

    /**
     * Sets or clears the layout hint of an `array_obj` field.
     *
     * Presentation metadata only -- the engine never reads it. Passing
     * `undefined` removes the key, which reads as `'list'`.
     *
     * @throws If the id is not found or does not refer to an `array_obj` field.
     */
    setArrayKind(id: number, kind: ArrayObjKind | undefined): this {
        const field = this.assertArrayObjField(id)

        if (kind === undefined) delete field.kind
        else field.kind = kind

        return this
    }

    /**
     * Appends a sub-field to an `array_obj` field. The sub-field's `id` is
     * auto-assigned when omitted.
     *
     * @returns The id of the sub-field that was added.
     * @throws If the id is not found, does not refer to an `array_obj` field,
     *   or the requested sub-field id is already taken.
     */
    addArrayItemField(id: number, subField: Omit<ArrayObjItemDef, 'id'> & { id?: number }): number {
        const field = this.assertArrayObjField(id)
        const subFieldId = subField.id ?? this.nextId()
        this.assertIdAvailable(subFieldId)
        // biome-ignore lint/suspicious/noExplicitAny: the union does not distribute over the spread
        field.items?.push({ ...(subField as any), id: subFieldId })
        return subFieldId
    }

    /**
     * Merges properties into an existing `array_obj` sub-field.
     *
     * Like {@link updateField}, omitted properties are kept rather than
     * removed -- pass a property explicitly as `undefined` to clear it.
     *
     * @throws If the field or the sub-field is not found.
     */
    updateArrayItemField(id: number, subFieldId: number, patch: Partial<ArrayObjItemDef>): this {
        const field = this.assertArrayObjField(id)
        const subField = field.items?.find((f) => f.id === subFieldId)
        if (!subField) throw new Error(`Sub-field with id ${subFieldId} not found in field ${id}`)

        Object.assign(subField, patch, { id: subFieldId })
        return this
    }

    /**
     * Removes a sub-field from an `array_obj` field.
     *
     * @throws If the field or the sub-field is not found.
     */
    removeArrayItemField(id: number, subFieldId: number): this {
        const field = this.assertArrayObjField(id)
        const index = field.items?.findIndex((f) => f.id === subFieldId) ?? -1
        if (index < 0) throw new Error(`Sub-field with id ${subFieldId} not found in field ${id}`)

        field.items?.splice(index, 1)
        return this
    }

    /**
     * Moves a sub-field of an `array_obj` field to another position.
     *
     * @throws If the field is not found or either index is out of range.
     */
    moveArrayItemField(id: number, fromIndex: number, toIndex: number): this {
        const field = this.assertArrayObjField(id)
        const items = field.items ?? []
        if (fromIndex < 0 || fromIndex >= items.length) throw new Error(`Index ${fromIndex} out of range`)
        if (toIndex < 0 || toIndex >= items.length) throw new Error(`Index ${toIndex} out of range`)

        const [moved] = items.splice(fromIndex, 1)
        if (moved) items.splice(toIndex, 0, moved)
        return this
    }

    /**
     * Sets the label for a field.
     */
    setLabel(id: number, label: string): this {
        const item = this.findItem(id)
        if (!item) throw new Error(`Item with id ${id} not found`)

        if (item.type === 'section') throw new Error('Sections use title, not label')

        const field = item as AnyFieldContentItem
        field.label = label

        return this
    }

    /**
     * Sets the displayed text of a `static` field.
     *
     * @throws If the id is not found or does not refer to a static field.
     */
    setText(id: number, text: string): this {
        const item = this.findItem(id)
        if (!item) throw new Error(`Item with id ${id} not found`)

        if (item.type !== 'static') throw new Error(`Field ${id} is not a static field`)

        item.text = text

        return this
    }

    /**
     * Sets the description for a field or section.
     */
    setFieldDescription(id: number, description: string | undefined): this {
        const item = this.findItem(id)
        if (!item) throw new Error(`Item with id ${id} not found`)

        if (description === undefined) delete item.description
        else item.description = description

        return this
    }

    /**
     * Sets the placeholder for a field or section.
     *
     * Passing `undefined` removes the property. Unlike {@link updateField},
     * which merges and therefore cannot clear, this genuinely deletes the key.
     */
    setPlaceholder(id: number, placeholder: string | undefined): this {
        return this.setMetadata(id, 'placeholder', placeholder)
    }

    /**
     * Sets the answer guidelines for a field or section.
     *
     * Passing `undefined` removes the property.
     */
    setAnswerGuidelines(id: number, answerGuidelines: string | undefined): this {
        return this.setMetadata(id, 'answer_guidelines', answerGuidelines)
    }

    /**
     * Sets the external reference id for a field or section.
     *
     * Passing `undefined` removes the property.
     */
    setReferenceId(id: number, referenceId: string | undefined): this {
        return this.setMetadata(id, 'reference_id', referenceId)
    }

    /**
     * Assigns or deletes one optional string property on a field or section.
     */
    private setMetadata(
        id: number,
        property: 'placeholder' | 'answer_guidelines' | 'reference_id',
        value: string | undefined,
    ): this {
        const item = this.findItem(id)
        if (!item) throw new Error(`Item with id ${id} not found`)

        if (value === undefined) delete item[property]
        else item[property] = value

        return this
    }

    /**
     * Returns a deep clone of the current form definition.
     */
    toJSON(): FormDefinition {
        return JSON.parse(JSON.stringify(this.definition))
    }

    private findItem(id: number): ContentItem | undefined {
        let found: ContentItem | undefined

        this.walkAll(this.definition.content, (item) => {
            if (item.id === id) found = item
        })

        return found
    }

    private assertIdAvailable(id: number): void {
        if (this.findItem(id)) throw new Error(`Item with id ${id} already exists`)
        if (this.findArrayObjItem(id)) throw new Error(`Item with id ${id} already exists`)
    }

    /**
     * Finds an `array_obj` sub-field anywhere in the definition by its id.
     */
    private findArrayObjItem(id: number): { field: FieldContentItem; subField: ArrayObjItemDef } | undefined {
        let found: { field: FieldContentItem; subField: ArrayObjItemDef } | undefined
        this.walkAll(this.definition.content, (item) => {
            if (found || item.type !== 'array_obj') return
            const subField = (item.items ?? []).find((f) => f.id === id)
            if (subField) found = { field: item, subField }
        })
        return found
    }

    private assertArrayObjField(id: number): FieldContentItem {
        const item = this.findItem(id)
        if (!item) throw new Error(`Item with id ${id} not found`)
        if (item.type !== 'array_obj') throw new Error(`Field ${id} is not an array_obj field`)
        const field = item as FieldContentItem
        if (!field.items) field.items = []
        return field
    }

    private insertItem(item: ContentItem, parentId: number | undefined, index?: number): void {
        const target = this.getTargetContent(parentId)

        if (index !== undefined && index >= 0 && index < target.length) target.splice(index, 0, item)
        else target.push(item)
    }

    private getTargetContent(parentId: number | undefined): ContentItem[] {
        if (parentId === undefined) return this.definition.content

        const parent = this.findItem(parentId)
        if (!parent) throw new Error(`Parent section with id ${parentId} not found`)

        if (parent.type !== 'section') throw new Error(`Item ${parentId} is not a section`)

        const section = parent as SectionContentItem
        return section.content
    }

    private removeFromContent(content: ContentItem[], id: number): boolean {
        const idx = content.findIndex((item) => item.id === id)
        if (idx !== -1) {
            content.splice(idx, 1)
            return true
        }

        for (const item of content) {
            if (item.type === 'section') {
                if (this.removeFromContent((item as SectionContentItem).content, id)) return true
            }
        }

        return false
    }

    private walkAll(content: ContentItem[], fn: (item: ContentItem) => void): void {
        for (const item of content) {
            fn(item)
            if (item.type === 'section') {
                this.walkAll((item as SectionContentItem).content, fn)
            }
        }
    }

    private walkAllWithParent(
        content: ContentItem[],
        parentId: number | undefined,
        fn: (item: ContentItem, parentId: number | undefined) => void,
    ): void {
        for (const item of content) {
            fn(item, parentId)
            if (item.type === 'section') {
                this.walkAllWithParent((item as SectionContentItem).content, item.id, fn)
            }
        }
    }

    private collectDescendantIds(section: SectionContentItem): Set<number> {
        const ids = new Set<number>()
        this.walkAll(section.content, (item) => ids.add(item.id))
        return ids
    }
}
