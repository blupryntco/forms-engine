import type { ErrorObject } from 'ajv'
import Ajv2020 from 'ajv/dist/2020'

import { isOutOfRangeRelativeDate, isRelativeDate } from './date-utils'
import { DependencyGraph } from './dependency-graph'
import formDefinitionSchema from './form-definition.schema.json'
import { isUnsafePattern } from './regex-safety'
import type { Condition } from './types/conditions'
import type { FieldEntry } from './types/field-entry'
import type { ContentItem, FormDefinition } from './types/form-definition'
import type { ArrayValidation } from './types/validation/array'
import type { DateValidation } from './types/validation/date'
import type { NumberValidation } from './types/validation/number'
import type { StringValidation } from './types/validation/string'
import type { DocumentValidationError } from './types/validation-results'

// Stops at the first failing path: with `allErrors` every `oneOf` branch reports all its errors,
// so a small invalid definition produces hundreds of thousands of them.
const ajv = new Ajv2020({ allErrors: false })
const validateFn = ajv.compile(formDefinitionSchema)

/** Sections may nest this many levels deep. */
const maxSectionDepth = 3

/** `and`/`or` groups may nest this many levels deep inside one condition. */
const maxConditionDepth = 16

/** Content items, `array_obj` sub-fields, select options and condition nodes allowed in one definition. */
const maxDefinitionNodes = 5000

/** One pending node of the iterative limits walk, with the depth of its enclosing structure. */
type LimitsFrame =
    | { kind: 'content'; value: unknown; sectionDepth: number }
    | { kind: 'condition'; value: unknown; conditionDepth: number; itemId: number | undefined }
    | { kind: 'leaf' }

type SchemaIssue = {
    path: string
    keyword: string
    message: string
    property?: string
}

const itemRequiredProperties = new Map<string, Set<string>>([
    ['string', new Set(['id', 'type', 'label'])],
    ['number', new Set(['id', 'type', 'label'])],
    ['boolean', new Set(['id', 'type', 'label'])],
    ['date', new Set(['id', 'type', 'label'])],
    ['select', new Set(['id', 'type', 'label', 'options'])],
    ['multiselect', new Set(['id', 'type', 'label', 'options'])],
    ['array', new Set(['id', 'type', 'label', 'item'])],
    ['array_obj', new Set(['id', 'type', 'label', 'items'])],
    ['file', new Set(['id', 'type', 'label'])],
    ['blockchain', new Set(['id', 'type', 'label'])],
    ['sustainability', new Set(['id', 'type', 'label'])],
    ['static', new Set(['id', 'type', 'text'])],
    ['section', new Set(['id', 'type', 'title', 'content'])],
])

