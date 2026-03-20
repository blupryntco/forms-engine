import type { ArrayItemDef } from './array-item-def'
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
 * A single node in the form definition tree -- either a field or a section.
 */
export type ContentItem = FieldContentItem | SectionContentItem

/**
 * A field node within the form definition tree.
 *
 * @property id - Unique numeric identifier.
 * @property type - The field's data type.
 * @property label - Display label shown to the user.
 * @property description - Optional help text.
 * @property condition - Visibility condition that controls whether this field is shown.
 * @property validation - Type-specific validation rules.
 * @property options - Allowed values (required for `select` fields).
 * @property item - Item schema (required for `array` fields).
 */
export type FieldContentItem = {
    id: number
    type: FieldType
    label: string
    description?: string
    condition?: Condition
    validation?: TypeSpecificValidation
    options?: SelectOption[]
    item?: ArrayItemDef
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
 * @property condition - Visibility condition. When hidden, all descendant
 *   fields and sections are also hidden.
 * @property content - Ordered list of child content items.
 */
export type SectionContentItem = {
    id: number
    type: 'section'
    title: string
    description?: string
    condition?: Condition
    content: ContentItem[]
}
