import type { DocumentValidationError } from './validation-results'

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
 * | `INVALID_MIN_MAX` | A field's minimum constraint exceeds its maximum constraint. |
 * | `INVALID_REGEX` | String field `pattern` is not a valid regular expression. |
 * | `CIRCULAR_DEPENDENCY` | Condition dependencies form a cycle (A depends on B depends on A). |
 */
export type FormDefinitionIssueCode =
    | 'SCHEMA_INVALID'
    | 'DUPLICATE_ID'
    | 'NESTING_DEPTH'
    | 'UNKNOWN_FIELD_REF'
    | 'CONDITION_REFS_SECTION'
    | 'INVALID_MIN_MAX'
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
export class FormDocumentLoadError extends Error {
    readonly errors: DocumentValidationError[]
    constructor(errors: DocumentValidationError[]) {
        const summary = errors.map((e) => e.message).join('; ')
        super(`Cannot load document: ${summary}`)
        this.name = 'FormDocumentLoadError'
        this.errors = errors
    }
}

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