const itemAllowedProperties = new Map<string, Set<string>>([
    [
        'string',
        new Set([
            'id',
            'type',
            'label',
            'description',
            'placeholder',
            'answer_guidelines',
            'reference_id',
            'condition',
            'validation',
        ]),
    ],
    [
        'number',
        new Set([
            'id',
            'type',
            'label',
            'description',
            'placeholder',
            'answer_guidelines',
            'reference_id',
            'condition',
            'validation',
        ]),
    ],
    [
        'boolean',
        new Set([
            'id',
            'type',
            'label',
            'description',
            'placeholder',
            'answer_guidelines',
            'reference_id',
            'condition',
            'validation',
        ]),
    ],
    [
        'date',
        new Set([
            'id',
            'type',
            'label',
            'description',
            'placeholder',
            'answer_guidelines',
            'reference_id',
            'condition',
            'validation',
        ]),
    ],
    [
        'select',
        new Set([
            'id',
            'type',
            'label',
            'description',
            'placeholder',
            'answer_guidelines',
            'reference_id',
            'condition',
            'options',
            'validation',
        ]),
    ],
    [
        'multiselect',
        new Set([
            'id',
            'type',
            'label',
            'description',
            'placeholder',
            'answer_guidelines',
            'reference_id',
            'condition',
            'options',
            'validation',
        ]),
    ],
    [
        'array',
        new Set([
            'id',
            'type',
            'label',
            'description',
            'placeholder',
            'answer_guidelines',
            'reference_id',
            'condition',
            'item',
            'validation',
        ]),
    ],
    [
        'array_obj',
        new Set([
            'id',
            'type',
            'label',
            'description',
            'placeholder',
            'answer_guidelines',
            'reference_id',
            'condition',
            'items',
            'kind',
            'validation',
        ]),
    ],
    [
        'file',
        new Set([
            'id',
            'type',
            'label',
            'description',
            'placeholder',
            'answer_guidelines',
            'reference_id',
            'condition',
            'validation',
        ]),
    ],
    [
        'blockchain',
        new Set([
            'id',
            'type',
            'label',
            'description',
            'placeholder',
            'answer_guidelines',
            'reference_id',
            'condition',
            'validation',
        ]),
    ],
    [
        'sustainability',
        new Set([
            'id',
            'type',
            'label',
            'description',
            'placeholder',
            'answer_guidelines',
            'reference_id',
            'condition',
            'validation',
        ]),
    ],
    [
        'static',
        new Set([
            'id',
            'type',
            'text',
            'label',
            'description',
            'placeholder',
            'answer_guidelines',
            'reference_id',
            'condition',
        ]),
    ],
    [
        'section',
        new Set([
            'id',
            'type',
            'title',
            'description',
            'placeholder',
            'answer_guidelines',
            'reference_id',
            'condition',
            'content',
        ]),
    ],
])

/**
 * Validates form definitions at both the structural (JSON Schema) and
 * semantic levels.
 *
 * Used by {@link FormEngine} during construction before building the engine.
 *
 * ### Limits validation (`validateLimits`)
 * Runs before the schema check, without recursion, so a hostile definition
 * cannot overflow the stack. Reports `NESTING_DEPTH` for sections deeper than
 * 3 levels or `and`/`or` groups deeper than 16 levels, and
 * `DEFINITION_TOO_LARGE` past 5000 nodes (select options included).
 *
 * ### Schema validation (`validateSchema`)
 * Runs the limits check, then validates raw input against the form definition
 * JSON Schema. Returns the limits issues, or `SCHEMA_INVALID` issues for the
 * first violation found.
 *
 * ### Semantic validation (`validate`)
 * Checks for logical issues that go beyond JSON schema validity:
 * 1. **Duplicate IDs** (`DUPLICATE_ID`) -- every content item id must be unique.
 *    `array_obj` sub-field ids share that id space and are checked with it.
 * 2. **Nesting depth** (`NESTING_DEPTH`) -- sections may not be nested more
 *    than 3 levels deep.
 * 3. **Unknown field references** (`UNKNOWN_FIELD_REF`) -- conditions must
 *    only reference field ids that exist in the registry.
 * 4. **Condition references a valueless item** (`CONDITION_REFS_SECTION`,
 *    `CONDITION_REFS_STATIC`) -- conditions must not reference section or
 *    static ids, because neither holds a value.
 * 4b. **Condition references an `array_obj` sub-field** (`CONDITION_REFS_ARRAY_OBJ_ITEM`)
 *    -- a sub-field holds one value per row, so a form-level condition cannot
 *    say which row it means.
 * 4c. **Out-of-range relative date** (`INVALID_RELATIVE_DATE`) -- a condition value
 *    shaped like `[+-]<amount><unit>` must have an amount of at most 5 digits.
 * 5. **Constraint contradictions** (`INVALID_MIN_MAX`) -- e.g. `minLength > maxLength`,
 *    `min > max`, `minDate > maxDate` (absolute dates only), `minItems > maxItems`.
 * 6. **Invalid regex** (`INVALID_REGEX`) -- string field `pattern` values must
 *    be valid regular expressions. Covers `array` items and `array_obj` sub-fields too.
 * 7. **Unsafe regex** (`UNSAFE_REGEX`) -- a valid `pattern` must not nest a repeating
 *    quantifier inside a repeated group (e.g. `^(a+)+$`), which backtracks catastrophically.
 */
