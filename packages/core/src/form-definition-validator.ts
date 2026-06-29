import type { ErrorObject } from 'ajv'
import Ajv2020 from 'ajv/dist/2020'

import { isRelativeDate } from './date-utils'
import { DependencyGraph } from './dependency-graph'
import formDefinitionSchema from './form-definition.schema.json'
import type { FieldEntry } from './types/field-entry'
import type { ContentItem, FormDefinition } from './types/form-definition'
import type { ArrayValidation } from './types/validation/array'
import type { DateValidation } from './types/validation/date'
import type { NumberValidation } from './types/validation/number'
import type { StringValidation } from './types/validation/string'
import type { DocumentValidationError } from './types/validation-results'

const ajv = new Ajv2020({ allErrors: true })
const validateFn = ajv.compile(formDefinitionSchema)

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
    ['array', new Set(['id', 'type', 'label', 'item'])],
    ['file', new Set(['id', 'type', 'label'])],
    ['section', new Set(['id', 'type', 'title', 'content'])],
])

const itemAllowedProperties = new Map<string, Set<string>>([
    ['string', new Set(['id', 'type', 'label', 'description', 'condition', 'validation'])],
    ['number', new Set(['id', 'type', 'label', 'description', 'condition', 'validation'])],
    ['boolean', new Set(['id', 'type', 'label', 'description', 'condition', 'validation'])],
    ['date', new Set(['id', 'type', 'label', 'description', 'condition', 'validation'])],
    ['select', new Set(['id', 'type', 'label', 'description', 'condition', 'options', 'validation'])],
    ['array', new Set(['id', 'type', 'label', 'description', 'condition', 'item', 'validation'])],
    ['file', new Set(['id', 'type', 'label', 'description', 'condition', 'validation'])],
    ['section', new Set(['id', 'type', 'title', 'description', 'condition', 'content'])],
])

/**
 * Validates form definitions at both the structural (JSON Schema) and
 * semantic levels.
 *
 * Used by {@link FormEngine} during construction before building the engine.
 *
 * ### Schema validation (`validateSchema`)
 * Validates raw input against the form definition JSON Schema. Returns
 * `SCHEMA_INVALID` issues for every violation found.
 *
 * ### Semantic validation (`validate`)
 * Checks for logical issues that go beyond JSON schema validity:
 * 1. **Duplicate IDs** (`DUPLICATE_ID`) -- every content item id must be unique.
 * 2. **Nesting depth** (`NESTING_DEPTH`) -- sections may not be nested more
 *    than 3 levels deep.
 * 3. **Unknown field references** (`UNKNOWN_FIELD_REF`) -- conditions must
 *    only reference field ids that exist in the registry.
 * 4. **Condition references section** (`CONDITION_REFS_SECTION`) -- conditions
 *    must not reference section ids, because sections have no values.
 * 5. **Constraint contradictions** (`INVALID_MIN_MAX`) -- e.g. `minLength > maxLength`,
 *    `min > max`, `minDate > maxDate` (absolute dates only), `minItems > maxItems`.
 * 6. **Invalid regex** (`INVALID_REGEX`) -- string field `pattern` values must
 *    be valid regular expressions.
 */
export class FormDefinitionValidator {
    /**
     * Validates raw input against the form definition JSON schema.
     *
     * @param input - The raw input to validate.
     * @returns Array of `SCHEMA_INVALID` issues. Empty when the input conforms to the schema.
     */
    validateSchema(input: unknown): DocumentValidationError[] {
        if (validateFn(input)) return []

        return this.formatSchemaErrors(validateFn.errors ?? [], input)
    }

    private formatSchemaErrors(errors: ErrorObject[], input: unknown): DocumentValidationError[] {
        const issues = this.collectSchemaIssues(errors, input)
        const dedupedIssues = this.deduplicateSchemaIssues(issues)
        const specificIssuePaths = dedupedIssues.filter((issue) => issue.keyword !== 'oneOf').map((issue) => issue.path)

        return dedupedIssues
            .filter((issue) => !this.isRedundantOneOfIssue(issue, specificIssuePaths))
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

    private isRedundantOneOfIssue(issue: SchemaIssue, specificIssuePaths: string[]): boolean {
        if (issue.keyword !== 'oneOf') return false

        return specificIssuePaths.some((path) => path === issue.path || path.startsWith(`${issue.path}/`))
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
        this.checkConditionRefs(registry, issues)
        this.checkConditionRefsSection(registry, issues)
        this.checkConstraintContradictions(registry, issues)
        this.checkInvalidRegex(registry, issues)

        return issues
    }

    private checkDuplicateIds(content: ContentItem[], issues: DocumentValidationError[]): void {
        const seen = new Set<number>()
        this.walkItems(content, (item) => {
            if (seen.has(item.id)) {
                issues.push({ code: 'DUPLICATE_ID', message: `Duplicate id: ${item.id}`, itemId: item.id })
            } else {
                seen.add(item.id)
            }
        })
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

    private checkConditionRefs(registry: Map<number, FieldEntry>, issues: DocumentValidationError[]): void {
        for (const [id, entry] of registry) {
            if (!entry.condition) continue
            const refs = DependencyGraph.extractFieldRefs(entry.condition)
            for (const ref of refs) {
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

    private checkConditionRefsSection(registry: Map<number, FieldEntry>, issues: DocumentValidationError[]): void {
        for (const [id, entry] of registry) {
            if (!entry.condition) continue
            const refs = DependencyGraph.extractFieldRefs(entry.condition)
            for (const ref of refs) {
                const refEntry = registry.get(ref)
                if (refEntry && refEntry.type === 'section') {
                    issues.push({
                        code: 'CONDITION_REFS_SECTION',
                        message: `Condition references section ${ref}, which has no value (in item ${id})`,
                        itemId: id,
                    })
                }
            }
        }
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
                case 'array': {
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
            if (entry.type !== 'string' || !entry.validation) continue
            const v = entry.validation as StringValidation
            if (v.pattern === undefined) continue
            try {
                new RegExp(v.pattern)
            } catch (e) {
                const msg = e instanceof Error ? e.message : String(e)
                issues.push({
                    code: 'INVALID_REGEX',
                    message: `Invalid regex pattern for field ${id}: ${msg}`,
                    itemId: id,
                })
            }
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
