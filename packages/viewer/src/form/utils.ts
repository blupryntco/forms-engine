import type {
    AnyFieldContentItem,
    ArrayItemDef,
    ArrayObjItemDef,
    ContentItem,
    FieldContentItem,
    FieldValidationError,
    SectionContentItem,
} from '@bluprynt/forms-core'

/**
 * Retrieves validation errors for a specific field from the pre-indexed error map.
 *
 * Uses O(1) map lookup by `fieldId`. When `itemIndex` is omitted, returns only
 * **field-level** errors (those without an `itemIndex`). When `itemIndex` is
 * provided, returns only **item-level** errors matching the given array item index.
 *
 * @param fieldErrors - Map from field id to its validation errors.
 * @param fieldId - The numeric ID of the field to retrieve errors for.
 * @param itemIndex - Optional zero-based index of the array item. When omitted, only
 *   field-level errors (where `itemIndex` is `null` / `undefined`) are returned.
 * @returns Errors for the given field (and optionally item index). Empty array if none.
 *
 * @example
 * ```ts
 * // Field-level errors only (no itemIndex on the error)
 * getFieldErrors(fieldErrors, 5)
 *
 * // Errors for the third item of array field 5
 * getFieldErrors(fieldErrors, 5, 2)
 * ```
 */
export const getFieldErrors = (
    fieldErrors: Map<number, FieldValidationError[]>,
    fieldId: number,
    itemIndex?: number,
): FieldValidationError[] => {
    const errors = fieldErrors.get(fieldId) ?? []
    if (itemIndex === undefined) return errors.filter((e) => e.itemIndex == null)
    return errors.filter((e) => e.itemIndex === itemIndex)
}

/**
 * Creates a synthetic {@link FieldContentItem} that represents a single item inside an array field.
 *
 * Array fields store their per-item schema in `arrayField.item` ({@link ArrayItemDef}).
 * Components that render individual array items need a standard `FieldContentItem` shape,
 * so this helper projects the item definition into one, preserving the parent field's `id`
 * while adopting the item's `type`, `label`, authoring metadata, `validation`, and `options`.
 *
 * A `static` item projects to a `StaticFieldContentItem`, so the return type is
 * the wider {@link AnyFieldContentItem}.
 *
 * @param arrayField - The array field definition whose `.item` property describes the item schema.
 * @param _index - The zero-based position of the item in the array (reserved for future use,
 *   e.g. per-item overrides).
 * @returns An `AnyFieldContentItem` that can be passed directly to a typed field component.
 *
 * @example
 * ```ts
 * const arrayField: FieldContentItem = {
 *   id: 10, type: 'array', label: 'Tags',
 *   item: { type: 'string', label: 'Tag' },
 * }
 *
 * const itemDef = getArrayField(arrayField, 0)
 * // → { id: 10, type: 'string', label: 'Tag', ... }
 * ```
 */
export const getArrayField = (arrayField: FieldContentItem, _index: number): AnyFieldContentItem => {
    const itemDef = arrayField.item as ArrayItemDef
    const metadata = {
        description: itemDef.description,
        placeholder: itemDef.placeholder,
        answer_guidelines: itemDef.answer_guidelines,
        reference_id: itemDef.reference_id,
    }

    if (itemDef.type === 'static') {
        return { id: arrayField.id, type: 'static', text: itemDef.text, label: itemDef.label, ...metadata }
    }

    return {
        id: arrayField.id,
        type: itemDef.type,
        label: itemDef.label,
        ...metadata,
        validation: itemDef.validation as FieldContentItem['validation'],
        options: itemDef.options,
    }
}

/**
 * Creates a {@link AnyFieldContentItem} representing one sub-field of an `array_obj` field.
 *
 * Unlike an `array` item, a sub-field carries its own id, so the projection keeps it:
 * it is both the key its value is stored under inside each row and a stable React key.
 *
 * @param subField - The sub-field definition taken from the field's `items` list.
 * @returns An `AnyFieldContentItem` that can be passed directly to a typed field component.
 */
export const getArrayObjField = (subField: ArrayObjItemDef): AnyFieldContentItem => {
    const metadata = {
        description: subField.description,
        placeholder: subField.placeholder,
        answer_guidelines: subField.answer_guidelines,
        reference_id: subField.reference_id,
    }

    if (subField.type === 'static') {
        return { id: subField.id, type: 'static', text: subField.text, label: subField.label, ...metadata }
    }

    return {
        id: subField.id,
        type: subField.type,
        label: subField.label,
        ...metadata,
        validation: subField.validation as FieldContentItem['validation'],
        options: subField.options,
    }
}

/**
 * Retrieves the validation errors for one sub-field of one row of an `array_obj` field.
 *
 * Errors for an `array_obj` are all stored under the container's id; the row is
 * identified by `itemIndex` and the sub-field by `itemFieldId`.
 *
 * @param fieldErrors - Map from field id to its validation errors.
 * @param fieldId - The numeric id of the `array_obj` field.
 * @param index - Zero-based row index.
 * @param subFieldId - The numeric id of the sub-field.
 * @returns Errors for that cell. Empty array if none.
 */
export const getArrayObjItemErrors = (
    fieldErrors: Map<number, FieldValidationError[]>,
    fieldId: number,
    index: number,
    subFieldId: number,
): FieldValidationError[] =>
    (fieldErrors.get(fieldId) ?? []).filter((e) => e.itemIndex === index && e.itemFieldId === subFieldId)

/**
 * Retrieves the row-level validation errors for one row of an `array_obj` field --
 * those carrying an `itemIndex` but no `itemFieldId`, such as a row that is not an object.
 */
export const getArrayObjRowErrors = (
    fieldErrors: Map<number, FieldValidationError[]>,
    fieldId: number,
    index: number,
): FieldValidationError[] =>
    (fieldErrors.get(fieldId) ?? []).filter((e) => e.itemIndex === index && e.itemFieldId == null)

/**
 * Recursively searches content items for a section with the given id.
 *
 * Walks the content tree depth-first, checking sections and their nested
 * content. Returns the first matching {@link SectionContentItem}, or
 * `undefined` if no section with that id exists.
 *
 * @param items - The content items to search through.
 * @param sectionId - The numeric id of the section to find.
 * @returns The matching section, or `undefined` if not found.
 *
 * @example
 * ```ts
 * const section = findSection(definition.content, 42)
 * if (section) {
 *   // render section.content
 * }
 * ```
 */
export const findSection = (items: ContentItem[], sectionId: number): SectionContentItem | undefined => {
    for (const item of items) {
        if (item.type === 'section') {
            if (item.id === sectionId) return item
            const found = findSection(item.content, sectionId)
            if (found) return found
        }
    }
    return undefined
}