export class FormDefinitionValidator {
    /**
     * Checks nesting depth and node count of raw input with an explicit stack,
     * so it is safe to run before any recursive walk. Input of unexpected shape
     * is skipped and left to {@link validateSchema}.
     *
     * @returns `NESTING_DEPTH` and `DEFINITION_TOO_LARGE` issues. Empty when the input is within limits.
     */
    validateLimits(input: unknown): DocumentValidationError[] {
        const issues: DocumentValidationError[] = []
        if (!this.isRecord(input) || !Array.isArray(input.content)) return issues

        const stack: LimitsFrame[] = []
        this.pushReversed(stack, input.content, (value) => ({ kind: 'content', value, sectionDepth: 0 }))

        let nodeCount = 0
        while (stack.length > 0) {
            const frame = stack.pop() as LimitsFrame
            nodeCount += 1
            if (nodeCount > maxDefinitionNodes) {
                issues.push({
                    code: 'DEFINITION_TOO_LARGE',
                    message: `Form definition exceeds the maximum of ${maxDefinitionNodes} nodes`,
                })
                break
            }

            if (frame.kind === 'content') this.expandContentFrame(frame, stack, issues)
            else if (frame.kind === 'condition') this.expandConditionFrame(frame, stack, issues)
        }

        return issues
    }

    /**
     * Queues the condition, sub-fields and nested content of one content item.
     * Any item with a `content` array is descended, not only sections, because
     * the schema check would recurse into it as well.
     */
    private expandContentFrame(
        frame: Extract<LimitsFrame, { kind: 'content' }>,
        stack: LimitsFrame[],
        issues: DocumentValidationError[],
    ): void {
        const item = frame.value
        if (!this.isRecord(item)) return
        const itemId = typeof item.id === 'number' ? item.id : undefined

        if (item.condition !== undefined) {
            stack.push({ kind: 'condition', value: item.condition, conditionDepth: 0, itemId })
        }
        this.pushOptionLeaves(stack, item)
        if (this.isRecord(item.item)) this.pushOptionLeaves(stack, item.item)
        if (Array.isArray(item.items)) {
            for (const subField of item.items) {
                stack.push({ kind: 'leaf' })
                if (this.isRecord(subField)) this.pushOptionLeaves(stack, subField)
            }
        }
        if (!Array.isArray(item.content)) return

        if (frame.sectionDepth >= maxSectionDepth) {
            issues.push({
                code: 'NESTING_DEPTH',
                message: `Section nesting exceeds maximum depth of ${maxSectionDepth}: ${itemId}`,
                itemId,
            })
            return
        }
        const sectionDepth = frame.sectionDepth + 1
        this.pushReversed(stack, item.content, (value) => ({ kind: 'content', value, sectionDepth }))
    }

    /** Queues the children of an `and`/`or` group, or reports it when it nests too deep. */
    private expandConditionFrame(
        frame: Extract<LimitsFrame, { kind: 'condition' }>,
        stack: LimitsFrame[],
        issues: DocumentValidationError[],
    ): void {
        const condition = frame.value
        if (!this.isRecord(condition)) return

        // Both keys are walked: the schema check tries every `oneOf` branch, so it recurses into each.
        const children = [
            ...(Array.isArray(condition.and) ? condition.and : []),
            ...(Array.isArray(condition.or) ? condition.or : []),
        ]
        if (children.length === 0) return

        if (frame.conditionDepth >= maxConditionDepth) {
            issues.push({
                code: 'NESTING_DEPTH',
                message: `Condition nesting exceeds maximum depth of ${maxConditionDepth} (in item ${frame.itemId})`,
                itemId: frame.itemId,
            })
            return
        }
        const conditionDepth = frame.conditionDepth + 1
        this.pushReversed(stack, children, (value) => ({
            kind: 'condition',
            value,
            conditionDepth,
            itemId: frame.itemId,
        }))
    }

