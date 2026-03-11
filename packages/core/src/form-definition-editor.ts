import type {
    ArrayItemDef,
    Condition,
    ContentItem,
    FieldContentItem,
    FormDefinition,
    SectionContentItem,
    SelectOption,
    TypeSpecificValidation,
} from './types'

/**
 * Descriptor for a field to be added via the editor.
 * `id` is optional -- when omitted the editor auto-assigns the next available id.
 */
export type FieldDescriptor = Omit<FieldContentItem, 'id'> & { id?: number }

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

    // ── Meta ──

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

    // ── ID generation ──

    /**
     * Returns the next available numeric id (max existing + 1).
     */
    nextId(): number {
        let max = 0
        this.walkAll(this.definition.content, (item) => {
            if (item.id > max) max = item.id
        })
        return max + 1
    }

    // ── Add ──

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
        const field: FieldContentItem = { ...descriptor, id }
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

    // ── Update ──

    /**
     * Updates properties of an existing field.
     *
     * Cannot change `id` or `type`. Use {@link removeItem} + {@link addField}
     * to change the type.
     */
    updateField(id: number, updates: Partial<Omit<FieldContentItem, 'id' | 'type'>>): this {
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

    // ── Remove ──

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

    // ── Move ──

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

    // ── Listing ──

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

    // ── Field-specific property setters ──

    /**
     * Sets or clears the validation rules for a field.
     */
    setValidation(id: number, validation: TypeSpecificValidation | undefined): this {
        const item = this.findItem(id)
        if (!item) throw new Error(`Item with id ${id} not found`)
        if (item.type === 'section') throw new Error('Sections do not have validation')
        if (validation === undefined) {
            delete (item as FieldContentItem).validation
        } else {
            ;(item as FieldContentItem).validation = validation
        }
        return this
    }

    /**
     * Sets or clears the visibility condition for a field or section.
     */
    setCondition(id: number, condition: Condition | undefined): this {
        const item = this.findItem(id)
        if (!item) throw new Error(`Item with id ${id} not found`)
        if (condition === undefined) {
            delete item.condition
        } else {
            item.condition = condition
        }
        return this
    }

    /**
     * Sets the select options for a `select` field.
     */
    setOptions(id: number, options: SelectOption[]): this {
        const item = this.findItem(id)
        if (!item) throw new Error(`Item with id ${id} not found`)
        if (item.type !== 'select') throw new Error(`Field ${id} is not a select field`)
        ;(item as FieldContentItem).options = options
        return this
    }

    /**
     * Sets the item definition for an `array` field.
     */
    setArrayItem(id: number, itemDef: ArrayItemDef): this {
        const item = this.findItem(id)
        if (!item) throw new Error(`Item with id ${id} not found`)
        if (item.type !== 'array') throw new Error(`Field ${id} is not an array field`)
        ;(item as FieldContentItem).item = itemDef
        return this
    }

    /**
     * Sets the label for a field.
     */
    setLabel(id: number, label: string): this {
        const item = this.findItem(id)
        if (!item) throw new Error(`Item with id ${id} not found`)
        if (item.type === 'section') throw new Error('Sections use title, not label')
        ;(item as FieldContentItem).label = label
        return this
    }

    /**
     * Sets the description for a field or section.
     */
    setDescription_item(id: number, description: string | undefined): this {
        const item = this.findItem(id)
        if (!item) throw new Error(`Item with id ${id} not found`)
        if (description === undefined) {
            delete item.description
        } else {
            item.description = description
        }
        return this
    }

    // ── Output ──

    /**
     * Returns a deep clone of the current form definition.
     */
    toJSON(): FormDefinition {
        return JSON.parse(JSON.stringify(this.definition))
    }

    // ── Private helpers ──

    private findItem(id: number): ContentItem | undefined {
        let found: ContentItem | undefined
        this.walkAll(this.definition.content, (item) => {
            if (item.id === id) found = item
        })
        return found
    }

    private assertIdAvailable(id: number): void {
        if (this.findItem(id)) {
            throw new Error(`Item with id ${id} already exists`)
        }
    }

    private insertItem(item: ContentItem, parentId: number | undefined, index?: number): void {
        const target = this.getTargetContent(parentId)
        if (index !== undefined && index >= 0 && index < target.length) {
            target.splice(index, 0, item)
        } else {
            target.push(item)
        }
    }

    private getTargetContent(parentId: number | undefined): ContentItem[] {
        if (parentId === undefined) return this.definition.content

        const parent = this.findItem(parentId)
        if (!parent) throw new Error(`Parent section with id ${parentId} not found`)
        if (parent.type !== 'section') throw new Error(`Item ${parentId} is not a section`)
        return (parent as SectionContentItem).content
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
