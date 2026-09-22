import type { ArrayItemDef } from './array-item-def'
import type { ArrayObjItemDef, ArrayObjKind } from './array-obj-item-def'
import type { Condition } from './conditions'
import type { FieldType } from './field-types'
import type { SelectOption } from './select-option'
import type { TypeSpecificValidation } from './validation/type-specific'

/**
 * Top-level form definition object representing a complete form schema.
 *
 * This is the JSON document that authors create and publish. It is passed to
 * {@link prepare} to produce a {@link FormEngine}.
 *
 * @property id - Globally unique identifier for the form schema.
 * @property version - Schema version string (e.g. `"1.0.0"`).
 * @property title - Human-readable title of the form.
 * @property description - Optional description of the form's purpose.
 * @property content - Ordered list of top-level fields and sections.
 */
export type FormDefinition = {
    id: string
    version: string
    title: string
    description?: string
    content: ContentItem[]
}

/**
 * A single node in the form definition tree -- a value field, a static block
 * or a section.
 */
export type ContentItem = AnyFieldContentItem | SectionContentItem

/**
 * Any non-section node: either a value-producing field or a static block.
 *
 * Narrow with `item.type === 'static'` to reach {@link StaticFieldContentItem}'s
 * `text`, or with `item.type !== 'static'` to reach the value-field properties
 * (`label`, `validation`, `options`, `item`, `items`).
 */
export type AnyFieldContentItem = FieldContentItem | StaticFieldContentItem

/**
 * A value-producing field node within the form definition tree.
 *
 * Excludes `static`, which holds no value and has its own shape --
 * see {@link StaticFieldContentItem}.
 *
 * @property id - Unique numeric identifier.
 * @property type - The field's data type.
 * @property label - Display label shown to the user.
 * @property description - Optional help text.
 * @property placeholder - Optional placeholder text for the field's input control.
 * @property answer_guidelines - Optional guidance describing how the field should be answered.
 * @property reference_id - Optional external reference (e.g. a regulation or questionnaire item id).
 * @property condition - Visibility condition that controls whether this field is shown.
 * @property validation - Type-specific validation rules.
 * @property options - Allowed values (required for `select` and `multiselect` fields).
 * @property item - Item schema (required for `array` fields).
 * @property items - Sub-field schemas (required for `array_obj` fields).
 * @property kind - Layout hint for `array_obj` fields (`'list'` when absent).
 *   Presentation metadata only -- the engine never reads it.
 */
export type FieldContentItem = {
    id: number
    type: Exclude<FieldType, 'static'>
    label: string
    description?: string
    placeholder?: string
    answer_guidelines?: string
    reference_id?: string
    condition?: Condition
    validation?: TypeSpecificValidation
    options?: SelectOption[]
    item?: ArrayItemDef
    items?: ArrayObjItemDef[]
    kind?: ArrayObjKind
}

/**
 * A display-only text block within the form definition tree.
 *
 * Static blocks render alongside fields and honour their own `condition`, but
 * they hold no value: they never appear in form values, never carry
 * validation rules, never produce validation errors, and cannot be referenced
 * by another item's condition.
 *
 * @property id - Unique numeric identifier.
 * @property type - Always `'static'`.
 * @property text - The text to display. This is the block's content, and the
 *   only required property beyond `id` and `type`.
 * @property label - Optional heading shown above {@link text}.
 * @property description - Optional secondary text.
 * @property placeholder - Optional presentation metadata. Opaque to the engine.
 * @property answer_guidelines - Optional presentation metadata. Opaque to the engine.
 * @property reference_id - Optional external reference (e.g. a regulation or questionnaire item id).
 * @property condition - Visibility condition that controls whether this block is shown.
 */
export type StaticFieldContentItem = {
    id: number
    type: 'static'
    text: string
    label?: string
    description?: string
    placeholder?: string
    answer_guidelines?: string
    reference_id?: string
    condition?: Condition
}

/**
 * A section node that groups fields and/or child sections.
 *
 * Sections can be nested up to 3 levels deep.
 *
 * @property id - Unique numeric identifier.
 * @property type - Always `'section'`.
 * @property title - Display title for the section.
 * @property description - Optional description.
 * @property placeholder - Optional placeholder text.
 * @property answer_guidelines - Optional guidance describing how the section should be completed.
 * @property reference_id - Optional external reference (e.g. a regulation or questionnaire item id).
 * @property condition - Visibility condition. When hidden, all descendant
 *   fields and sections are also hidden.
 * @property content - Ordered list of child content items.
 */
export type SectionContentItem = {
    id: number
    type: 'section'
    title: string
    description?: string
    placeholder?: string
    answer_guidelines?: string
    reference_id?: string
    condition?: Condition
    content: ContentItem[]
}