    /** Queues one leaf per entry of the field's `options`, so select options count toward the node limit. */
    private pushOptionLeaves(stack: LimitsFrame[], field: Record<string, unknown>): void {
        if (!Array.isArray(field.options)) return
        for (let i = 0; i < field.options.length; i += 1) stack.push({ kind: 'leaf' })
    }

    /** Pushes frames for `values` in reverse, so they pop in document order. */
    private pushReversed(stack: LimitsFrame[], values: unknown[], toFrame: (value: unknown) => LimitsFrame): void {
        for (let i = values.length - 1; i >= 0; i -= 1) stack.push(toFrame(values[i]))
    }

    /**
     * Checks {@link validateLimits} first, then validates raw input against the
     * form definition JSON schema. The schema check stops at the first failing
     * path, so it reports the first violation it meets, not every one.
     *
     * @param input - The raw input to validate.
     * @returns `NESTING_DEPTH` / `DEFINITION_TOO_LARGE` issues when the input is over the limits,
     *   otherwise `SCHEMA_INVALID` issues. Empty when the input conforms to the schema.
     */
    validateSchema(input: unknown): DocumentValidationError[] {
        const limitIssues = this.validateLimits(input)
        if (limitIssues.length > 0) return limitIssues

        if (validateFn(input)) return []

        return this.formatSchemaErrors(validateFn.errors ?? [], input)
    }

    private formatSchemaErrors(errors: ErrorObject[], input: unknown): DocumentValidationError[] {
        const issues = this.collectSchemaIssues(errors, input)
        const dedupedIssues = this.deduplicateSchemaIssues(issues)
        const coveredPaths = this.collectCoveredPaths(dedupedIssues)

        return dedupedIssues
            .filter((issue) => !(issue.keyword === 'oneOf' && coveredPaths.has(issue.path)))
            .map((issue) => ({
                code: 'SCHEMA_INVALID',
                message: issue.message,
                params: {
                    path: issue.path,
                    keyword: issue.keyword,
                    ...(issue.property ? { property: issue.property } : {}),
                },
            }))
    }

    private collectSchemaIssues(errors: ErrorObject[], input: unknown): SchemaIssue[] {
        const additionalByPath = new Map<string, Set<string>>()
        const issues: SchemaIssue[] = []

        for (const err of errors) {
            const path = err.instancePath || '/'

            if (!this.shouldKeepSchemaError(err, input)) continue

            if (err.keyword === 'additionalProperties') {
                const property = (err.params as { additionalProperty?: string }).additionalProperty
                if (!property) continue
                if (!this.shouldKeepAdditionalPropertyError(path, property, input)) continue

                const properties = additionalByPath.get(path) ?? new Set<string>()
                properties.add(property)
                additionalByPath.set(path, properties)
                continue
            }

            issues.push(this.formatSchemaIssue(err))
        }

        for (const [path, properties] of additionalByPath) {
            issues.push(this.formatAdditionalPropertiesIssue(path, [...properties].sort()))
        }

        return issues
    }

    private shouldKeepSchemaError(err: ErrorObject, input: unknown): boolean {
        if (err.keyword === 'const' && this.getLastPathSegment(err.instancePath) === 'type') {
            const value = this.getValueAtPath(input, this.getParentPath(err.instancePath))
            return !(this.isRecord(value) && typeof value.type === 'string' && itemAllowedProperties.has(value.type))
        }

        if (err.keyword !== 'required') return true

        const missingProperty = (err.params as { missingProperty?: string }).missingProperty
        if (!missingProperty) return true

        const value = this.getValueAtPath(input, err.instancePath)
        if (this.isRecord(value) && value.type === undefined && this.isContentItemPath(err.instancePath)) {
            return missingProperty === 'id' || missingProperty === 'type'
        }

        if (!this.isRecord(value) || typeof value.type !== 'string') return true

        const requiredProperties = itemRequiredProperties.get(value.type)
        return requiredProperties ? requiredProperties.has(missingProperty) : true
    }

