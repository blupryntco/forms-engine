import { ConditionEvaluator } from './condition-eval'
import { DependencyGraph } from './dependency-graph'
import { validateSchema } from './schema-validator'
import { SemanticValidator } from './semantic-validator'
import type {
    ContentItem,
    EngineOptions,
    FieldEntry,
    FormDefinition,
    FormDocument,
    FormValidationResult,
    FormValues,
} from './types'
import { FormDefinitionError } from './types'
import { FieldValidator } from './validate'
import { VisibilityResolver } from './visibility'

/**
 * The runtime form engine.
 *
 * Created by passing a {@link FormDefinition} to the constructor. The
 * construction lifecycle is:
 *
 * 1. **Build field registry** -- walks the definition tree depth-first,
 *    creating a flat {@link FieldEntry} for every field and section while
 *    recording document-order ids in `contentOrder`.
 * 2. **Semantic validation** -- checks for duplicate ids, excessive nesting,
 *    unknown/invalid condition references, constraint contradictions, and
 *    invalid regex patterns.
 * 3. **Cycle detection** -- verifies that condition dependencies form a DAG
 *    (no circular references).
 * 4. **Error reporting** -- if any issues were found in steps 2-3, throws a
 *    {@link FormDefinitionError} containing all issues.
 * 5. **Build dependency graph** -- creates a forward adjacency map so the
 *    engine can quickly determine which items are affected when a field
 *    value changes.
 * 6. **Topological sort** -- orders all items so that dependencies are
 *    evaluated before dependents (used by `getVisibilityMap`).
 * 7. **Assemble components** -- creates internal {@link ConditionEvaluator},
 *    {@link VisibilityResolver}, and {@link FieldValidator} instances.
 *
 * @example
 * ```ts
 * const engine = new FormEngine(myFormDefinition);
 * const visibility = engine.getVisibilityMap(formValues);
 * const result = engine.validate(formValues);
 * ```
 */
export class FormEngine {
    private readonly registry: Map<number, FieldEntry>
    private readonly depGraph: DependencyGraph
    private readonly visibilityResolver: VisibilityResolver
    private readonly fieldValidator: FieldValidator
    private readonly formId: string
    private readonly formVersion: string

    /**
     * Ordered list of all content item ids in depth-first document order.
     * Matches the order in which items appear in the form definition.
     */
    readonly contentOrder: readonly number[]

    /**
     * Compiles a {@link FormDefinition} into a ready-to-use engine.
     *
     * @param definition - A complete form definition to compile.
     * @throws {FormDefinitionError} If the definition contains semantic issues
     *   or circular condition dependencies.
     */
    constructor(definition: FormDefinition) {
        // 0. JSON schema validation
        const schemaIssues = validateSchema(definition)
        if (schemaIssues.length > 0) {
            throw new FormDefinitionError(schemaIssues)
        }

        // 1. Build field registry + content order
        const registry = new Map<number, FieldEntry>()
        const contentOrder: number[] = []
        FormEngine.walkContent(definition.content, undefined, registry, contentOrder)

        // 2. Semantic validation
        const semanticValidator = new SemanticValidator()
        const issues = semanticValidator.validate(definition, registry)

        // 3. Cycle detection
        const cyclePath = DependencyGraph.detectCycle(registry)
        if (cyclePath) {
            issues.push({
                code: 'CIRCULAR_DEPENDENCY',
                message: `Circular condition dependency detected: ${cyclePath}`,
            })
        }

        if (issues.length > 0) {
            throw new FormDefinitionError(issues)
        }

        // 4. Build dependency graph
        this.depGraph = new DependencyGraph(registry)

        // 5. Assemble components
        const conditionEvaluator = new ConditionEvaluator()
        this.visibilityResolver = new VisibilityResolver(registry, conditionEvaluator, this.depGraph.topoOrder)
        this.fieldValidator = new FieldValidator(registry)

        this.registry = registry
        this.contentOrder = contentOrder
        this.formId = definition.id
        this.formVersion = definition.version
    }

