// ── Field types ──

/**
 * Union of all supported form field types.
 *
 * - `string` -- free-text input
 * - `number` -- numeric input
 * - `boolean` -- true/false toggle
 * - `date` -- date picker (ISO-8601 string value)
 * - `select` -- single selection from a predefined list
 * - `array` -- ordered list of values whose item type is any non-array field type
 * - `file` -- file upload (stores name, MIME type, size, URL)
 */
export type FieldType = 'string' | 'number' | 'boolean' | 'date' | 'select' | 'array' | 'file'

/**
 * Discriminator for every content node in a form definition.
 * Includes all {@link FieldType} values plus `'section'` for grouping containers.
 */
export type ContentItemType = FieldType | 'section'

// ── Conditions ──

/**
 * A leaf condition that compares a single field's value against an expected value.
 *
 * @property field - Numeric id of the field whose value is tested.
 * @property op - Comparison operator. `set`/`notset` ignore {@link value};
 *   `in`/`notin` expect {@link value} to be an array.
 * @property value - The reference value for the comparison. Optional for
 *   `set`/`notset` operators.
 */
export type SimpleCondition = {
    field: number
    op: 'set' | 'notset' | 'eq' | 'ne' | 'lt' | 'gt' | 'lte' | 'gte' | 'in' | 'notin'
    value?: unknown
}

/**
 * A compound condition that combines child conditions with logical AND or OR.
 *
 * - `{ and: [...] }` -- all child conditions must be true.
 * - `{ or: [...] }` -- at least one child condition must be true.
 */
export type CompoundCondition = { and: Condition[] } | { or: Condition[] }

/**
 * A condition controlling visibility of a field or section.
 * Can be a {@link SimpleCondition} or a {@link CompoundCondition} that
 * recursively nests other conditions.
 */
export type Condition = SimpleCondition | CompoundCondition

// ── Select option ──

/**
 * A single option within a `select` field's predefined list.
 *
 * @property value - The stored value when this option is chosen.
 * @property label - Human-readable display text for this option.
 */
export type SelectOption = {
    value: string | number
    label: string
}

// ── Array item definition (no id, no condition, no nested arrays) ──

/**
 * Schema for individual items inside an `array` field.
 *
 * Nested arrays are not allowed, so `type` excludes `'array'`.
 * Items do not have their own id or condition -- they inherit the parent
 * array field's identity and visibility.
 *
 * @property type - The scalar field type for each item in the array.
 * @property label - Display label for the item.
 * @property description - Optional description shown to the user.
 * @property validation - Validation rules applied to each individual item.
 * @property options - Required when {@link type} is `'select'`; the list of
 *   allowed values.
 */
export type ArrayItemDef = {
    type: Exclude<FieldType, 'array'>
    label: string
    description?: string
    validation?: Record<string, unknown>
    options?: SelectOption[]
}

// ── Validation rule shapes (as defined in form definition JSON) ──

/**
 * Validation rules for `string` fields.
 *
 * @property required - Whether a non-empty value must be provided.
 * @property minLength - Minimum character count (inclusive).
 * @property maxLength - Maximum character count (inclusive).
 * @property pattern - Regular expression the value must match.
 * @property patternMessage - Custom error message shown when `pattern` fails.
 */
export type StringValidation = {
    required?: boolean
    minLength?: number
    maxLength?: number
    pattern?: string
    patternMessage?: string
}

/**
 * Validation rules for `number` fields.
 *
 * @property required - Whether a value must be provided.
 * @property min - Minimum allowed value (inclusive).
 * @property max - Maximum allowed value (inclusive).
 */
export type NumberValidation = {
    required?: boolean
    min?: number
    max?: number
}

/**
 * Validation rules for `boolean` fields.
 *
 * @property required - Whether an explicit `true` or `false` must be provided.
 */
export type BooleanValidation = {
    required?: boolean
}

/**
 * Validation rules for `date` fields.
 *
 * Date boundaries can be absolute ISO-8601 strings or relative date
 * expressions (e.g. `"+7d"`, `"-1m"`). Relative dates are resolved at
 * validation time.
 *
 * @property required - Whether a value must be provided.
 * @property minDate - Earliest allowed date (inclusive). Absolute or relative.
 * @property maxDate - Latest allowed date (inclusive). Absolute or relative.
 */
export type DateValidation = {
    required?: boolean
    minDate?: string
    maxDate?: string
}

/**
 * Validation rules for `select` fields.
 *
 * @property required - Whether an option must be chosen.
 */
export type SelectValidation = {
    required?: boolean
}

/**
 * Validation rules for `array` fields.
 *
 * @property minItems - Minimum number of items the array must contain (inclusive).
 * @property maxItems - Maximum number of items the array may contain (inclusive).
 */
export type ArrayValidation = {
    minItems?: number
    maxItems?: number
}

/**
 * Metadata for an uploaded file.
 *
 * The engine does not handle actual file upload -- the consumer handles upload
 * and produces the `FileValue` object.
 *
 * @property name - Original file name.
 * @property mimeType - MIME type of the file.
 * @property size - File size in bytes.
 * @property url - URL where the file can be accessed.
 */
export type FileValue = {
    name: string
    mimeType: string
    size: number
    url: string
}

/**
 * Validation rules for `file` fields.
 *
 * @property required - Whether a file must be uploaded.
 */
export type FileValidation = {
    required?: boolean
}

/**
 * Union of all type-specific validation rule shapes.
 * The applicable shape depends on the field's {@link FieldType}.
 */
