import { DependencyGraph } from './dependency-graph'
import type {
    ArrayValidation,
    ContentItem,
    DateValidation,
    FieldEntry,
    FormDefinition,
    FormDefinitionIssue,
    NumberValidation,
    StringValidation,
} from './types'

/**
 * Performs semantic validation of form definitions.
 *
 * Checks for logical issues that go beyond JSON schema validity.
 * Used by {@link FormEngine} during construction before building the engine.
 *
 * Checks performed:
 * 1. **Duplicate IDs** (`DUPLICATE_ID`) -- every content item id must be unique.
 * 2. **Nesting depth** (`NESTING_DEPTH`) -- sections may not be nested more
 *    than 3 levels deep.
 * 3. **Unknown field references** (`UNKNOWN_FIELD_REF`) -- conditions must
 *    only reference field ids that exist in the registry.
 * 4. **Condition references section** (`CONDITION_REFS_SECTION`) -- conditions
 *    must not reference section ids, because sections have no values.
 * 5. **Constraint contradictions** (`INVALID_RANGE_*`) -- e.g. `minLength > maxLength`,
 *    `min > max`, `minDate > maxDate` (absolute dates only), `minItems > maxItems`.
 * 6. **Invalid regex** (`INVALID_REGEX`) -- string field `pattern` values must
 *    be valid regular expressions.
 */
export class SemanticValidator {
    /**
     * Validates a form definition semantically.
     *
     * @param definition - The form definition to validate.
     * @param registry - The flattened field registry built from the definition.
     * @returns Array of issues found. Empty if the definition is semantically valid.
     */
    validate(definition: FormDefinition, registry: Map<number, FieldEntry>): FormDefinitionIssue[] {
        const issues: FormDefinitionIssue[] = []

        this.checkDuplicateIds(definition.content, issues)
        this.checkNestingDepth(definition.content, 0, issues)
        this.checkConditionRefs(registry, issues)
        this.checkConditionRefsSection(registry, issues)
        this.checkConstraintContradictions(registry, issues)
        this.checkInvalidRegex(registry, issues)

        return issues
    }

    // ── Duplicate IDs ──

    private checkDuplicateIds(content: ContentItem[], issues: FormDefinitionIssue[]): void {
        const seen = new Set<number>()
        this.walkItems(content, (item) => {
            if (seen.has(item.id)) {
                issues.push({ code: 'DUPLICATE_ID', message: `Duplicate id: ${item.id}`, itemId: item.id })
            } else {
                seen.add(item.id)
            }
        })
    }

    // ── Nesting depth ──

    private checkNestingDepth(content: ContentItem[], depth: number, issues: FormDefinitionIssue[]): void {
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

    // ── Condition references unknown field ──

    private checkConditionRefs(registry: Map<number, FieldEntry>, issues: FormDefinitionIssue[]): void {
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

    // ── Condition references a section (which has no value) ──

    private checkConditionRefsSection(registry: Map<number, FieldEntry>, issues: FormDefinitionIssue[]): void {
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

    // ── Constraint contradictions ──

    private checkConstraintContradictions(registry: Map<number, FieldEntry>, issues: FormDefinitionIssue[]): void {
        for (const [id, entry] of registry) {
            if (!entry.validation) continue

            switch (entry.type) {
                case 'string': {
                    const v = entry.validation as StringValidation
                    if (v.minLength !== undefined && v.maxLength !== undefined && v.maxLength < v.minLength) {
                        issues.push({
                            code: 'INVALID_RANGE_MIN_MAX_LENGTH',
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
                            code: 'INVALID_RANGE_MIN_MAX',
                            message: `max must be >= min for field ${id}`,
                            itemId: id,
                        })
                    }
                    break
                }
                case 'date': {
                    const v = entry.validation as DateValidation
                    if (v.minDate !== undefined && v.maxDate !== undefined) {
                        const minIsAbsolute = !this.isRelativeDateString(v.minDate)
                        const maxIsAbsolute = !this.isRelativeDateString(v.maxDate)
                        if (minIsAbsolute && maxIsAbsolute) {
                            if (Date.parse(v.maxDate) < Date.parse(v.minDate)) {
                                issues.push({
                                    code: 'INVALID_RANGE_DATE',
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
                            code: 'INVALID_RANGE_ITEMS',
                            message: `maxItems must be >= minItems for field ${id}`,
                            itemId: id,
                        })
                    }
                    break
                }
            }
        }
    }

    // ── Invalid regex ──

    private checkInvalidRegex(registry: Map<number, FieldEntry>, issues: FormDefinitionIssue[]): void {
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

    // ── Helpers ──

    private walkItems(content: ContentItem[], fn: (item: ContentItem) => void): void {
        for (const item of content) {
            fn(item)
            if (item.type === 'section') {
                this.walkItems(item.content, fn)
            }
        }
    }

    private isRelativeDateString(value: string): boolean {
        return /^[+-]\d+[dwmy]$/.test(value)
    }
}