    private shouldKeepAdditionalPropertyError(path: string, property: string, input: unknown): boolean {
        const value = this.getValueAtPath(input, path)
        if (!this.isRecord(value) || typeof value.type !== 'string') return true

        const allowedProperties = itemAllowedProperties.get(value.type)
        return allowedProperties ? !allowedProperties.has(property) : true
    }

    private formatSchemaIssue(err: ErrorObject): SchemaIssue {
        const path = err.instancePath || '/'

        switch (err.keyword) {
            case 'required': {
                const property = (err.params as { missingProperty?: string }).missingProperty ?? 'unknown'
                return {
                    path,
                    keyword: err.keyword,
                    property,
                    message: `${this.formatPath(path)} is missing required property "${property}".`,
                }
            }
            case 'const': {
                const propertyPath = this.formatPath(path)
                const parentPath = this.getParentPath(path)
                const property = this.getLastPathSegment(path)

                return {
                    path,
                    keyword: err.keyword,
                    property,
                    message:
                        property === 'type'
                            ? `${this.formatPath(parentPath)} has an invalid type.`
                            : `${propertyPath} has an invalid value.`,
                }
            }
            case 'type': {
                const params = err.params as { type?: string }
                return {
                    path,
                    keyword: err.keyword,
                    property: this.getLastPathSegment(path),
                    message: `${this.formatPath(path)} must be ${this.formatArticle(params.type)} ${params.type ?? 'valid value'}.`,
                }
            }
            case 'oneOf':
                return {
                    path,
                    keyword: err.keyword,
                    message: `${this.formatPath(path)} is invalid.`,
                }
            default:
                return {
                    path,
                    keyword: err.keyword,
                    property: this.getLastPathSegment(path),
                    message: `${this.formatPath(path)} ${err.message ?? 'is invalid'}.`,
                }
        }
    }

    private formatAdditionalPropertiesIssue(path: string, properties: string[]): SchemaIssue {
        const propertyList = properties.map((property) => `"${property}"`).join(', ')
        const noun = properties.length === 1 ? 'property' : 'properties'

        return {
            path,
            keyword: 'additionalProperties',
            property: properties.join(','),
            message: `${this.formatPath(path)} has unsupported ${noun}: ${propertyList}.`,
        }
    }

    private deduplicateSchemaIssues(issues: SchemaIssue[]): SchemaIssue[] {
        const seen = new Set<string>()
        const result: SchemaIssue[] = []

        for (const issue of issues) {
            const key = `${issue.path}:${issue.keyword}:${issue.property ?? ''}:${issue.message}`
            if (seen.has(key)) continue

            seen.add(key)
            result.push(issue)
        }

        return result
    }

    /**
     * Collects the path of every non-`oneOf` issue and all its ancestor paths.
     * A `oneOf` issue at one of these paths is redundant: a more specific issue
     * sits at or below it.
     */
    private collectCoveredPaths(issues: SchemaIssue[]): Set<string> {
        const covered = new Set<string>()
        for (const issue of issues) {
            if (issue.keyword === 'oneOf') continue
            const path = issue.path
            covered.add(path)
            for (let index = path.lastIndexOf('/'); index > 0; index = path.lastIndexOf('/', index - 1)) {
                covered.add(path.slice(0, index))
            }
        }
        return covered
    }