export type TypeSpecificValidation =
    | StringValidation
    | NumberValidation
    | BooleanValidation
    | DateValidation
    | SelectValidation
    | ArrayValidation
    | FileValidation

// ── Field registry entry ──

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

// ── Form definition (top-level) ──

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

// ── Form values ──

/**
 * A flat key-value map of user-submitted form data.
 *
 * Keys are stringified field ids (e.g. `"1"`, `"42"`). Values are the raw
 * data entered by the user, typed according to the field's {@link FieldType}.
 */
export type FormValues = Record<string, unknown>

/**
 * A complete form document containing form metadata and user-submitted values.
 *
 * This is the serialization/storage format for filled forms. The `form`
 * property links the document back to the schema that produced it, and
 * `values` holds the flat field data.
 *
 * @property form - Metadata identifying the form schema.
 * @property form.id - The form schema's unique identifier (from {@link FormDefinition.id}).
 * @property form.version - The form schema's version (from {@link FormDefinition.version}).
 * @property values - Flat key-value map of user-submitted data.
 */
export type FormDocument = {
    form: {
        id: string
        version: string
    }
    values: FormValues
}

// ── Validation results ──

/**
 * A single validation error for a specific field.
 *
 * @property fieldId - Numeric id of the field that failed validation.
 * @property rule - Machine-readable rule name (e.g. `"required"`, `"minLength"`).
 * @property message - Human-readable error description.
 * @property params - Optional parameters providing context (e.g. `{ minLength: 5, actual: 3 }`).
 * @property itemIndex - For array fields, the zero-based index of the item
 *   that failed validation. `undefined` for non-array fields.
 */
export type FieldValidationError = {
    fieldId: number
    rule: string
    message: string
    params?: Record<string, unknown>
    itemIndex?: number
}

/**
 * Aggregated result of validating all visible form fields.
 *
 * @property valid - `true` when no errors were found.
 * @property errors - List of all validation errors (empty when `valid` is `true`).
 */
export type FormValidationResult = {
    valid: boolean
    errors: FieldValidationError[]
}

// ── Semantic validation errors (thrown by prepare) ──

/**
 * Machine-readable codes for all semantic issues that can be detected
 * during form definition validation.
 *
 * | Code | Description |
 * |------|-------------|
 * | `DUPLICATE_ID` | Two or more content items share the same numeric id. |
 * | `NESTING_DEPTH` | A section is nested deeper than the allowed 3 levels. |
 * | `UNKNOWN_FIELD_REF` | A condition references a field id that does not exist in the form. |
 * | `CONDITION_REFS_SECTION` | A condition references a section id; sections have no value to compare. |
 * | `INVALID_RANGE_MIN_MAX_LENGTH` | String field has `minLength` greater than `maxLength`. |
 * | `INVALID_RANGE_MIN_MAX` | Number field has `min` greater than `max`. |
 * | `INVALID_RANGE_DATE` | Date field has absolute `minDate` later than absolute `maxDate`. |
 * | `INVALID_RANGE_ITEMS` | Array field has `minItems` greater than `maxItems`. |
 * | `INVALID_REGEX` | String field `pattern` is not a valid regular expression. |
 * | `CIRCULAR_DEPENDENCY` | Condition dependencies form a cycle (A depends on B depends on A). |
 */
export type FormDefinitionIssueCode =
    | 'SCHEMA_INVALID'
    | 'DUPLICATE_ID'
    | 'NESTING_DEPTH'
    | 'UNKNOWN_FIELD_REF'
    | 'CONDITION_REFS_SECTION'
    | 'INVALID_RANGE_MIN_MAX_LENGTH'
    | 'INVALID_RANGE_MIN_MAX'
    | 'INVALID_RANGE_DATE'
    | 'INVALID_RANGE_ITEMS'
    | 'INVALID_REGEX'
    | 'CIRCULAR_DEPENDENCY'

/**
 * A single issue found during semantic validation of a form definition.
 *
 * Semantic issues are problems that are structurally valid JSON but
 * logically invalid (e.g. duplicate ids, circular dependencies).
 *
 * @property code - Machine-readable issue code from {@link FormDefinitionIssueCode}.
 * @property message - Human-readable description of the problem.
 * @property itemId - Id of the content item involved, when applicable.
 */
export type FormDefinitionIssue = {
    code: FormDefinitionIssueCode
    message: string
    itemId?: number
}

/**
 * Error thrown by {@link prepare} when a form definition contains semantic
 * issues that prevent engine construction.
 *
 * The error message is a semicolon-separated summary of all issues.
 * Inspect {@link issues} for structured programmatic access.
 *
 * @example
 * ```ts
 * try {
 *   const engine = prepare(definition);
 * } catch (err) {
 *   if (err instanceof FormDefinitionError) {
 *     for (const issue of err.issues) {
 *       console.log(issue.code, issue.message);
 *     }
 *   }
 * }
 * ```
 */
export class FormDefinitionError extends Error {
    /** Structured list of all semantic issues found in the form definition. */
    readonly issues: FormDefinitionIssue[]

    /**
     * @param issues - One or more semantic issues that caused the error.
     */
    constructor(issues: FormDefinitionIssue[]) {
        const summary = issues.map((i) => i.message).join('; ')
        super(`Invalid form definition: ${summary}`)
        this.name = 'FormDefinitionError'
        this.issues = issues
    }
}

// ── Engine options ──

/**
 * Options that can be passed to engine methods at call time.
 *
 * @property now - Override for the current date/time. Used when resolving
 *   relative date expressions (e.g. `"+7d"`). Defaults to `new Date()`.
 */
export type EngineOptions = {
    now?: Date
}
