import type { ArrayItemDef } from './array-item-def'
import type { Condition } from './conditions'
import type { ContentItemType } from './field-types'
import type { SelectOption } from './select-option'
import type { TypeSpecificValidation } from './validation/type-specific'

/**
 * Flattened representation of a field or section stored in the engine's
 * internal registry.
 *
 * Created during {@link prepare} by walking the form definition tree.
 * Every content item (field or section) gets exactly one `FieldEntry`.
 *
 * @property id - Unique numeric identifier within the form.
 * @property type - Discriminator: one of the {@link FieldType} values or `'section'`.
 * @property condition - Visibility condition, if any.
 * @property validation - Validation rules, if any (always `undefined` for sections).
 * @property parentId - Id of the containing section, or `undefined` for top-level items.
 * @property options - Select options (only for `select` fields).
 * @property item - Array item definition (only for `array` fields).
 * @property label - Display label (only for fields, `undefined` for sections).
 * @property title - Display title (only for sections, `undefined` for fields).
 */
export type FieldEntry = {
    id: number
    type: ContentItemType
    condition: Condition | undefined
    validation: TypeSpecificValidation | undefined
    parentId: number | undefined
    options: SelectOption[] | undefined
    item: ArrayItemDef | undefined
    label: string | undefined
    title: string | undefined
}
