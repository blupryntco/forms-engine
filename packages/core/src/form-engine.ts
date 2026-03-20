import { ConditionEvaluator } from './condition-evaluator'
import { DependencyGraph } from './dependency-graph'
import { FieldValidator } from './field-validator'
import { FormDefinitionValidator } from './form-definition-validator'
import { DocumentError } from './types/errors'
import type { FieldEntry } from './types/field-entry'
import type { ContentItem, FormDefinition } from './types/form-definition'
import type { FormSnapshot } from './types/form-snapshot'
import type { FormDocument, FormValues } from './types/form-values'
import type { DocumentValidationError, FieldValidationError, FormValidationResult } from './types/validation-results'
import { VisibilityResolver } from './visibility-resolver'

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
 *    {@link DocumentError} containing all issues.
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
    private readonly definition: FormDefinition
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
     * @throws {DocumentError} If the definition contains semantic issues
     *   or circular condition dependencies.
     */
    constructor(definition: FormDefinition) {
        // 0. JSON schema validation
        const definitionValidator = new FormDefinitionValidator()
        const schemaIssues = definitionValidator.validateSchema(definition)
        if (schemaIssues.length > 0) {
            throw new DocumentError(schemaIssues)
        }

        // 1. Build field registry + content order
        const registry = new Map<number, FieldEntry>()
        const contentOrder: number[] = []
        FormEngine.walkContent(definition.content, undefined, registry, contentOrder)

        // 2. Semantic validation
        const issues = definitionValidator.validate(definition, registry)

        // 3. Cycle detection
        const cyclePath = DependencyGraph.detectCycle(registry)
        if (cyclePath) {
            issues.push({
                code: 'CIRCULAR_DEPENDENCY',
                message: `Circular condition dependency detected: ${cyclePath.join(' -> ')}`,
            })
        }

        if (issues.length > 0) {
            throw new DocumentError(issues)
        }

        // 4. Build dependency graph
        this.depGraph = new DependencyGraph(registry)

        // 5. Assemble components
        const conditionEvaluator = new ConditionEvaluator()
        this.visibilityResolver = new VisibilityResolver(registry, conditionEvaluator, this.depGraph.topologicalOrder)
        this.fieldValidator = new FieldValidator(registry)

        this.registry = registry
        this.contentOrder = contentOrder
        this.definition = definition
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
            form: { id: this.formId, version: this.formVersion, submittedAt: new Date().toISOString() },
            values: values ?? {},
        }
    }

    /**
     * Serializes the form definition and document into a single {@link FormSnapshot}.
     *
     * The snapshot contains the original {@link FormDefinition} used to construct
     * the engine and the provided {@link FormDocument}. No validation is performed;
     * call {@link validate} separately if needed.
     *
     * @param doc - The form document to include in the snapshot.
     * @returns A snapshot containing both the definition and the document.
     */
    dumpDocument(doc: FormDocument): FormSnapshot {
        return {
            definition: this.definition,
            document: doc,
        }
    }

    /**
     * Loads a {@link FormDocument} from a previously created {@link FormSnapshot}.
     *
     * Verifies that the snapshot's form definition matches the engine's
     * compiled definition by comparing id and version. Throws a
     * {@link DocumentError} if there is a mismatch.
     *
     * @param snapshot - A snapshot previously produced by {@link dumpDocument}.
     * @returns The form document from the snapshot.
     * @throws {DocumentError} If the snapshot's definition id or version
     *   does not match the engine's.
     */
    loadDocument(snapshot: FormSnapshot): FormDocument {
        const errors: DocumentValidationError[] = []
        if (snapshot.definition.id !== this.formId) {
            errors.push({
                code: 'FORM_ID_MISMATCH',
                message: `Snapshot form id "${snapshot.definition.id}" does not match expected "${this.formId}"`,
                params: { expected: this.formId, actual: snapshot.definition.id },
            })
        }
        if (snapshot.definition.version !== this.formVersion) {
            errors.push({
                code: 'FORM_VERSION_MISMATCH',
                message: `Snapshot form version "${snapshot.definition.version}" does not match expected "${this.formVersion}"`,
                params: { expected: this.formVersion, actual: snapshot.definition.version },
            })
        }
        if (errors.length > 0) {
            throw new DocumentError(errors)
        }
        return snapshot.document
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
        return this.visibilityResolver.isVisible(id, doc.values, FormEngine.parseNow(doc))
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
        return this.visibilityResolver.getVisibilityMap(doc.values, FormEngine.parseNow(doc))
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
     * The reference time for relative date validation is derived from
     * `doc.form.submittedAt`. If that value is missing or unparseable, a
     * document-level error is reported and `new Date()` is used as fallback.
     *
     * @param doc - Current form document to validate.
     * @returns Validation result with a `valid` flag and a `fieldErrors` map.
     */
    validate(doc: FormDocument): FormValidationResult {
        // Document compatibility check
        const documentErrors: DocumentValidationError[] = []
        if (doc.form.id !== this.formId) {
            documentErrors.push({
                code: 'FORM_ID_MISMATCH',
                message: `Document form id "${doc.form.id}" does not match expected "${this.formId}"`,
                params: { expected: this.formId, actual: doc.form.id },
            })
        }
        if (doc.form.version !== this.formVersion) {
            documentErrors.push({
                code: 'FORM_VERSION_MISMATCH',
                message: `Document form version "${doc.form.version}" does not match expected "${this.formVersion}"`,
                params: { expected: this.formVersion, actual: doc.form.version },
            })
        }

        // Derive `now` from submittedAt; report document errors for missing/invalid values
        let now: Date
        if (!doc.form.submittedAt) {
            documentErrors.push({
                code: 'FORM_SUBMITTED_AT_MISSING',
                message: 'Document form submittedAt is missing',
            })
            now = new Date()
        } else {
            const parsedSubmittedAt = new Date(doc.form.submittedAt)
            if (Number.isNaN(parsedSubmittedAt.getTime())) {
                documentErrors.push({
                    code: 'FORM_SUBMITTED_AT_INVALID',
                    message: `Document form submittedAt "${doc.form.submittedAt}" is not a valid date`,
                    params: { actual: doc.form.submittedAt },
                })
                now = new Date()
            } else {
                now = parsedSubmittedAt
            }
        }

        // Document level validation errors

        if (documentErrors.length > 0)
            return {
                valid: false,
                fieldErrors: new Map<number, FieldValidationError[]>(),
                documentErrors,
            }

        // Field level validation errors

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

    private static parseNow(doc: FormDocument): Date {
        if (doc.form.submittedAt) {
            const parsed = new Date(doc.form.submittedAt)
            if (!Number.isNaN(parsed.getTime())) return parsed
        }
        return new Date()
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