    private formatPath(path: string): string {
        if (!path || path === '/') return 'Form definition'

        const segments = path.split('/').filter(Boolean)
        const parts: string[] = []

        for (let index = 0; index < segments.length; index += 1) {
            const segment = segments[index]
            const nextSegment = segments[index + 1]
            if (segment === undefined) continue

            if (segment === 'content' && nextSegment !== undefined && /^\d+$/.test(nextSegment)) {
                parts.push(`${parts.length === 0 ? 'Content' : 'content'} item ${Number(nextSegment) + 1}`)
                index += 1
                continue
            }

            if (segment === 'validation' && parts.length > 0) {
                parts[parts.length - 1] = `${parts[parts.length - 1]} validation`
                continue
            }

            parts.push(segment)
        }

        return parts.join(' > ')
    }

    private getValueAtPath(input: unknown, path: string): unknown {
        if (!path) return input

        return path
            .split('/')
            .filter(Boolean)
            .reduce<unknown>((value, segment) => {
                if (Array.isArray(value)) return value[Number(segment)]
                if (this.isRecord(value)) return value[segment]
                return undefined
            }, input)
    }

    private getParentPath(path: string): string {
        const segments = path.split('/').filter(Boolean)
        return segments.length > 1 ? `/${segments.slice(0, -1).join('/')}` : '/'
    }

    private getLastPathSegment(path: string): string | undefined {
        return path.split('/').filter(Boolean).at(-1)
    }

    private isContentItemPath(path: string): boolean {
        const segments = path.split('/').filter(Boolean)
        return segments.at(-2) === 'content' && /^\d+$/.test(segments.at(-1) ?? '')
    }

    private formatArticle(value: string | undefined): string {
        if (!value) return 'a'

        return /^[aeiou]/i.test(value) ? 'an' : 'a'
    }

    private isRecord(value: unknown): value is Record<string, unknown> {
        return typeof value === 'object' && value !== null && !Array.isArray(value)
    }

    /**
     * Validates a form definition semantically.
     *
     * @param definition - The form definition to validate.
     * @param registry - The flattened field registry built from the definition.
     * @returns Array of issues found. Empty if the definition is semantically valid.
     */
    validate(definition: FormDefinition, registry: Map<number, FieldEntry>): DocumentValidationError[] {
        const issues: DocumentValidationError[] = []

        this.checkDuplicateIds(definition.content, issues)
        this.checkNestingDepth(definition.content, 0, issues)
        const arrayObjItemIds = this.collectArrayObjItemIds(definition.content)
        this.checkConditionRefsArrayObjItem(registry, arrayObjItemIds, issues)
        this.checkConditionRefs(registry, arrayObjItemIds, issues)
        this.checkConditionRefsValueless(registry, issues)
        this.checkRelativeDateConditions(registry, issues)
        this.checkConstraintContradictions(registry, issues)
        this.checkInvalidRegex(registry, issues)

        return issues
    }

    private checkDuplicateIds(content: ContentItem[], issues: DocumentValidationError[]): void {
        const seen = new Set<number>()
        const record = (id: number): void => {
            if (seen.has(id)) {
                issues.push({ code: 'DUPLICATE_ID', message: `Duplicate id: ${id}`, itemId: id })
            } else {
                seen.add(id)
            }
        }

        this.walkItems(content, (item) => {
            record(item.id)
            // `array_obj` sub-fields are not registry entries, but their ids key
            // the row objects in `values` and so must be unique form-wide too.
            if (item.type === 'array_obj') {
                for (const subField of item.items ?? []) record(subField.id)
            }
        })
    }

    private collectArrayObjItemIds(content: ContentItem[]): Map<number, number> {
        const ids = new Map<number, number>()
        this.walkItems(content, (item) => {
            if (item.type !== 'array_obj') return
            for (const subField of item.items ?? []) {
                if (!ids.has(subField.id)) ids.set(subField.id, item.id)
            }
        })
        return ids
    }