    /**
     * Creates a {@link FormDocument} pre-populated with the form schema's
     * id and version.
     *
     * @param values - Optional initial field values. Defaults to an empty object.
     * @returns A new form document ready for use with engine methods.
     */
    createFormDocument(values?: FormValues): FormDocument {
        return {
            form: { id: this.formId, version: this.formVersion },
            values: values ?? {},
        }
    }

    /**
     * Determines whether a field or section is visible given the current form document.
     *
     * Evaluates the item's own condition and walks up the parent chain --
     * an item is hidden if any ancestor is hidden.
     *
     * @param id - Numeric id of the field or section.
     * @param doc - Current form document.
     * @returns `true` if the item should be displayed, `false` otherwise.
     */
    isVisible(id: number, doc: FormDocument): boolean {
        return this.visibilityResolver.isVisible(id, doc.values)
    }

    /**
     * Computes visibility for every field and section in topological order.
     *
     * The resulting map is keyed by item id. Items whose conditions depend on
     * other items are evaluated after their dependencies, ensuring correct
     * cascading visibility (e.g. a hidden parent hides all children).
     *
     * @param doc - Current form document.
     * @returns Map from item id to visibility boolean.
     */
    getVisibilityMap(doc: FormDocument): Map<number, boolean> {
        return this.visibilityResolver.getVisibilityMap(doc.values)
    }

    /**
     * Returns the set of item ids whose visibility may change when the
     * specified field's value changes.
     *
     * Includes transitive dependents -- if field A controls field B, and
     * field B controls field C, changing A returns `{B, C}`.
     * Results are cached for the lifetime of the engine.
     *
     * @param fieldId - Id of the field that changed.
     * @returns Set of affected item ids (does not include `fieldId` itself unless
     *   it is part of a dependency chain).
     */
    getAffectedIds(fieldId: number): Set<number> {
        return this.depGraph.getAffectedIds(fieldId)
    }

    /**
     * Validates form values against the schema's validation rules.
     *
     * Only visible fields are validated -- hidden fields are skipped entirely.
     * Sections are never validated directly. For array fields, each item is
     * validated individually according to the array's item definition.
     *
     * @param doc - Current form document to validate.
     * @param options - Optional overrides (e.g. custom `now` for date validation).
     * @returns Validation result with a `valid` flag and an array of errors.
     */
    validate(doc: FormDocument, options?: EngineOptions): FormValidationResult {
        const now = options?.now ?? new Date()
        const visibilityMap = this.visibilityResolver.getVisibilityMap(doc.values, now)
        return this.fieldValidator.validate(doc.values, visibilityMap, now)
    }

    /**
     * Retrieves the internal {@link FieldEntry} for a given id.
     *
     * @param id - Numeric id of the field or section.
     * @returns The field entry, or `undefined` if the id is not in the registry.
     */
    getFieldDef(id: number): FieldEntry | undefined {
        return this.registry.get(id)
    }

    private static walkContent(
        content: ContentItem[],
        parentId: number | undefined,
        registry: Map<number, FieldEntry>,
        contentOrder: number[],
    ): void {
        for (const item of content) {
            const entry: FieldEntry = {
                id: item.id,
                type: item.type,
                condition: item.condition,
                validation: item.type !== 'section' ? item.validation : undefined,
                parentId,
                options: item.type === 'select' ? item.options : undefined,
                item: item.type === 'array' ? item.item : undefined,
                label: item.type !== 'section' ? item.label : undefined,
                title: item.type === 'section' ? item.title : undefined,
            }

            registry.set(item.id, entry)
            contentOrder.push(item.id)

            if (item.type === 'section') {
                FormEngine.walkContent(item.content, item.id, registry, contentOrder)
            }
        }
    }
}
