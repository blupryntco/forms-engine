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

        return (validateFn.errors ?? []).map((err) => {
            const path = err.instancePath || '/'
            const message = err.message ?? 'Unknown error'

            if (err.keyword === 'additionalProperties') {
                const additional = (err.params as { additionalProperty?: string }).additionalProperty
                return { code: 'SCHEMA_INVALID', message: `${path}: ${message}: '${additional}'` }
            }

            return { code: 'SCHEMA_INVALID', message: `${path}: ${message}` }
        })
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