    private checkConditionRefsArrayObjItem(
        registry: Map<number, FieldEntry>,
        arrayObjItemIds: Map<number, number>,
        issues: DocumentValidationError[],
    ): void {
        if (arrayObjItemIds.size === 0) return

        for (const [id, entry] of registry) {
            if (!entry.condition) continue
            for (const ref of DependencyGraph.extractFieldRefs(entry.condition)) {
                const containerId = arrayObjItemIds.get(ref)
                if (containerId === undefined) continue
                issues.push({
                    code: 'CONDITION_REFS_ARRAY_OBJ_ITEM',
                    message:
                        `Condition references sub-field ${ref} of array_obj field ${containerId}, ` +
                        `whose value is per-row and not addressable (in item ${id})`,
                    itemId: id,
                })
            }
        }
    }

    private checkNestingDepth(content: ContentItem[], depth: number, issues: DocumentValidationError[]): void {
        for (const item of content) {
            if (item.type === 'section') {
                if (depth >= 3) {
                    issues.push({
                        code: 'NESTING_DEPTH',
                        message: `Section nesting exceeds maximum depth of 3: ${item.id}`,
                        itemId: item.id,
                    })
                } else {
                    this.checkNestingDepth(item.content, depth + 1, issues)
                }
            }
        }
    }

    private checkConditionRefs(
        registry: Map<number, FieldEntry>,
        arrayObjItemIds: Map<number, number>,
        issues: DocumentValidationError[],
    ): void {
        for (const [id, entry] of registry) {
            if (!entry.condition) continue
            const refs = DependencyGraph.extractFieldRefs(entry.condition)
            for (const ref of refs) {
                if (arrayObjItemIds.has(ref)) continue
                if (!registry.has(ref)) {
                    issues.push({
                        code: 'UNKNOWN_FIELD_REF',
                        message: `Condition references unknown field: ${ref} (in item ${id})`,
                        itemId: id,
                    })
                }
            }
        }
    }

    private checkConditionRefsValueless(registry: Map<number, FieldEntry>, issues: DocumentValidationError[]): void {
        for (const [id, entry] of registry) {
            if (!entry.condition) continue
            const refs = DependencyGraph.extractFieldRefs(entry.condition)
            for (const ref of refs) {
                const refEntry = registry.get(ref)
                if (!refEntry) continue

                if (refEntry.type === 'section') {
                    issues.push({
                        code: 'CONDITION_REFS_SECTION',
                        message: `Condition references section ${ref}, which has no value (in item ${id})`,
                        itemId: id,
                    })
                }

                if (refEntry.type === 'static') {
                    issues.push({
                        code: 'CONDITION_REFS_STATIC',
                        message: `Condition references static field ${ref}, which has no value (in item ${id})`,
                        itemId: id,
                    })
                }
            }
        }
    }

    /** Flags condition values shaped like a relative date whose amount exceeds 5 digits. */
    private checkRelativeDateConditions(registry: Map<number, FieldEntry>, issues: DocumentValidationError[]): void {
        for (const [id, entry] of registry) {
            if (!entry.condition) continue
            for (const value of this.collectOutOfRangeRelativeDates(entry.condition)) {
                issues.push({
                    code: 'INVALID_RELATIVE_DATE',
                    message: `Relative date "${value}" in condition is out of range, amount allows at most 5 digits (in item ${id})`,
                    params: { value },
                    itemId: id,
                })
            }
        }
    }

    private collectOutOfRangeRelativeDates(condition: Condition): string[] {
        if ('and' in condition) return condition.and.flatMap((c) => this.collectOutOfRangeRelativeDates(c))
        if ('or' in condition) return condition.or.flatMap((c) => this.collectOutOfRangeRelativeDates(c))
        return isOutOfRangeRelativeDate(condition.value) ? [condition.value] : []
    }

    private checkConstraintContradictions(registry: Map<number, FieldEntry>, issues: DocumentValidationError[]): void {
        for (const [id, entry] of registry) {
            if (!entry.validation) continue

            switch (entry.type) {
                case 'string': {
                    const v = entry.validation as StringValidation
                    if (v.minLength !== undefined && v.maxLength !== undefined && v.maxLength < v.minLength) {
                        issues.push({
                            code: 'INVALID_MIN_MAX',
                            message: `maxLength must be >= minLength for field ${id}`,
                            itemId: id,
                        })
                    }
                    break
                }
                case 'number': {
                    const v = entry.validation as NumberValidation
                    if (v.min !== undefined && v.max !== undefined && v.max < v.min) {
                        issues.push({
                            code: 'INVALID_MIN_MAX',
                            message: `max must be >= min for field ${id}`,
                            itemId: id,
                        })
                    }
                    break
                }
                case 'date': {
                    const v = entry.validation as DateValidation
                    if (v.minDate !== undefined && v.maxDate !== undefined) {
                        const minIsAbsolute = !isRelativeDate(v.minDate)
                        const maxIsAbsolute = !isRelativeDate(v.maxDate)
                        if (minIsAbsolute && maxIsAbsolute) {
                            if (Date.parse(v.maxDate) < Date.parse(v.minDate)) {
                                issues.push({
                                    code: 'INVALID_MIN_MAX',
                                    message: `maxDate must be >= minDate for field ${id}`,
                                    itemId: id,
                                })
                            }
                        }
                    }
                    break
                }
                case 'array':
                case 'array_obj': {
                    const v = entry.validation as ArrayValidation
                    if (v.minItems !== undefined && v.maxItems !== undefined && v.maxItems < v.minItems) {
                        issues.push({
                            code: 'INVALID_MIN_MAX',
                            message: `maxItems must be >= minItems for field ${id}`,
                            itemId: id,
                        })
                    }
                    break
                }
            }
        }
    }

    private checkInvalidRegex(registry: Map<number, FieldEntry>, issues: DocumentValidationError[]): void {
        for (const [id, entry] of registry) {
            for (const { itemId, pattern } of this.collectPatterns(id, entry)) {
                const issue = this.checkPattern(itemId, pattern)
                if (issue) issues.push(issue)
            }
        }
    }

    /** String `pattern`s of a field, its `array` item and its `array_obj` sub-fields, keyed by the owning id. */
    private collectPatterns(id: number, entry: FieldEntry): { itemId: number; pattern: string }[] {
        const patterns: { itemId: number; pattern: string }[] = []
        const add = (itemId: number, validation: unknown): void => {
            const pattern = (validation as StringValidation | undefined)?.pattern
            if (typeof pattern === 'string') patterns.push({ itemId, pattern })
        }

        if (entry.type === 'string') add(id, entry.validation)
        if (entry.type === 'array' && entry.item?.type === 'string') add(id, entry.item.validation)
        if (entry.type === 'array_obj') {
            for (const sub of entry.items ?? []) {
                if (sub.type === 'string') add(sub.id, sub.validation)
            }
        }
        return patterns
    }

    /** `INVALID_REGEX` when `pattern` does not compile, `UNSAFE_REGEX` when it nests repeated quantifiers. */
    private checkPattern(itemId: number, pattern: string): DocumentValidationError | undefined {
        try {
            new RegExp(pattern)
        } catch (e) {
            const msg = e instanceof Error ? e.message : String(e)
            return { code: 'INVALID_REGEX', message: `Invalid regex pattern for field ${itemId}: ${msg}`, itemId }
        }

        if (!isUnsafePattern(pattern)) return undefined
        return {
            code: 'UNSAFE_REGEX',
            message: `Unsafe regex pattern for field ${itemId}: nested quantifiers can cause catastrophic backtracking`,
            itemId,
        }
    }

    private walkItems(content: ContentItem[], fn: (item: ContentItem) => void): void {
        for (const item of content) {
            fn(item)
            if (item.type === 'section') {
                this.walkItems(item.content, fn)
            }
        }
    }
}
